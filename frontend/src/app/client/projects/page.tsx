'use client'

import { useEffect, useState, useRef, KeyboardEvent } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { projectsApi, sprintsApi, tasksApi } from '@/lib/api'
import { Project, ProjectSprint, ProjectTask } from '@/lib/types'
import { useCurrencySymbol, useAuthStore } from '@/lib/store'
import {
  X, Upload, CheckCircle, AlertTriangle, Calendar, DollarSign,
  Globe, Code2, FileSpreadsheet, ExternalLink, ChevronDown as ChevDown,
  MessageSquare, Send, AlertOctagon, Users, Clock, TrendingUp,
  CheckSquare, Square, Layers, ChevronRight, Zap, Bell, Plus,
  ArrowUpRight, Shield,
} from 'lucide-react'

/* ── Types ──────────────────────────────────────────────── */
interface ChatMessage { id: string; from: 'client' | 'team'; sender: string; text: string; ts: string }
interface DevRequest  { id: string; from: string; subject: string; body: string; ts: string; status: 'open' | 'resolved'; projectId: string }

/* ── Mock data ──────────────────────────────────────────── */
const MOCK_PROJECTS: Project[] = [
  {
    id: '1', title: 'E-Commerce Platform Redesign',
    description: 'Full redesign of the client shopping experience including product listings, cart, and checkout flow.',
    budget: 4500, deadline: new Date(Date.now() + 3 * 86400000).toISOString(),
    status: 'in_progress', priority: 'high', clientId: 'c1',
    teamMembers: [
      { id: 'f1', userId: 'u1', user: { id: 'u1', name: 'Alex Rivera', email: 'alex@freelancepro.dev', role: 'freelancer', createdAt: '' }, skills: ['React', 'TypeScript', 'Tailwind'], experience: 3, hourlyRate: 75, status: 'active' },
      { id: 'f2', userId: 'u2', user: { id: 'u2', name: 'Zara Ahmed',  email: 'zara@freelancepro.dev',  role: 'freelancer', createdAt: '' }, skills: ['Figma', 'UI/UX'],              experience: 4, hourlyRate: 65, status: 'active' },
    ],
    progress: 65, repoUrl: 'https://github.com/org/ecommerce', liveUrl: 'https://staging.example.com', correctionSheetUrl: 'https://docs.google.com/spreadsheets/d/1',
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: '2', title: 'Mobile App Backend API',
    description: 'REST API development for the iOS/Android app including authentication, data sync, and push notifications.',
    budget: 3200, deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
    status: 'pending_approval', priority: 'medium', clientId: 'c1',
    teamMembers: [
      { id: 'f3', userId: 'u3', user: { id: 'u3', name: 'Sam Rivera', email: 'sam@freelancepro.dev', role: 'freelancer', createdAt: '' }, skills: ['Node.js', 'PostgreSQL', 'Docker'], experience: 5, hourlyRate: 90, status: 'active' },
    ],
    progress: 100, repoUrl: 'https://github.com/org/mobile-api',
    createdAt: new Date(Date.now() - 35 * 86400000).toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: '3', title: 'Analytics Dashboard',
    description: 'Analytics dashboard with charts, data export, and KPI tracking.',
    budget: 2100, deadline: new Date(Date.now() - 10 * 86400000).toISOString(),
    status: 'completed', priority: 'high', clientId: 'c1', progress: 100,
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(), updatedAt: new Date().toISOString(),
  },
]

const MOCK_REQUESTS: DevRequest[] = [
  { id: 'r1', from: 'Alex Rivera', subject: 'Confirmation needed: payment gateway', body: 'Hi! We\'re integrating the Stripe checkout. Can you confirm if you want to use the test or live keys for the staging environment? Also, do you have a preferred currency fallback for international users?', ts: new Date(Date.now() - 2 * 3600000).toISOString(), status: 'open', projectId: '1' },
  { id: 'r2', from: 'Zara Ahmed',  subject: 'Design approval: mobile breakpoint', body: 'Attached is the updated mobile design for the product listing page. Please review the card layout and confirm before we hand off to development. Figma link in the correction sheet.', ts: new Date(Date.now() - 5 * 3600000).toISOString(), status: 'open',     projectId: '1' },
  { id: 'r3', from: 'Sam Rivera',  subject: 'API rate limits clarification',         body: 'The current plan allows 1000 req/min. With the new push notification flow, we may exceed this during peak hours. Should we upgrade or implement a queue?', ts: new Date(Date.now() - 1 * 86400000).toISOString(), status: 'resolved', projectId: '2' },
]

