'use client'

import { useEffect, useState, useRef, KeyboardEvent } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { StatusBadge } from '@/components/ui/StatusBadge'
import ErrorBanner from '@/components/ui/ErrorBanner'
import { CorrectionsPanel } from '@/components/corrections/CorrectionsPanel'
import { projectsApi, sprintsApi, tasksApi, projectRequestsApi, documentsApi } from '@/lib/api'
import { Project, ProjectSprint, ProjectTask, ProjectRequest } from '@/lib/types'
import { apiError } from '@/lib/utils'
import { useCurrencySymbol, useAuthStore } from '@/lib/store'
import { useChatStore } from '@/lib/chatStore'
import {
  X, Upload, CheckCircle, AlertTriangle, Calendar, DollarSign,
  Globe, Code2, FileSpreadsheet, ExternalLink, ChevronDown as ChevDown,
  MessageSquare, Send, AlertOctagon, Users, TrendingUp,
  CheckSquare, Square, Layers, ChevronRight, Bell, Plus,
  ArrowUpRight, Shield, LayoutGrid, List, ClipboardList,
} from 'lucide-react'

/* ── Helpers ────────────────────────────────────────────── */
function fmt(iso: string, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', opts ?? { month: 'short', day: 'numeric', year: 'numeric' })
}
function daysLeft(iso: string) { return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000) }
function isOverdue(iso: string) { return iso && new Date(iso) < new Date() }

const PRIORITY_COLOR: Record<string, string> = { low: 'var(--fg)', medium: 'var(--fg)', high: 'var(--fg)', critical: 'var(--fg)' }
const STATUS_LABEL: Record<string, string> = {
  new: 'New', reviewed: 'Reviewed', onboarded: 'Onboarded', assigned: 'Assigned', in_progress: 'In Progress',
  blocked: 'Blocked', pending_approval: 'Pending Approval', completed: 'Completed', delayed: 'Delayed',
}

type Tab = 'overview' | 'tasks' | 'corrections' | 'requests' | 'chat' | 'escalate'


// Questions from the team are what wait on the client
const needsReply = (r: ProjectRequest) => r.kind === 'question' && r.status === 'open'