const PAYMENT_SCHEDULE: Record<string, { label: string; date: string; amount: number; paid: boolean }[]> = {
  '1': [
    { label: 'Kickoff Payment',    date: new Date(Date.now() - 20 * 86400000).toISOString(), amount: 1125, paid: true  },
    { label: 'Milestone 1 — UI',   date: new Date(Date.now() - 5  * 86400000).toISOString(), amount: 1125, paid: true  },
    { label: 'Milestone 2 — API',  date: new Date(Date.now() + 10 * 86400000).toISOString(), amount: 1125, paid: false },
    { label: 'Final Delivery',     date: new Date(Date.now() + 25 * 86400000).toISOString(), amount: 1125, paid: false },
  ],
  '2': [
    { label: 'Kickoff Payment',    date: new Date(Date.now() - 35 * 86400000).toISOString(), amount: 1600, paid: true  },
    { label: 'Final Delivery',     date: new Date(Date.now() + 14 * 86400000).toISOString(), amount: 1600, paid: false },
  ],
}

const MOCK_CHAT: Record<string, ChatMessage[]> = {
  '1': [
    { id: 'c1', from: 'team',   sender: 'Alex Rivera', text: 'Hi! Just wanted to give you a quick update — the cart component is 80% done. Looking good!', ts: new Date(Date.now() - 3 * 3600000).toISOString() },
    { id: 'c2', from: 'client', sender: 'You',         text: 'Great to hear! Will you be able to hit the staging deadline?', ts: new Date(Date.now() - 2.5 * 3600000).toISOString() },
    { id: 'c3', from: 'team',   sender: 'Alex Rivera', text: 'Yes, we\'re on track. Staging will be live by Friday EOD.', ts: new Date(Date.now() - 2 * 3600000).toISOString() },
  ],
  '2': [],
}

/* ── Helpers ────────────────────────────────────────────── */
function fmt(iso: string, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', opts ?? { month: 'short', day: 'numeric', year: 'numeric' })
}
function daysLeft(iso: string) { return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000) }
function isOverdue(iso: string) { return iso && new Date(iso) < new Date() }

const PRIORITY_COLOR: Record<string, string> = { low: '#4ade80', medium: '#fbbf24', high: '#fb923c', critical: '#f87171' }
const STATUS_LABEL: Record<string, string> = {
  new: 'New', assigned: 'Assigned', in_progress: 'In Progress',
  blocked: 'Blocked', pending_approval: 'Pending Approval', completed: 'Completed', delayed: 'Delayed',
}