/* ══════════════════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════════════════ */
export default function ClientProjectsPage() {
  const curr      = useAuthStore(s => s.user)
  const currency  = useCurrencySymbol()
  const [projects,   setProjects]   = useState<Project[]>([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState<Project | null>(null)
  const [tab,        setTab]        = useState<Tab>('overview')
  const [sprints,    setSprints]    = useState<ProjectSprint[]>([])
  const [tasks,      setTasks]      = useState<ProjectTask[]>([])
  const [collapsed,  setCollapsed]  = useState<Set<string>>(new Set())
  const [error,      setError]      = useState('')
  const [requests,   setRequests]   = useState<ProjectRequest[]>([])
  const [requestsError, setRequestsError] = useState('')
  const [replies,    setReplies]    = useState<Record<string, string>>({})
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [requestActionError, setRequestActionError] = useState('')
  const [changeForm, setChangeForm] = useState({ subject: '', body: '' })
  const [sendingChange, setSendingChange] = useState(false)
  const [changeSent, setChangeSent] = useState(false)
  const { messages: chatMessages, sendMessage: storeSendMsg, markReadByClient, unreadForClient, fetchMessages } = useChatStore()
  const [chatMsg,    setChatMsg]    = useState('')
  const [chatError,  setChatError]  = useState('')
  const [escalateForm, setEscalateForm] = useState<{ subject: string; details: string; urgency: 'normal' | 'high' | 'critical' }>({ subject: '', details: '', urgency: 'normal' })
  const [escalated,  setEscalated]  = useState(false)
  const [escalating, setEscalating] = useState(false)
  const [escalateError, setEscalateError] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  /* submit new project form */
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [form, setForm]   = useState({ title: '', description: '', budget: '', deadline: '', requirements: '' })
  const [errors, setErrors] = useState<Partial<typeof form>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted,  setSubmitted]  = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [dragging,   setDragging]   = useState(false)
  const [files,      setFiles]      = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadRequests = () => projectRequestsApi.list()
    .then(r => { setRequests(r.data ?? []); setRequestsError('') })
    .catch(err => setRequestsError(apiError(err, 'Could not load project requests.')))

  useEffect(() => {
    projectsApi.getAll()
      .then(r => setProjects(r.data?.data ?? r.data ?? []))
      .catch(err => setError(apiError(err, 'Could not load your projects.')))
      .finally(() => setLoading(false))
    loadRequests()
    fetchMessages()
  }, []) // eslint-disable-line

  const openModal = async (p: Project) => {
    setModal(p); setTab('overview'); setSprints([]); setTasks([])
    const [sr, tr] = await Promise.allSettled([sprintsApi.getByProject(p.id), tasksApi.getByProject(p.id)])
    if (sr.status === 'fulfilled') setSprints(sr.value.data)
    if (tr.status === 'fulfilled') setTasks(tr.value.data)
  }

  const closeModal = () => {
    setModal(null); setEscalated(false); setEscalateError('')
    setRequestActionError(''); setChangeSent(false)
  }

  /* chat send */
  const sendChat = async () => {
    if (!chatMsg.trim() || !modal) return
    setChatError('')
    const draft = chatMsg
    setChatMsg('')
    try {
      await storeSendMsg({
      projectId: modal.id,
      projectTitle: modal.title,
      from: 'client',
      sender: curr?.name ?? 'Client',
      senderId: curr?.id ?? 'client',
      text: chatMsg.trim(),
      readByAdmin: false,
      readByClient: true,
      })
    } catch (err) {
      setChatMsg(draft)
      setChatError(apiError(err, 'Message not sent. Please try again.'))
      return
    }
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  /* escalate */
  const submitEscalation = async () => {
    if (!modal || !escalateForm.subject.trim() || !escalateForm.details.trim()) return
    setEscalating(true); setEscalateError('')
    try {
      await projectRequestsApi.create({
        projectId: modal.id, kind: 'escalation',
        subject: escalateForm.subject.trim(), body: escalateForm.details.trim(), urgency: escalateForm.urgency,
      })
      setEscalated(true)
      setEscalateForm({ subject: '', details: '', urgency: 'normal' })
      loadRequests()
    } catch (err) {
      setEscalateError(apiError(err, 'Could not submit the escalation.'))
    } finally {
      setEscalating(false)
    }
  }

  /* requests: answer a team question, or ask for a change */
  const resolveRequest = async (id: string) => {
    setResolvingId(id); setRequestActionError('')
    try {
      await projectRequestsApi.resolve(id, replies[id]?.trim() || undefined)
      setReplies(r => ({ ...r, [id]: '' }))
      await loadRequests()
    } catch (err) {
      setRequestActionError(apiError(err, 'Could not resolve the request.'))
    } finally {
      setResolvingId(null)
    }
  }

  const submitChangeRequest = async () => {
    if (!modal || !changeForm.subject.trim() || !changeForm.body.trim()) return
    setSendingChange(true); setRequestActionError(''); setChangeSent(false)
    try {
      await projectRequestsApi.create({ projectId: modal.id, kind: 'change', subject: changeForm.subject.trim(), body: changeForm.body.trim() })
      setChangeForm({ subject: '', body: '' })
      setChangeSent(true)
      await loadRequests()
    } catch (err) {
      setRequestActionError(apiError(err, 'Could not send the change request.'))
    } finally {
      setSendingChange(false)
    }
  }

  /* project submit */
  const validateForm = () => {
    const e: Partial<typeof form> = {}
    if (!form.title.trim())       e.title       = 'Required'
    if (!form.description.trim()) e.description = 'Required'
    if (!form.budget || +form.budget <= 0) e.budget = 'Required'
    if (!form.deadline)           e.deadline    = 'Required'
    if (!form.requirements.trim()) e.requirements = 'Required'
    return e
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validateForm()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({}); setSubmitting(true); setSubmitError('')
    let created: Project
    try {
      const res = await projectsApi.create({ ...form, budget: +form.budget } as unknown as Record<string, unknown>)
      created = res.data?.data ?? res.data
    } catch (err) {
      setSubmitError(apiError(err, 'Could not submit the project.'))
      setSubmitting(false)
      return
    }
    setProjects(p => [created, ...p])
    setForm({ title: '', description: '', budget: '', deadline: '', requirements: '' })
    // Attachments go up once the project exists to file them under
    const results = await Promise.allSettled(files.map(f => documentsApi.upload(created.id, f)))
    const failed = files.filter((_, i) => results[i].status === 'rejected')
    const firstErr = results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined
    setFiles(failed)
    if (firstErr) {
      setSubmitError(`Project submitted, but ${failed.length} attachment${failed.length > 1 ? 's' : ''} failed to upload: ${apiError(firstErr.reason, 'upload failed')}`)
    }
    setSubmitting(false); setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3500)
  }

  const projectChat    = modal ? chatMessages.filter(m => m.projectId === modal.id) : []
  const chatUnread     = modal ? unreadForClient(modal.id) : 0
  const projectRequests = modal ? requests.filter(r => r.projectId === modal.id) : []
  const openRequests    = projectRequests.filter(needsReply).length
  const tasksBySprintId = (sid: string | null) => tasks.filter(t => t.sprintId === sid)
  const unassigned      = tasks.filter(t => !t.sprintId)
  const completedCount  = tasks.filter(t => t.completed).length

  /* ── Render ── */
  return (
    <DashboardLayout allowedRoles={['client']}>
      <div className="space-y-6">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-mono-label mb-1" style={{ color: 'var(--text-muted)' }}>CLIENT PORTAL</p>
            <h1 className="text-display text-4xl text-primary-ui">MY PROJECTS</h1>
            <p className="text-mono-label mt-1" style={{ color: 'var(--text-muted)' }}>
              {projects.length} project{projects.length !== 1 ? 's' : ''} · {projects.filter(p => p.status === 'in_progress').length} active
            </p>
          </div>
          {/* summary pills + view toggle */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {[
              { label: 'Active',   count: projects.filter(p => p.status === 'in_progress').length,      color: 'var(--fg)' },
              { label: 'Pending',  count: projects.filter(p => p.status === 'pending_approval').length,  color: 'var(--fg)' },
              { label: 'Done',     count: projects.filter(p => p.status === 'completed').length,         color: 'var(--fg)' },
            ].map(({ label, count, color }) => (
              <div key={label} className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: `color-mix(in srgb, ${color} 6%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 19%, transparent)` }}>
                <span className="font-bold text-base" style={{ color }}>{count}</span>
                <span className="text-mono-label text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
              </div>
            ))}
            {/* View toggle */}
            <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <button onClick={() => setViewMode('grid')} className="p-1.5 rounded transition-all" style={{ background: viewMode === 'grid' ? 'rgb(var(--fg-rgb) / 0.15)' : 'transparent', color: viewMode === 'grid' ? 'var(--fg)' : 'var(--text-muted)' }} title="Grid view"><LayoutGrid size={14} /></button>
              <button onClick={() => setViewMode('list')} className="p-1.5 rounded transition-all" style={{ background: viewMode === 'list' ? 'rgb(var(--fg-rgb) / 0.15)' : 'transparent', color: viewMode === 'list' ? 'var(--fg)' : 'var(--text-muted)' }} title="List view"><List size={14} /></button>
            </div>
          </div>
        </div>

        <ErrorBanner title="Could not load projects" message={error} />

        {/* ── Project Cards / List ── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-56 rounded-2xl animate-pulse" style={{ background: 'var(--bg-elevated)' }} />)}
          </div>
        ) : error ? null : projects.length === 0 ? (
          <div className="text-center py-16 rounded-2xl" style={{ border: '1px dashed var(--border)' }}>
            <p className="text-mono-label" style={{ color: 'var(--text-muted)' }}>No projects yet — submit one below</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map(p => {
              const days    = daysLeft(p.deadline)
              const overdue = isOverdue(p.deadline) && p.status !== 'completed'
              const pReqs   = requests.filter(r => r.projectId === p.id && needsReply(r)).length
              return (
                <div key={p.id}
                  className="rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200 hover:-translate-y-0.5"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                  onClick={() => openModal(p)}>
                  <div className="h-1" style={{ background: `linear-gradient(to right, ${PRIORITY_COLOR[p.priority]}, transparent)` }} />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base leading-tight text-primary-ui truncate">{p.title}</h3>
                        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{p.description}</p>
                      </div>
                      <ArrowUpRight size={16} className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mb-4">
                      <StatusBadge status={p.status} />
                      <span className="text-mono-label px-2 py-0.5 rounded-full text-[9px]"
                        style={{ color: PRIORITY_COLOR[p.priority], background: `color-mix(in srgb, ${PRIORITY_COLOR[p.priority]} 7%, transparent)`, border: `1px solid color-mix(in srgb, ${PRIORITY_COLOR[p.priority]} 19%, transparent)` }}>
                        {p.priority.toUpperCase()}
                      </span>
                      {pReqs > 0 && (
                        <span className="flex items-center gap-1 text-mono-label px-2 py-0.5 rounded-full text-[9px]"
                          style={{ background: 'rgb(var(--fg-rgb) / 0.12)', border: '1px solid rgb(var(--fg-rgb) / 0.3)', color: 'var(--fg)' }}>
                          <Bell size={8} /> {pReqs} request{pReqs > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-mono-label text-[10px]" style={{ color: 'var(--text-muted)' }}>PROGRESS</span>
                        <span className="font-bold text-xs" style={{ color: 'var(--fg)' }}>{p.progress}%</span>
                      </div>
                      <div className="rounded-full overflow-hidden" style={{ height: 6, background: 'var(--track-bg)' }}>
                        <div className="h-full rounded-full" style={{ width: `${p.progress}%`, background: 'var(--fg)' }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="rounded-lg px-2.5 py-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        <p className="text-mono-label text-[9px] mb-0.5" style={{ color: 'var(--text-muted)' }}>BUDGET</p>
                        <p className="font-bold text-sm" style={{ color: 'var(--fg)' }}>{currency}{p.budget.toLocaleString()}</p>
                      </div>
                      <div className="rounded-lg px-2.5 py-2" style={{ background: 'var(--bg-elevated)', border: `1px solid ${overdue ? 'rgb(var(--fg-rgb) / 0.3)' : 'var(--border)'}` }}>
                        <p className="text-mono-label text-[9px] mb-0.5" style={{ color: 'var(--text-muted)' }}>DEADLINE</p>
                        <p className="font-bold text-sm" style={{ color: overdue ? 'var(--fg)' : 'var(--text-primary)' }}>
                          {overdue ? `${Math.abs(days)}d over` : p.status === 'completed' ? 'Done ✓' : `${days}d left`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* List view */
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            {projects.map((p, i) => {
              const days    = daysLeft(p.deadline)
              const overdue = isOverdue(p.deadline) && p.status !== 'completed'
              const pReqs   = requests.filter(r => r.projectId === p.id && needsReply(r)).length
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer group transition-all"
                  style={{ borderBottom: i < projects.length - 1 ? '1px solid var(--border)' : 'none', background: 'transparent' }}
                  onClick={() => openModal(p)}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgb(var(--fg-rgb) / 0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Color indicator */}
                  <div className="w-1 h-10 rounded-full shrink-0" style={{ background: PRIORITY_COLOR[p.priority] }} />
                  {/* Title + desc */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-primary-ui truncate">{p.title}</h3>
                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{p.description}</p>
                  </div>
                  {/* Status + badges */}
                  <div className="hidden md:flex items-center gap-2 shrink-0">
                    <StatusBadge status={p.status} />
                    {pReqs > 0 && (
                      <span className="flex items-center gap-1 text-mono-label px-2 py-0.5 rounded-full text-[9px]"
                        style={{ background: 'rgb(var(--fg-rgb) / 0.12)', border: '1px solid rgb(var(--fg-rgb) / 0.3)', color: 'var(--fg)' }}>
                        <Bell size={8} />{pReqs}
                      </span>
                    )}
                  </div>
                  {/* Progress */}
                  <div className="hidden lg:flex items-center gap-2 shrink-0" style={{ width: 120 }}>
                    <div className="rounded-full overflow-hidden flex-1" style={{ height: 5, background: 'var(--track-bg)' }}>
                      <div className="h-full rounded-full" style={{ width: `${p.progress}%`, background: 'var(--fg)' }} />
                    </div>
                    <span className="text-xs font-bold shrink-0" style={{ color: 'var(--fg)' }}>{p.progress}%</span>
                  </div>
                  {/* Budget */}
                  <div className="hidden md:block shrink-0 text-right" style={{ minWidth: 80 }}>
                    <p className="text-mono-label text-[9px]" style={{ color: 'var(--text-muted)' }}>BUDGET</p>
                    <p className="font-bold text-sm text-crimson">{currency}{p.budget.toLocaleString()}</p>
                  </div>
                  {/* Deadline */}
                  <div className="shrink-0 text-right" style={{ minWidth: 72 }}>
                    <p className="text-mono-label text-[9px]" style={{ color: 'var(--text-muted)' }}>DEADLINE</p>
                    <p className="font-bold text-xs" style={{ color: overdue ? 'var(--fg)' : 'var(--text-primary)' }}>
                      {overdue ? `${Math.abs(days)}d over` : p.status === 'completed' ? 'Done ✓' : `${days}d left`}
                    </p>
                  </div>
                  <ArrowUpRight size={14} className="shrink-0 opacity-0 group-hover:opacity-50 transition-opacity" style={{ color: 'var(--text-muted)' }} />
                </div>
              )
            })}
          </div>
        )}

        {/* ── Submit New Project ── */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-display text-xl text-primary-ui mb-1">Submit a New Project</h2>
          <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>Tell us what you need — we'll match you with the right team within 48 hours.</p>

          {submitError && (
            <div className="mb-5">
              <ErrorBanner message={submitError} onClose={() => setSubmitError('')} />
            </div>
          )}
          {submitted && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-5 text-sm font-semibold"
              style={{ background: 'rgb(var(--fg-rgb) / 0.08)', border: '1px solid rgb(var(--fg-rgb) / 0.25)', color: 'var(--fg)' }}>
              <CheckCircle size={15} /> Project submitted! We'll be in touch shortly.
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-field">Project Title</label>
              <input className="input-field" placeholder="e.g. E-Commerce Platform"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              {errors.title && <p className="text-[11px] mt-1" style={{ color: 'var(--fg)' }}>{errors.title}</p>}
            </div>
            <div>
              <label className="label-field">Budget ({currency})</label>
              <input type="number" min={0} step={100} className="input-field" placeholder="5000"
                value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} />
              {errors.budget && <p className="text-[11px] mt-1" style={{ color: 'var(--fg)' }}>{errors.budget}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="label-field">Description</label>
              <textarea className="input-field resize-none" rows={3} placeholder="Describe your project goals and deliverables…"
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              {errors.description && <p className="text-[11px] mt-1" style={{ color: 'var(--fg)' }}>{errors.description}</p>}
            </div>
            <div>
              <label className="label-field">Deadline</label>
              <input type="date" className="input-field"
                value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
              {errors.deadline && <p className="text-[11px] mt-1" style={{ color: 'var(--fg)' }}>{errors.deadline}</p>}
            </div>
            <div>
              <label className="label-field">Technical Requirements</label>
              <input className="input-field" placeholder="React, REST API, PostgreSQL…"
                value={form.requirements} onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))} />
              {errors.requirements && <p className="text-[11px] mt-1" style={{ color: 'var(--fg)' }}>{errors.requirements}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="label-field">Attachments <span style={{ color: 'var(--text-muted)' }}>optional</span></label>
              <div className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${dragging ? 'border-[var(--fg)] bg-[rgb(var(--fg-rgb)/0.08)]' : ''}`}
                style={{ borderColor: dragging ? 'var(--fg)' : 'rgb(var(--fg-rgb) / 0.2)' }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); setFiles(f => [...f, ...Array.from(e.dataTransfer.files)]) }}>
                <input ref={fileInputRef} type="file" multiple className="hidden"
                  onChange={e => { const picked = Array.from(e.target.files ?? []); setFiles(f => [...f, ...picked]); e.target.value = '' }} />
                <Upload size={20} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-mono-label text-[10px]" style={{ color: 'var(--text-muted)' }}>DRAG & DROP FILES · PDFs, images, design files · max 10 MB each</p>
              </div>
              {files.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {files.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span className="truncate flex-1">{f.name}</span>
                      <button type="button" onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))} style={{ color: 'var(--text-muted)' }}>
                        <X size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="md:col-span-2">
              <button type="submit" disabled={submitting} className="btn-primary rounded-xl py-3 px-8 text-sm disabled:opacity-50">
                {submitting ? 'Submitting…' : 'Submit Project →'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          FULL-WIDTH DETAIL MODAL
          ══════════════════════════════════════════════════ */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-stretch">
          <div className="absolute inset-0 bg-[rgb(var(--bg-rgb)/.92)]" onClick={closeModal} />
          <div className="relative z-10 m-4 flex-1 rounded-2xl overflow-hidden flex flex-col"
            style={{ background: 'var(--bg-surface)', border: '1px solid rgb(var(--fg-rgb) / 0.2)', maxHeight: 'calc(100vh - 32px)' }}>

            {/* ── Modal header ── */}
            <div className="flex items-center gap-4 px-8 py-5 shrink-0 border-b border-theme"
              style={{ background: 'var(--bg-sidebar)' }}>
              <div className="flex-1 min-w-0">
                <p className="text-mono-label text-[10px] mb-0.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.2em' }}>PROJECT DETAIL</p>
                <h2 className="font-bold text-xl text-primary-ui truncate">{modal.title}</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Started {fmt(modal.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>
              <div className="hidden md:flex items-center gap-2 shrink-0">
                <StatusBadge status={modal.status} />
                <span className="text-mono-label px-2.5 py-1 rounded-lg text-[10px]"
                  style={{ color: PRIORITY_COLOR[modal.priority], background: `color-mix(in srgb, ${PRIORITY_COLOR[modal.priority]} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${PRIORITY_COLOR[modal.priority]} 21%, transparent)` }}>
                  {modal.priority.toUpperCase()} PRIORITY
                </span>
                {openRequests > 0 && (
                  <span className="flex items-center gap-1 text-mono-label px-2.5 py-1 rounded-lg text-[10px] animate-pulse"
                    style={{ background: 'rgb(var(--fg-rgb) / 0.12)', border: '1px solid rgb(var(--fg-rgb) / 0.35)', color: 'var(--fg)' }}>
                    <Bell size={10} /> {openRequests} open request{openRequests > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button onClick={closeModal} className="p-2 rounded transition-colors shrink-0"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <X size={16} />
              </button>
            </div>

            {/* ── Tabs ── */}
            <div className="flex items-center gap-1 px-8 py-3 border-b border-theme shrink-0" style={{ background: 'var(--bg-sidebar)' }}>
              {([
                { key: 'overview',  label: 'Overview',     icon: <TrendingUp size={13} /> },
                { key: 'tasks',     label: 'Sprints & Tasks', icon: <CheckSquare size={13} /> },
                { key: 'corrections', label: 'Corrections', icon: <ClipboardList size={13} /> },
                { key: 'requests',  label: `Requests${openRequests > 0 ? ` (${openRequests})` : ''}`, icon: <Bell size={13} /> },
                { key: 'chat',      label: `Chat${chatUnread > 0 ? ` (${chatUnread})` : ''}`, icon: <MessageSquare size={13} /> },
                { key: 'escalate',  label: 'Escalate',     icon: <AlertOctagon size={13} /> },
              ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(t => (
                <button key={t.key} onClick={() => { setTab(t.key); if (t.key === 'chat' && modal) markReadByClient(modal.id) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: tab === t.key ? 'var(--crimson-dim)' : 'transparent',
                    color: tab === t.key ? 'var(--fg)' : 'var(--text-muted)',
                    border: tab === t.key ? '1px solid var(--border-crimson)' : '1px solid transparent',
                  }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* ── Tab content ── */}
            <div className="flex-1 overflow-hidden min-h-0">

              {/* ── OVERVIEW ── */}
              {tab === 'overview' && (
                <div className="h-full overflow-y-auto">
                  <div className="flex min-h-full">

                    {/* Left: stats + timeline + links + team */}
                    <div className="flex-1 px-8 py-7 space-y-7 overflow-y-auto">

                      {/* Stat grid */}
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { icon: <DollarSign size={14} />, label: 'TOTAL BUDGET',  value: `${currency}${modal.budget.toLocaleString()}`,       color: 'var(--fg)', bg: 'rgb(var(--fg-rgb) / 0.08)',    border: 'rgb(var(--fg-rgb) / 0.2)' },
                          { icon: <Calendar size={14} />,   label: 'START DATE',    value: fmt(modal.createdAt, { month: 'short', day: 'numeric', year: 'numeric' }), color: 'var(--fg)', bg: 'rgb(var(--fg-rgb) / 0.08)',   border: 'rgb(var(--fg-rgb) / 0.2)' },
                          { icon: <Calendar size={14} />,   label: 'DEADLINE',      value: fmt(modal.deadline,  { month: 'short', day: 'numeric', year: 'numeric' }), color: isOverdue(modal.deadline) && modal.status !== 'completed' ? 'var(--fg)' : 'var(--fg)', bg: 'rgb(var(--fg-rgb) / 0.08)', border: 'rgb(var(--fg-rgb) / 0.2)' },
                          { icon: <TrendingUp size={14} />, label: 'COMPLETION',    value: `${modal.progress}%`,                                  color: 'var(--fg)', bg: 'rgb(var(--fg-rgb) / 0.08)', border: 'rgb(var(--fg-rgb) / 0.2)' },
                        ].map(({ icon, label, value, color, bg, border }) => (
                          <div key={label} className="rounded-xl px-4 py-3.5" style={{ background: bg, border: `1px solid ${border}` }}>
                            <div className="flex items-center gap-1.5 mb-2" style={{ color }}>
                              {icon}
                              <span className="text-mono-label" style={{ fontSize: '10px', letterSpacing: '0.12em' }}>{label}</span>
                            </div>
                            <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Progress bar */}
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-mono-label" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>OVERALL PROGRESS</span>
                          <span className="font-bold text-sm" style={{ color: 'var(--fg)' }}>{modal.progress}%</span>
                        </div>
                        <div className="rounded-full overflow-hidden" style={{ height: 10, background: 'var(--track-bg)' }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${modal.progress}%`, background: 'var(--fg)' }} />
                        </div>
                      </div>

                      {/* Description */}
                      {modal.description && (
                        <div>
                          <p className="text-mono-label mb-2" style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.15em' }}>DESCRIPTION</p>
                          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{modal.description}</p>
                        </div>
                      )}

                      {/* Links */}
                      {(modal.repoUrl || modal.liveUrl || modal.correctionSheetUrl) && (
                        <div>
                          <p className="text-mono-label mb-3" style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.15em' }}>PROJECT LINKS</p>
                          <div className="space-y-2">
                            {modal.repoUrl && (
                              <a href={modal.repoUrl} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium transition-all group"
                                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                                <Code2 size={14} style={{ color: 'var(--fg)' }} /> Repository
                                <ExternalLink size={11} className="ml-auto opacity-40 group-hover:opacity-100 transition-opacity" />
                              </a>
                            )}
                            {modal.liveUrl && (
                              <a href={modal.liveUrl} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium transition-all group"
                                style={{ background: 'rgb(var(--fg-rgb) / 0.05)', border: '1px solid rgb(var(--fg-rgb) / 0.2)', color: 'var(--fg)' }}>
                                <Globe size={14} /> Live / Staging
                                <ExternalLink size={11} className="ml-auto opacity-40 group-hover:opacity-100 transition-opacity" />
                              </a>
                            )}
                            {modal.correctionSheetUrl && (
                              <a href={modal.correctionSheetUrl} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium transition-all group"
                                style={{ background: 'rgb(var(--fg-rgb) / 0.05)', border: '1px solid rgb(var(--fg-rgb) / 0.2)', color: 'var(--fg)' }}>
                                <FileSpreadsheet size={14} /> Correction Sheet
                                <ExternalLink size={11} className="ml-auto opacity-40 group-hover:opacity-100 transition-opacity" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Team */}
                      {(modal.teamMembers ?? []).length > 0 && (
                        <div>
                          <p className="text-mono-label mb-3" style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.15em' }}>YOUR TEAM</p>
                          <div className="space-y-2">
                            {(modal.teamMembers ?? []).map((m, i) => {
                              const palette = ['var(--fg)', 'var(--fg)', 'var(--fg)', 'var(--fg)', 'var(--fg)', 'var(--fg)']
                              const accent  = palette[(m.user?.name?.charCodeAt(0) ?? i) % palette.length]
                              return (
                                <div key={m.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                                  <div className="rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                                    style={{ width: 38, height: 38, background: `color-mix(in srgb, ${accent} 9%, transparent)`, border: `1.5px solid color-mix(in srgb, ${accent} 25%, transparent)`, color: accent }}>
                                    {m.user?.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-primary-ui">{m.user?.name}</p>
                                    <p className="text-mono-label text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{m.skills?.slice(0, 3).join(' · ')}</p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}

              {/* ── SPRINTS & TASKS ── */}
              {tab === 'tasks' && (
                <div className="h-full overflow-y-auto px-8 py-7">
                  <div className="flex items-center justify-between mb-5">
                    <p className="text-mono-label font-bold" style={{ fontSize: '11px', color: 'var(--text-secondary)', letterSpacing: '0.15em' }}>SPRINTS & TASKS</p>
                    {tasks.length > 0 && (
                      <span className="text-mono-label px-2.5 py-1 rounded-lg text-xs"
                        style={{ background: 'rgb(var(--fg-rgb) / 0.08)', border: '1px solid rgb(var(--fg-rgb) / 0.2)', color: 'var(--fg)' }}>
                        {completedCount}/{tasks.length} done
                      </span>
                    )}
                  </div>
                  {sprints.length === 0 && tasks.length === 0 ? (
                    <div className="text-center py-16 rounded-xl" style={{ border: '1px dashed var(--border)' }}>
                      <CheckSquare size={28} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No sprints or tasks yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-w-3xl">
                      {sprints.map(sprint => {
                        const st = tasksBySprintId(sprint.id)
                        const done = st.filter(t => t.completed).length
                        const isCollapsed = collapsed.has(sprint.id)
                        const pct = st.length ? Math.round(done / st.length * 100) : 0
                        return (
                          <div key={sprint.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
                              style={{ background: 'var(--bg-elevated)' }}
                              onClick={() => setCollapsed(prev => { const n = new Set(prev); n.has(sprint.id) ? n.delete(sprint.id) : n.add(sprint.id); return n })}>
                              <ChevDown size={13} style={{ color: 'var(--text-muted)', transform: isCollapsed ? 'rotate(-90deg)' : undefined, transition: 'transform 0.15s' }} />
                              <Layers size={12} style={{ color: 'var(--fg)' }} />
                              <span className="flex-1 font-semibold text-sm text-primary-ui">{sprint.name}</span>
                              <div className="hidden sm:flex items-center gap-2">
                                <div className="w-20 rounded-full overflow-hidden" style={{ height: 4, background: 'var(--track-bg)' }}>
                                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--fg)' }} />
                                </div>
                                <span className="text-mono-label text-[10px]" style={{ color: 'var(--text-muted)' }}>{done}/{st.length}</span>
                              </div>
                              {sprint.startDate && <span className="text-mono-label text-[10px]" style={{ color: 'var(--text-muted)' }}>{fmt(sprint.startDate, { month: 'short', day: 'numeric' })}</span>}
                              {sprint.endDate   && <span className="text-mono-label text-[10px]" style={{ color: 'var(--text-muted)' }}>→ {fmt(sprint.endDate, { month: 'short', day: 'numeric' })}</span>}
                            </div>
                            {!isCollapsed && (
                              <div className="px-3 pb-3 pt-1 space-y-1">
                                {st.map(task => (
                                  <div key={task.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                                    style={{ background: task.completed ? 'rgb(var(--fg-rgb) / 0.03)' : 'transparent', border: `1px solid ${task.completed ? 'rgb(var(--fg-rgb) / 0.1)' : 'transparent'}` }}>
                                    {task.completed ? <CheckSquare size={14} style={{ color: 'var(--fg)' }} /> : <Square size={14} style={{ color: 'var(--text-muted)' }} />}
                                    <span className="text-sm flex-1" style={{ color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.completed ? 'line-through' : 'none' }}>{task.title}</span>
                                  </div>
                                ))}
                                {st.length === 0 && <p className="text-center py-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>No tasks in this sprint</p>}
                              </div>
                            )}
                          </div>
                        )
                      })}
                      {unassigned.length > 0 && (
                        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                          <div className="flex items-center gap-3 px-4 py-3" style={{ background: 'var(--bg-elevated)' }}>
                            <ChevronRight size={13} style={{ color: 'var(--text-muted)' }} />
                            <span className="flex-1 font-semibold text-sm text-primary-ui">Backlog</span>
                            <span className="text-mono-label text-[10px]" style={{ color: 'var(--text-muted)' }}>{unassigned.filter(t => t.completed).length}/{unassigned.length}</span>
                          </div>
                          <div className="px-3 pb-3 pt-1 space-y-1">
                            {unassigned.map(task => (
                              <div key={task.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
                                {task.completed ? <CheckSquare size={14} style={{ color: 'var(--fg)' }} /> : <Square size={14} style={{ color: 'var(--text-muted)' }} />}
                                <span className="text-sm" style={{ color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.completed ? 'line-through' : 'none' }}>{task.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── CORRECTIONS ── */}
              {tab === 'corrections' && (
                <div className="h-full overflow-y-auto px-8 py-7">
                  <div className="max-w-4xl">
                    <CorrectionsPanel projectId={modal.id} />
                  </div>
                </div>
              )}

              {/* ── DEVELOPER REQUESTS ── */}
              {tab === 'requests' && (
                <div className="h-full overflow-y-auto px-8 py-7">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-mono-label font-bold mb-0.5" style={{ fontSize: '11px', color: 'var(--text-secondary)', letterSpacing: '0.15em' }}>REQUESTS</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Questions from your project team that need your input, and the changes and escalations you have raised.</p>
                    </div>
                    {openRequests > 0 && (
                      <span className="text-mono-label px-2.5 py-1 rounded-full text-[10px] animate-pulse font-bold"
                        style={{ background: 'rgb(var(--fg-rgb) / 0.12)', border: '1px solid rgb(var(--fg-rgb) / 0.3)', color: 'var(--fg)' }}>
                        {openRequests} need{openRequests === 1 ? 's' : ''} response
                      </span>
                    )}
                  </div>

                  {/* Ask for a change */}
                  <div className="rounded-xl p-5 mb-5 space-y-3 max-w-3xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <p className="text-mono-label font-bold" style={{ fontSize: '10px', color: 'var(--text-secondary)', letterSpacing: '0.15em' }}>REQUEST A CHANGE</p>
                    <input className="input-field py-2 text-sm" placeholder="What should change?"
                      value={changeForm.subject} onChange={e => { setChangeForm(f => ({ ...f, subject: e.target.value })); setChangeSent(false) }} />
                    <textarea className="input-field resize-none text-sm" rows={3} placeholder="Describe the change and why it is needed…"
                      value={changeForm.body} onChange={e => { setChangeForm(f => ({ ...f, body: e.target.value })); setChangeSent(false) }} />
                    <div className="flex items-center gap-3">
                      <button
                        disabled={sendingChange || !changeForm.subject.trim() || !changeForm.body.trim()}
                        onClick={submitChangeRequest}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-40"
                        style={{ background: 'rgb(var(--fg-rgb) / 0.12)', border: '1px solid rgb(var(--fg-rgb) / 0.3)', color: 'var(--fg)' }}>
                        <Send size={11} /> {sendingChange ? 'Sending…' : 'Send Change Request'}
                      </button>
                      {changeSent && (
                        <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--fg)' }}>
                          <CheckCircle size={12} /> Change request sent
                        </span>
                      )}
                    </div>
                  </div>

                  {requestActionError && (
                    <div className="mb-4 max-w-3xl">
                      <ErrorBanner message={requestActionError} onClose={() => setRequestActionError('')} />
                    </div>
                  )}

                  {requestsError ? (
                    <div className="max-w-3xl">
                      <ErrorBanner title="Could not load requests" message={requestsError} />
                    </div>
                  ) : projectRequests.length === 0 ? (
                    <div className="text-center py-16 rounded-xl" style={{ border: '1px dashed var(--border)' }}>
                      <MessageSquare size={28} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No requests on this project yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-w-3xl">
                      {projectRequests.map(req => (
                        <div key={req.id} className="rounded-xl overflow-hidden"
                          style={{ border: `1px solid ${req.status === 'open' ? 'rgb(var(--fg-rgb) / 0.25)' : 'var(--border)'}` }}>
                          {/* request header */}
                          <div className="flex items-start gap-3 px-5 py-4"
                            style={{ background: req.status === 'open' ? 'rgb(var(--fg-rgb) / 0.04)' : 'var(--bg-elevated)' }}>
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                              style={{ background: 'rgb(var(--fg-rgb) / 0.12)', border: '1px solid rgb(var(--fg-rgb) / 0.25)', color: 'var(--fg)' }}>
                              {(req.fromUser?.name ?? '?').charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                <span className="font-bold text-sm text-primary-ui">{req.fromUser?.name ?? 'Unknown'}</span>
                                <span className="text-mono-label text-[9px] px-1.5 py-0.5 rounded-full"
                                  style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                  {req.kind.toUpperCase()}{req.kind === 'escalation' ? ` · ${req.urgency.toUpperCase()}` : ''}
                                </span>
                                <span className="text-mono-label text-[9px] px-1.5 py-0.5 rounded-full"
                                  style={{ background: req.status === 'open' ? 'rgb(var(--fg-rgb) / 0.12)' : 'rgb(var(--fg-rgb) / 0.12)', border: `1px solid ${req.status === 'open' ? 'rgb(var(--fg-rgb) / 0.3)' : 'rgb(var(--fg-rgb) / 0.3)'}`, color: req.status === 'open' ? 'var(--fg)' : 'var(--fg)' }}>
                                  {req.status === 'open' ? 'OPEN' : 'RESOLVED'}
                                </span>
                                <span className="text-mono-label text-[10px] ml-auto" style={{ color: 'var(--text-muted)' }}>
                                  {fmt(req.createdAt, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' } as Intl.DateTimeFormatOptions)}
                                </span>
                              </div>
                              <p className="font-semibold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>{req.subject}</p>
                              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{req.body}</p>
                              {req.reply && (
                                <p className="text-sm leading-relaxed mt-2 pl-3" style={{ color: 'var(--text-secondary)', borderLeft: '2px solid rgb(var(--fg-rgb) / 0.3)' }}>{req.reply}</p>
                              )}
                            </div>
                          </div>
                          {/* action row */}
                          {needsReply(req) && (
                            <div className="flex items-center gap-2 px-5 py-3 border-t border-theme">
                              <input className="input-field flex-1 py-2 text-sm" placeholder="Type your reply…"
                                value={replies[req.id] ?? ''} onChange={e => setReplies(r => ({ ...r, [req.id]: e.target.value }))} />
                              <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-40"
                                style={{ background: 'rgb(var(--fg-rgb) / 0.12)', border: '1px solid rgb(var(--fg-rgb) / 0.3)', color: 'var(--fg)' }}
                                disabled={resolvingId === req.id}
                                onClick={() => resolveRequest(req.id)}>
                                <Send size={11} /> {resolvingId === req.id ? 'Sending…' : 'Reply & Resolve'}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── CHAT ── */}
              {tab === 'chat' && (
                <div className="h-full flex flex-col">
                  <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
                    {projectChat.length === 0 ? (
                      <div className="text-center py-16">
                        <MessageSquare size={28} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No messages yet — start the conversation</p>
                      </div>
                    ) : (
                      projectChat.map(msg => (
                        <div key={msg.id} className={`flex items-end gap-3 ${msg.from === 'client' ? 'flex-row-reverse' : ''}`}>
                          {/* avatar */}
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                            style={{ background: msg.from === 'client' ? 'rgb(var(--fg-rgb) / 0.18)' : 'rgb(var(--fg-rgb) / 0.18)', color: msg.from === 'client' ? 'var(--fg)' : 'var(--fg)' }}>
                            {msg.sender.charAt(0)}
                          </div>
                          <div className={`max-w-[65%] ${msg.from === 'client' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                            <div className="flex items-center gap-2">
                              <span className="text-mono-label text-[10px]" style={{ color: 'var(--text-muted)' }}>{msg.sender}</span>
                              <span className="text-mono-label text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                {new Date(msg.ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
                              style={{
                                background: msg.from === 'client' ? 'rgb(var(--fg-rgb) / 0.12)' : 'var(--bg-elevated)',
                                border: `1px solid ${msg.from === 'client' ? 'rgb(var(--fg-rgb) / 0.2)' : 'var(--border)'}`,
                                color: 'var(--text-primary)',
                                borderBottomRightRadius: msg.from === 'client' ? 4 : undefined,
                                borderBottomLeftRadius: msg.from === 'admin' ? 4 : undefined,
                              }}>
                              {msg.text}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  {/* Input */}
                  <div className="px-8 py-4 border-t border-theme shrink-0" style={{ background: 'var(--bg-sidebar)' }}>
                    {chatError && <div className="mb-3"><ErrorBanner title="Not sent" message={chatError} onClose={() => setChatError('')} /></div>}
                    <div className="flex items-center gap-3">
                      <input className="input-field flex-1 py-3"
                        placeholder="Message your project team…"
                        value={chatMsg}
                        onChange={e => setChatMsg(e.target.value)}
                        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }} />
                      <button onClick={sendChat} disabled={!chatMsg.trim()}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40"
                        style={{ background: 'var(--fg)', color: 'var(--bg)' }}>
                        <Send size={14} /> Send
                      </button>
                    </div>
                    <p className="text-mono-label mt-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>Messages are forwarded to your assigned team. Response within 1 business day.</p>
                  </div>
                </div>
              )}

              {/* ── ESCALATE ── */}
              {tab === 'escalate' && (
                <div className="h-full overflow-y-auto px-8 py-7">
                  <div className="max-w-2xl">
                    <div className="flex items-start gap-4 mb-7 p-5 rounded-2xl"
                      style={{ background: 'rgb(var(--fg-rgb) / 0.06)', border: '1px solid rgb(var(--fg-rgb) / 0.2)' }}>
                      <Shield size={22} style={{ color: 'var(--fg)' }} className="shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm mb-1" style={{ color: 'var(--fg)' }}>Escalate to Project Manager</p>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          Use this form to raise urgent issues, blockers, or concerns directly with your dedicated project manager.
                          They will respond within 4 business hours.
                        </p>
                      </div>
                    </div>

                    {escalated ? (
                      <div className="text-center py-12 rounded-2xl"
                        style={{ background: 'rgb(var(--fg-rgb) / 0.06)', border: '1px solid rgb(var(--fg-rgb) / 0.2)' }}>
                        <CheckCircle size={36} className="mx-auto mb-3" style={{ color: 'var(--fg)' }} />
                        <p className="font-bold text-lg text-primary-ui mb-1">Escalation Submitted</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Your project manager has been notified and will respond within 4 business hours.</p>
                        <button onClick={() => setEscalated(false)} className="mt-5 btn-ghost rounded-xl text-sm py-2 px-6">
                          Submit Another
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="label-field">Issue Subject</label>
                          <input className="input-field" placeholder="e.g. Project deadline at risk, design mismatch…"
                            value={escalateForm.subject} onChange={e => setEscalateForm(f => ({ ...f, subject: e.target.value }))} />
                        </div>
                        <div>
                          <label className="label-field">Urgency Level</label>
                          <div className="flex gap-2">
                            {([
                              { key: 'normal', label: 'Normal', color: 'var(--fg)' },
                              { key: 'high',   label: 'High',   color: 'var(--fg)' },
                              { key: 'critical', label: 'Critical', color: 'var(--fg)' },
                            ] as const).map(u => (
                              <button key={u.key}
                                className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                                style={{
                                  background: escalateForm.urgency === u.key ? `color-mix(in srgb, ${u.color} 8%, transparent)` : 'var(--bg-elevated)',
                                  border: `1px solid ${escalateForm.urgency === u.key ? `color-mix(in srgb, ${u.color} 25%, transparent)` : 'var(--border)'}`,
                                  color: escalateForm.urgency === u.key ? u.color : 'var(--text-muted)',
                                }}
                                onClick={() => setEscalateForm(f => ({ ...f, urgency: u.key }))}>
                                {u.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="label-field">Details</label>
                          <textarea className="input-field resize-none" rows={5}
                            placeholder="Describe the issue in detail. Include any relevant dates, blockers, or impacts on deliverables…"
                            value={escalateForm.details} onChange={e => setEscalateForm(f => ({ ...f, details: e.target.value }))} />
                        </div>
                        {escalateError && <ErrorBanner message={escalateError} onClose={() => setEscalateError('')} />}
                        <button
                          disabled={escalating || !escalateForm.subject.trim() || !escalateForm.details.trim()}
                          onClick={submitEscalation}
                          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
                          style={{ background: 'rgb(var(--fg-rgb) / 0.12)', border: '1px solid rgb(var(--fg-rgb) / 0.3)', color: 'var(--fg)' }}>
                          <AlertOctagon size={14} /> {escalating ? 'Submitting…' : 'Submit Escalation'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