type Tab = 'overview' | 'tasks' | 'requests' | 'chat' | 'escalate'

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
  const [requests,   setRequests]   = useState<DevRequest[]>(MOCK_REQUESTS)
  const [chat,       setChat]       = useState<Record<string, ChatMessage[]>>(MOCK_CHAT)
  const [chatMsg,    setChatMsg]    = useState('')
  const [escalateForm, setEscalateForm] = useState({ subject: '', details: '', urgency: 'normal' })
  const [escalated,  setEscalated]  = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  /* submit new project form */
  const [form, setForm]   = useState({ title: '', description: '', budget: '', deadline: '', requirements: '' })
  const [errors, setErrors] = useState<Partial<typeof form>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted,  setSubmitted]  = useState(false)
  const [dragging,   setDragging]   = useState(false)

  useEffect(() => {
    projectsApi.getAll()
      .then(r => setProjects(r.data?.data ?? r.data ?? MOCK_PROJECTS))
      .catch(() => setProjects(MOCK_PROJECTS))
      .finally(() => setLoading(false))
  }, [])

  const openModal = async (p: Project) => {
    setModal(p); setTab('overview'); setSprints([]); setTasks([])
    const [sr, tr] = await Promise.allSettled([sprintsApi.getByProject(p.id), tasksApi.getByProject(p.id)])
    if (sr.status === 'fulfilled') setSprints(sr.value.data)
    if (tr.status === 'fulfilled') setTasks(tr.value.data)
  }

  const closeModal = () => { setModal(null); setEscalated(false) }

  /* chat send */
  const sendChat = () => {
    if (!chatMsg.trim() || !modal) return
    const msg: ChatMessage = { id: `m${Date.now()}`, from: 'client', sender: 'You', text: chatMsg.trim(), ts: new Date().toISOString() }
    setChat(prev => ({ ...prev, [modal.id]: [...(prev[modal.id] ?? []), msg] }))
    setChatMsg('')
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  /* escalate */
  const submitEscalation = () => {
    if (!escalateForm.subject.trim() || !escalateForm.details.trim()) return
    setEscalated(true)
    setEscalateForm({ subject: '', details: '', urgency: 'normal' })
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
    setErrors({}); setSubmitting(true)
    try {
      const res = await projectsApi.create({ ...form, budget: +form.budget } as unknown as Record<string, unknown>)
      setProjects(p => [res.data?.data ?? res.data, ...p])
    } catch {
      const mock: Project = { id: `p${Date.now()}`, ...form, budget: +form.budget, status: 'new', priority: 'medium', clientId: 'c1', progress: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      setProjects(p => [mock, ...p])
    } finally {
      setSubmitting(false); setSubmitted(true); setForm({ title: '', description: '', budget: '', deadline: '', requirements: '' })
      setTimeout(() => setSubmitted(false), 3500)
    }
  }

  const projectChat    = modal ? (chat[modal.id] ?? []) : []
  const projectRequests = modal ? requests.filter(r => r.projectId === modal.id) : []
  const openRequests    = projectRequests.filter(r => r.status === 'open').length
  const payments        = modal ? (PAYMENT_SCHEDULE[modal.id] ?? []) : []
  const nextPayment     = payments.find(p => !p.paid)
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
          {/* summary pills */}
          <div className="hidden md:flex items-center gap-2">
            {[
              { label: 'Active',   count: projects.filter(p => p.status === 'in_progress').length,      color: '#60a5fa' },
              { label: 'Pending',  count: projects.filter(p => p.status === 'pending_approval').length,  color: '#fbbf24' },
              { label: 'Done',     count: projects.filter(p => p.status === 'completed').length,         color: '#4ade80' },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: `${color}10`, border: `1px solid ${color}30` }}>
                <span className="font-bold text-base" style={{ color }}>{count}</span>
                <span className="text-mono-label text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Project Cards ── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-56 rounded-2xl animate-pulse" style={{ background: 'var(--bg-elevated)' }} />)}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 rounded-2xl" style={{ border: '1px dashed var(--border)' }}>
            <p className="text-mono-label" style={{ color: 'var(--text-muted)' }}>No projects yet — submit one below</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map(p => {
              const days    = daysLeft(p.deadline)
              const overdue = isOverdue(p.deadline) && p.status !== 'completed'
              const pReqs   = requests.filter(r => r.projectId === p.id && r.status === 'open').length
              const pPay    = PAYMENT_SCHEDULE[p.id]?.find(x => !x.paid)
              return (
                <div key={p.id}
                  className="rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200 hover:-translate-y-0.5"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                  onClick={() => openModal(p)}>
                  {/* colour top bar */}
                  <div className="h-1" style={{ background: `linear-gradient(to right, ${PRIORITY_COLOR[p.priority]}, transparent)` }} />

                  <div className="p-5">
                    {/* title row */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base leading-tight text-primary-ui truncate">{p.title}</h3>
                        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{p.description}</p>
                      </div>
                      <ArrowUpRight size={16} className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: 'var(--text-muted)' }} />
                    </div>

                    {/* badges row */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-4">
                      <StatusBadge status={p.status} />
                      <span className="text-mono-label px-2 py-0.5 rounded-full text-[9px]"
                        style={{ color: PRIORITY_COLOR[p.priority], background: `${PRIORITY_COLOR[p.priority]}12`, border: `1px solid ${PRIORITY_COLOR[p.priority]}30` }}>
                        {p.priority.toUpperCase()}
                      </span>
                      {pReqs > 0 && (
                        <span className="flex items-center gap-1 text-mono-label px-2 py-0.5 rounded-full text-[9px]"
                          style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24' }}>
                          <Bell size={8} /> {pReqs} request{pReqs > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* progress */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-mono-label text-[10px]" style={{ color: 'var(--text-muted)' }}>PROGRESS</span>
                        <span className="font-bold text-xs" style={{ color: '#DC143C' }}>{p.progress}%</span>
                      </div>
                      <div className="rounded-full overflow-hidden" style={{ height: 6, background: 'var(--track-bg)' }}>
                        <div className="h-full rounded-full" style={{ width: `${p.progress}%`, background: 'linear-gradient(to right, #8B0000, #DC143C)' }} />
                      </div>
                    </div>

                    {/* key stats */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="rounded-lg px-2.5 py-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        <p className="text-mono-label text-[9px] mb-0.5" style={{ color: 'var(--text-muted)' }}>BUDGET</p>
                        <p className="font-bold text-sm" style={{ color: '#DC143C' }}>{currency}{p.budget.toLocaleString()}</p>
                      </div>
                      <div className="rounded-lg px-2.5 py-2" style={{ background: 'var(--bg-elevated)', border: `1px solid ${overdue ? 'rgba(248,113,113,0.3)' : 'var(--border)'}` }}>
                        <p className="text-mono-label text-[9px] mb-0.5" style={{ color: 'var(--text-muted)' }}>DEADLINE</p>
                        <p className="font-bold text-sm" style={{ color: overdue ? '#f87171' : 'var(--text-primary)' }}>
                          {overdue ? `${Math.abs(days)}d over` : p.status === 'completed' ? 'Done ✓' : `${days}d left`}
                        </p>
                      </div>
                    </div>

                    {/* next payment */}
                    {pPay && (
                      <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg"
                        style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)' }}>
                        <Zap size={11} style={{ color: '#4ade80' }} />
                        <span className="text-[10px] font-semibold" style={{ color: '#4ade80' }}>Next: {pPay.label}</span>
                        <span className="ml-auto text-[10px] font-bold" style={{ color: '#4ade80' }}>{currency}{pPay.amount.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Submit New Project ── */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-display text-xl text-primary-ui mb-1">Submit a New Project</h2>
          <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>Tell us what you need — we'll match you with the right team within 48 hours.</p>

          {submitted && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-5 text-sm font-semibold"
              style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }}>
              <CheckCircle size={15} /> Project submitted! We'll be in touch shortly.
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-field">Project Title</label>
              <input className="input-field" placeholder="e.g. E-Commerce Platform"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              {errors.title && <p className="text-[11px] mt-1" style={{ color: '#DC143C' }}>{errors.title}</p>}
            </div>
            <div>
              <label className="label-field">Budget ({currency})</label>
              <input type="number" min={0} step={100} className="input-field" placeholder="5000"
                value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} />
              {errors.budget && <p className="text-[11px] mt-1" style={{ color: '#DC143C' }}>{errors.budget}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="label-field">Description</label>
              <textarea className="input-field resize-none" rows={3} placeholder="Describe your project goals and deliverables…"
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              {errors.description && <p className="text-[11px] mt-1" style={{ color: '#DC143C' }}>{errors.description}</p>}
            </div>
            <div>
              <label className="label-field">Deadline</label>
              <input type="date" className="input-field"
                value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
              {errors.deadline && <p className="text-[11px] mt-1" style={{ color: '#DC143C' }}>{errors.deadline}</p>}
            </div>
            <div>
              <label className="label-field">Technical Requirements</label>
              <input className="input-field" placeholder="React, REST API, PostgreSQL…"
                value={form.requirements} onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))} />
              {errors.requirements && <p className="text-[11px] mt-1" style={{ color: '#DC143C' }}>{errors.requirements}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="label-field">Attachments <span style={{ color: 'var(--text-muted)' }}>optional</span></label>
              <div className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${dragging ? 'border-[#DC143C] bg-[rgba(220,20,60,0.08)]' : ''}`}
                style={{ borderColor: dragging ? '#DC143C' : 'rgba(220,20,60,0.2)' }}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false) }}>
                <Upload size={20} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-mono-label text-[10px]" style={{ color: 'var(--text-muted)' }}>DRAG & DROP FILES · PDFs, images, design files</p>
              </div>
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
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 m-4 flex-1 rounded-2xl overflow-hidden flex flex-col"
            style={{ background: 'var(--bg-surface)', border: '1px solid rgba(220,20,60,0.2)', maxHeight: 'calc(100vh - 32px)' }}>

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
                  style={{ color: PRIORITY_COLOR[modal.priority], background: `${PRIORITY_COLOR[modal.priority]}15`, border: `1px solid ${PRIORITY_COLOR[modal.priority]}35` }}>
                  {modal.priority.toUpperCase()} PRIORITY
                </span>
                {openRequests > 0 && (
                  <span className="flex items-center gap-1 text-mono-label px-2.5 py-1 rounded-lg text-[10px] animate-pulse"
                    style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)', color: '#fbbf24' }}>
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
                { key: 'requests',  label: `Requests${openRequests > 0 ? ` (${openRequests})` : ''}`, icon: <Bell size={13} /> },
                { key: 'chat',      label: 'Chat',         icon: <MessageSquare size={13} /> },
                { key: 'escalate',  label: 'Escalate',     icon: <AlertOctagon size={13} /> },
              ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: tab === t.key ? 'var(--crimson-dim)' : 'transparent',
                    color: tab === t.key ? '#DC143C' : 'var(--text-muted)',
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
                    <div className="w-[55%] shrink-0 border-r border-theme px-8 py-7 space-y-7 overflow-y-auto">

                      {/* Stat grid */}
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { icon: <DollarSign size={14} />, label: 'TOTAL BUDGET',  value: `${currency}${modal.budget.toLocaleString()}`,       color: '#DC143C', bg: 'rgba(220,20,60,0.08)',    border: 'rgba(220,20,60,0.2)' },
                          { icon: <Calendar size={14} />,   label: 'START DATE',    value: fmt(modal.createdAt, { month: 'short', day: 'numeric', year: 'numeric' }), color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',   border: 'rgba(96,165,250,0.2)' },
                          { icon: <Calendar size={14} />,   label: 'DEADLINE',      value: fmt(modal.deadline,  { month: 'short', day: 'numeric', year: 'numeric' }), color: isOverdue(modal.deadline) && modal.status !== 'completed' ? '#f87171' : '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)' },
                          { icon: <TrendingUp size={14} />, label: 'COMPLETION',    value: `${modal.progress}%`,                                  color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.2)' },
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
                          <span className="font-bold text-sm" style={{ color: '#DC143C' }}>{modal.progress}%</span>
                        </div>
                        <div className="rounded-full overflow-hidden" style={{ height: 10, background: 'var(--track-bg)' }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${modal.progress}%`, background: 'linear-gradient(to right, #8B0000, #DC143C)' }} />
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
                                <Code2 size={14} style={{ color: '#DC143C' }} /> Repository
                                <ExternalLink size={11} className="ml-auto opacity-40 group-hover:opacity-100 transition-opacity" />
                              </a>
                            )}
                            {modal.liveUrl && (
                              <a href={modal.liveUrl} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium transition-all group"
                                style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }}>
                                <Globe size={14} /> Live / Staging
                                <ExternalLink size={11} className="ml-auto opacity-40 group-hover:opacity-100 transition-opacity" />
                              </a>
                            )}
                            {modal.correctionSheetUrl && (
                              <a href={modal.correctionSheetUrl} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium transition-all group"
                                style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}>
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
                              const palette = ['#DC143C', '#60a5fa', '#4ade80', '#fbbf24', '#a78bfa', '#fb923c']
                              const accent  = palette[(m.user?.name?.charCodeAt(0) ?? i) % palette.length]
                              return (
                                <div key={m.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                                  <div className="rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                                    style={{ width: 38, height: 38, background: `${accent}18`, border: `1.5px solid ${accent}40`, color: accent }}>
                                    {m.user?.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-primary-ui">{m.user?.name}</p>
                                    <p className="text-mono-label text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{m.skills?.slice(0, 3).join(' · ')}</p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="font-bold text-sm" style={{ color: '#4ade80' }}>{currency}{m.hourlyRate}/hr</p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: payment schedule */}
                    <div className="flex-1 px-8 py-7 overflow-y-auto">
                      <p className="text-mono-label mb-4" style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.15em' }}>PAYMENT SCHEDULE</p>

                      {payments.length === 0 ? (
                        <div className="text-center py-10 rounded-xl" style={{ border: '1px dashed var(--border)' }}>
                          <DollarSign size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No payment schedule yet</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {payments.map((pay, i) => (
                            <div key={i} className="rounded-xl p-4 flex items-center gap-4"
                              style={{ background: pay.paid ? 'rgba(74,222,128,0.06)' : 'var(--bg-elevated)', border: `1px solid ${pay.paid ? 'rgba(74,222,128,0.2)' : 'var(--border)'}` }}>
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: pay.paid ? 'rgba(74,222,128,0.12)' : 'var(--input-bg)', border: `1px solid ${pay.paid ? 'rgba(74,222,128,0.3)' : 'var(--border)'}` }}>
                                {pay.paid
                                  ? <CheckCircle size={16} style={{ color: '#4ade80' }} />
                                  : <Clock size={16} style={{ color: 'var(--text-muted)' }} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-primary-ui">{pay.label}</p>
                                <p className="text-mono-label text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                  {fmt(pay.date, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-bold text-base" style={{ color: pay.paid ? '#4ade80' : 'var(--text-primary)' }}>
                                  {currency}{pay.amount.toLocaleString()}
                                </p>
                                <p className="text-mono-label text-[9px]" style={{ color: pay.paid ? 'rgba(74,222,128,0.6)' : 'var(--text-muted)' }}>
                                  {pay.paid ? 'PAID' : 'UPCOMING'}
                                </p>
                              </div>
                            </div>
                          ))}

                          {/* Total */}
                          <div className="rounded-xl px-4 py-3 flex items-center justify-between mt-4"
                            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                            <span className="text-mono-label text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>TOTAL</span>
                            <span className="font-bold text-lg" style={{ color: '#DC143C' }}>
                              {currency}{payments.reduce((s, p) => s + p.amount, 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="rounded-xl px-4 py-3 flex items-center justify-between"
                            style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)' }}>
                            <span className="text-mono-label text-xs" style={{ color: '#4ade80' }}>PAID SO FAR</span>
                            <span className="font-bold text-base" style={{ color: '#4ade80' }}>
                              {currency}{payments.filter(p => p.paid).reduce((s, p) => s + p.amount, 0).toLocaleString()}
                            </span>
                          </div>
                          {nextPayment && (
                            <div className="rounded-xl px-4 py-3 flex items-center gap-3"
                              style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
                              <Zap size={14} style={{ color: '#fbbf24' }} />
                              <div className="flex-1">
                                <p className="text-xs font-bold" style={{ color: '#fbbf24' }}>NEXT PAYMENT DUE</p>
                                <p className="text-mono-label text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                  {nextPayment.label} · {fmt(nextPayment.date, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                              </div>
                              <span className="font-bold" style={{ color: '#fbbf24' }}>{currency}{nextPayment.amount.toLocaleString()}</span>
                            </div>
                          )}
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
                        style={{ background: 'rgba(220,20,60,0.08)', border: '1px solid rgba(220,20,60,0.2)', color: '#f87171' }}>
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
                              <Layers size={12} style={{ color: '#DC143C' }} />
                              <span className="flex-1 font-semibold text-sm text-primary-ui">{sprint.name}</span>
                              <div className="hidden sm:flex items-center gap-2">
                                <div className="w-20 rounded-full overflow-hidden" style={{ height: 4, background: 'var(--track-bg)' }}>
                                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#DC143C' }} />
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
                                    style={{ background: task.completed ? 'rgba(74,222,128,0.03)' : 'transparent', border: `1px solid ${task.completed ? 'rgba(74,222,128,0.1)' : 'transparent'}` }}>
                                    {task.completed ? <CheckSquare size={14} style={{ color: '#4ade80' }} /> : <Square size={14} style={{ color: 'var(--text-muted)' }} />}
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
                                {task.completed ? <CheckSquare size={14} style={{ color: '#4ade80' }} /> : <Square size={14} style={{ color: 'var(--text-muted)' }} />}
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

              {/* ── DEVELOPER REQUESTS ── */}
              {tab === 'requests' && (
                <div className="h-full overflow-y-auto px-8 py-7">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-mono-label font-bold mb-0.5" style={{ fontSize: '11px', color: 'var(--text-secondary)', letterSpacing: '0.15em' }}>DEVELOPER REQUESTS</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Questions and clarifications from your project team that need your input.</p>
                    </div>
                    {openRequests > 0 && (
                      <span className="text-mono-label px-2.5 py-1 rounded-full text-[10px] animate-pulse font-bold"
                        style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24' }}>
                        {openRequests} need{openRequests === 1 ? 's' : ''} response
                      </span>
                    )}
                  </div>

                  {projectRequests.length === 0 ? (
                    <div className="text-center py-16 rounded-xl" style={{ border: '1px dashed var(--border)' }}>
                      <MessageSquare size={28} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No requests from the team yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-w-3xl">
                      {projectRequests.map(req => (
                        <div key={req.id} className="rounded-xl overflow-hidden"
                          style={{ border: `1px solid ${req.status === 'open' ? 'rgba(251,191,36,0.25)' : 'var(--border)'}` }}>
                          {/* request header */}
                          <div className="flex items-start gap-3 px-5 py-4"
                            style={{ background: req.status === 'open' ? 'rgba(251,191,36,0.04)' : 'var(--bg-elevated)' }}>
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                              style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24' }}>
                              {req.from.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                <span className="font-bold text-sm text-primary-ui">{req.from}</span>
                                <span className="text-mono-label text-[9px] px-1.5 py-0.5 rounded-full"
                                  style={{ background: req.status === 'open' ? 'rgba(251,191,36,0.12)' : 'rgba(74,222,128,0.12)', border: `1px solid ${req.status === 'open' ? 'rgba(251,191,36,0.3)' : 'rgba(74,222,128,0.3)'}`, color: req.status === 'open' ? '#fbbf24' : '#4ade80' }}>
                                  {req.status === 'open' ? 'OPEN' : 'RESOLVED'}
                                </span>
                                <span className="text-mono-label text-[10px] ml-auto" style={{ color: 'var(--text-muted)' }}>
                                  {fmt(req.ts, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' } as Intl.DateTimeFormatOptions)}
                                </span>
                              </div>
                              <p className="font-semibold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>{req.subject}</p>
                              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{req.body}</p>
                            </div>
                          </div>
                          {/* action row */}
                          {req.status === 'open' && (
                            <div className="flex items-center gap-2 px-5 py-3 border-t border-theme">
                              <input className="input-field flex-1 py-2 text-sm" placeholder="Type your reply…" />
                              <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold"
                                style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24' }}
                                onClick={() => setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'resolved' } : r))}>
                                <Send size={11} /> Reply & Resolve
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
                            style={{ background: msg.from === 'client' ? 'rgba(220,20,60,0.18)' : 'rgba(96,165,250,0.18)', color: msg.from === 'client' ? '#DC143C' : '#60a5fa' }}>
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
                                background: msg.from === 'client' ? 'rgba(220,20,60,0.12)' : 'var(--bg-elevated)',
                                border: `1px solid ${msg.from === 'client' ? 'rgba(220,20,60,0.2)' : 'var(--border)'}`,
                                color: 'var(--text-primary)',
                                borderBottomRightRadius: msg.from === 'client' ? 4 : undefined,
                                borderBottomLeftRadius: msg.from === 'team' ? 4 : undefined,
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
                    <div className="flex items-center gap-3">
                      <input className="input-field flex-1 py-3"
                        placeholder="Message your project team…"
                        value={chatMsg}
                        onChange={e => setChatMsg(e.target.value)}
                        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }} />
                      <button onClick={sendChat} disabled={!chatMsg.trim()}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40"
                        style={{ background: '#DC143C', color: '#fff' }}>
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
                      style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)' }}>
                      <Shield size={22} style={{ color: '#f87171' }} className="shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm mb-1" style={{ color: '#f87171' }}>Escalate to Project Manager</p>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          Use this form to raise urgent issues, blockers, or concerns directly with your dedicated project manager.
                          They will respond within 4 business hours.
                        </p>
                      </div>
                    </div>

                    {escalated ? (
                      <div className="text-center py-12 rounded-2xl"
                        style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)' }}>
                        <CheckCircle size={36} className="mx-auto mb-3" style={{ color: '#4ade80' }} />
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
                            {[
                              { key: 'normal', label: 'Normal', color: '#60a5fa' },
                              { key: 'high',   label: 'High',   color: '#fbbf24' },
                              { key: 'urgent', label: 'Urgent', color: '#f87171' },
                            ].map(u => (
                              <button key={u.key}
                                className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                                style={{
                                  background: escalateForm.urgency === u.key ? `${u.color}15` : 'var(--bg-elevated)',
                                  border: `1px solid ${escalateForm.urgency === u.key ? `${u.color}40` : 'var(--border)'}`,
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
                        <button
                          disabled={!escalateForm.subject.trim() || !escalateForm.details.trim()}
                          onClick={submitEscalation}
                          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
                          style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}>
                          <AlertOctagon size={14} /> Submit Escalation
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
