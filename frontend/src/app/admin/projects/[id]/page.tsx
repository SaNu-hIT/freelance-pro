'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, DollarSign, Calendar, AlertTriangle, CheckCircle2,
  ChevronRight, Activity, Clock, Users, ExternalLink,
  Globe, Code2, FileSpreadsheet, Pencil, Plus, X,
  MessageSquare, FileText, Download, Upload, Trash2, Send,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { projectsApi, tasksApi, sprintsApi, worklogsApi, projectRequestsApi, documentsApi } from '@/lib/api'
import { Project, ProjectTask, ProjectSprint, Worklog, ProjectStatus, ProjectPriority, ProjectRequest, ProjectDocument, DocumentType } from '@/lib/types'
import { useCurrencySymbol } from '@/lib/store'
import { apiError, formatBytes } from '@/lib/utils'
import ErrorBanner from '@/components/ui/ErrorBanner'
import { SprintTaskBoard } from '@/components/admin/SprintTaskBoard'
import { ProjectLinks } from '@/components/admin/ProjectLinks'

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtShort(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function daysAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d === 0) return 'today'
  if (d === 1) return '1 day ago'
  return `${d} days ago`
}

function daysLeft(iso: string) {
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
  if (d < 0) return `${Math.abs(d)}d overdue`
  if (d === 0) return 'due today'
  return `${d}d left`
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const STATUS_META: Record<ProjectStatus, { label: string; color: string; bg: string; border: string }> = {
  new:              { label: 'New',            color: 'var(--fg)', bg: 'rgb(var(--fg-rgb) / 0.1)',   border: 'rgb(var(--fg-rgb) / 0.25)'  },
  assigned:         { label: 'Assigned',       color: 'var(--fg)', bg: 'rgb(var(--fg-rgb) / 0.1)',  border: 'rgb(var(--fg-rgb) / 0.25)' },
  in_progress:      { label: 'In Progress',    color: 'var(--fg)', bg: 'rgb(var(--fg-rgb) / 0.1)',   border: 'rgb(var(--fg-rgb) / 0.25)'  },
  blocked:          { label: 'Blocked',        color: 'var(--fg)', bg: 'rgb(var(--fg-rgb) / 0.1)',  border: 'rgb(var(--fg-rgb) / 0.25)' },
  pending_approval: { label: 'Pending Review', color: 'var(--fg)', bg: 'rgb(var(--fg-rgb) / 0.1)',   border: 'rgb(var(--fg-rgb) / 0.25)'  },
  completed:        { label: 'Completed',      color: 'var(--fg)', bg: 'rgb(var(--fg-rgb) / 0.1)',   border: 'rgb(var(--fg-rgb) / 0.25)'  },
  delayed:          { label: 'Delayed',        color: 'var(--fg)', bg: 'rgb(var(--fg-rgb) / 0.1)',  border: 'rgb(var(--fg-rgb) / 0.25)' },
}

const PRIORITY_COLOR: Record<ProjectPriority, string> = {
  low: 'var(--fg)', medium: 'var(--fg)', high: 'var(--fg)', critical: 'var(--fg)',
}

function StatusPill({ status }: { status: ProjectStatus }) {
  const m = STATUS_META[status] ?? STATUS_META.new
  return (
    <span style={{ background: m.bg, color: m.color, border: `1px solid ${m.border}`, fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700, padding: '3px 10px', borderRadius: 6, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      {m.label}
    </span>
  )
}

const DOC_TYPES: DocumentType[] = ['deliverable', 'contract', 'report', 'invoice', 'attachment']

const sectionLabel: React.CSSProperties = { fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }
const tag: React.CSSProperties = { fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgb(var(--fg-rgb) / 0.1)', color: 'var(--fg)', textTransform: 'uppercase', whiteSpace: 'nowrap' }
const field: React.CSSProperties = { padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box' }
const smallBtn: React.CSSProperties = { padding: '6px 12px', borderRadius: 8, border: '1px solid rgb(var(--fg-rgb) / 0.3)', background: 'rgb(var(--fg-rgb) / 0.1)', color: 'var(--fg)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }
const iconBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex', borderRadius: 4 }

const card: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  padding: 20,
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const curr = useCurrencySymbol()

  const [project, setProject]   = useState<Project | null>(null)
  const [tasks, setTasks]       = useState<ProjectTask[]>([])
  const [sprints, setSprints]   = useState<ProjectSprint[]>([])
  const [worklogs, setWorklogs] = useState<Worklog[]>([])
  const [loading, setLoading]   = useState(true)
  const [loadError, setLoadError] = useState('')

  // Requests
  const [requests, setRequests]           = useState<ProjectRequest[]>([])
  const [requestsError, setRequestsError] = useState('')
  const [askOpen, setAskOpen]             = useState(false)
  const [askSubject, setAskSubject]       = useState('')
  const [askBody, setAskBody]             = useState('')
  const [asking, setAsking]               = useState(false)
  const [replyDrafts, setReplyDrafts]     = useState<Record<string, string>>({})
  const [resolvingId, setResolvingId]     = useState<string | null>(null)

  // Documents
  const [documents, setDocuments]   = useState<ProjectDocument[]>([])
  const [docsError, setDocsError]   = useState('')
  const [docFile, setDocFile]       = useState<File | null>(null)
  const [docType, setDocType]       = useState<DocumentType>('deliverable')
  const [docStatus, setDocStatus]   = useState<'delivered' | 'in-review'>('delivered')
  const [uploading, setUploading]   = useState(false)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [docBusyId, setDocBusyId]   = useState<string | null>(null)

  const loadRequests = () => projectRequestsApi.list({ projectId: id })
    .then(res => { setRequests(res.data); setRequestsError('') })
    .catch(err => setRequestsError(apiError(err, 'Could not load requests.')))

  const loadDocuments = () => documentsApi.list(id)
    .then(res => { setDocuments(res.data); setDocsError('') })
    .catch(err => setDocsError(apiError(err, 'Could not load documents.')))

  useEffect(() => {
    if (!id) return
    Promise.all([
      projectsApi.getOne(id),
      tasksApi.getByProject(id),
      sprintsApi.getByProject(id),
      worklogsApi.getAll({ projectId: id, limit: 1000 }),
    ]).then(([pRes, tRes, sRes, wRes]) => {
      setProject(pRes.data)
      const tData = tRes.data
      setTasks(Array.isArray(tData) ? tData : tData?.data ?? [])
      setSprints(Array.isArray(sRes.data) ? sRes.data : [])
      const wData = wRes.data?.data ?? wRes.data ?? []
      setWorklogs(Array.isArray(wData) ? wData : [])
    }).catch(err => setLoadError(apiError(err, 'Could not load this project.')))
      .finally(() => setLoading(false))
    loadRequests()
    loadDocuments()
  }, [id]) // eslint-disable-line

  // Refresh tasks so timers a freelancer starts or stops show up without a reload
  useEffect(() => {
    if (!id) return
    const t = setInterval(() => {
      tasksApi.getByProject(id)
        .then(res => setTasks(Array.isArray(res.data) ? res.data : res.data?.data ?? []))
        .catch(() => {}) // keep the last list; the next refresh retries
    }, 30000)
    return () => clearInterval(t)
  }, [id])

  const handleAskClient = async () => {
    if (!askSubject.trim() || !askBody.trim()) return
    setAsking(true)
    setRequestsError('')
    try {
      await projectRequestsApi.create({ projectId: id, kind: 'question', subject: askSubject.trim(), body: askBody.trim() })
      setAskSubject(''); setAskBody(''); setAskOpen(false)
      await loadRequests()
    } catch (err) {
      setRequestsError(apiError(err, 'Could not send the question.'))
    }
    setAsking(false)
  }

  const handleResolve = async (requestId: string) => {
    setResolvingId(requestId)
    setRequestsError('')
    try {
      await projectRequestsApi.resolve(requestId, replyDrafts[requestId]?.trim() || undefined)
      setReplyDrafts(d => { const next = { ...d }; delete next[requestId]; return next })
      await loadRequests()
    } catch (err) {
      setRequestsError(apiError(err, 'Could not resolve the request.'))
    }
    setResolvingId(null)
  }

  const handleUpload = async () => {
    if (!docFile) return
    setUploading(true)
    setDocsError('')
    try {
      await documentsApi.upload(id, docFile, { type: docType, status: docStatus })
      setDocFile(null)
      setFileInputKey(k => k + 1)
      await loadDocuments()
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      setDocsError(status === 413 ? 'File is over the 10 MB limit.' : apiError(err, 'Could not upload the file.'))
    }
    setUploading(false)
  }

  const handleDownload = async (doc: ProjectDocument) => {
    setDocBusyId(doc.id)
    setDocsError('')
    try {
      await documentsApi.download(doc.id, doc.name)
    } catch (err) {
      setDocsError(apiError(err, 'Could not download the file.'))
    }
    setDocBusyId(null)
  }

  const handleToggleDocStatus = async (doc: ProjectDocument) => {
    setDocBusyId(doc.id)
    setDocsError('')
    try {
      const res = await documentsApi.update(doc.id, { status: doc.status === 'delivered' ? 'in-review' : 'delivered' })
      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, ...res.data } : d))
    } catch (err) {
      setDocsError(apiError(err, 'Could not update the document.'))
    }
    setDocBusyId(null)
  }

  const handleDeleteDoc = async (doc: ProjectDocument) => {
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return
    setDocBusyId(doc.id)
    setDocsError('')
    try {
      await documentsApi.delete(doc.id)
      setDocuments(prev => prev.filter(d => d.id !== doc.id))
    } catch (err) {
      setDocsError(apiError(err, 'Could not delete the document.'))
    }
    setDocBusyId(null)
  }

  if (loading) return (
    <DashboardLayout allowedRoles={['admin']}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
        <div style={{ width: 28, height: 28, border: '3px solid rgb(var(--fg-rgb) / 0.2)', borderTopColor: 'var(--fg)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>LOADING PROJECT...</span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </DashboardLayout>
  )

  if (!project) return (
    <DashboardLayout allowedRoles={['admin']}>
      {loadError
        ? <ErrorBanner title="Could not load project" message={loadError} />
        : <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Project not found.</div>}
    </DashboardLayout>
  )

  // ── Derived ──────────────────────────────────────────────────────────────────

  const sm          = STATUS_META[project.status] ?? STATUS_META.new
  const overdue     = new Date(project.deadline) < new Date() && project.status !== 'completed'
  const totalHours  = worklogs.reduce((s, w) => s + Number(w.hoursWorked), 0)
  const blockerLogs = worklogs.filter(w => w.blockers?.trim())
  const openTasks   = tasks.filter(t => !t.completed)
  const doneTasks   = tasks.filter(t => t.completed)

  // Group tasks by sprint
  const sprintMap: Record<string, { name: string; startDate?: string | null; endDate?: string | null; tasks: ProjectTask[] }> = {}
  tasks.forEach(t => {
    const key = t.sprintId ?? '__backlog'
    if (!sprintMap[key]) sprintMap[key] = {
      name: t.sprint?.name ?? 'Backlog',
      startDate: t.sprint?.startDate,
      endDate: t.sprint?.endDate,
      tasks: [],
    }
    sprintMap[key].tasks.push(t)
  })

  // Team members (deduplicated)
  const teamMap: Record<string, { id: string; name: string; email: string; role?: string }> = {}
  if (project.assignedFreelancer?.user) {
    const u = project.assignedFreelancer.user
    teamMap[u.id] = { id: project.assignedFreelancer.id, name: u.name, email: u.email, role: 'Lead' }
  }
  project.teamMembers?.forEach(m => {
    if (m.user && !teamMap[m.user.id]) {
      teamMap[m.user.id] = { id: m.id, name: m.user.name, email: m.user.email }
    }
  })
  const team = Object.values(teamMap)

  const sortedLogs = [...worklogs].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <DashboardLayout allowedRoles={['admin']}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Back */}
      <button onClick={() => router.back()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)', marginBottom: 20, padding: 0 }}>
        <ArrowLeft size={13} /> BACK
      </button>

      {/* ── TWO-COLUMN LAYOUT ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>

        {/* ═══════════════════════════════════════════
            LEFT — Project info + team + links
        ═══════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 24 }}>

          {/* Project identity card */}
          <div style={{ ...card, borderLeft: `4px solid ${sm.color}` }}>
            <div style={{ marginBottom: 14 }}>
              <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 10px' }}>{project.title}</h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                <StatusPill status={project.status} />
                {project.priority && (
                  <span style={{ background: `color-mix(in srgb, ${PRIORITY_COLOR[project.priority]} 8%, transparent)`, color: PRIORITY_COLOR[project.priority], border: `1px solid color-mix(in srgb, ${PRIORITY_COLOR[project.priority]} 21%, transparent)`, fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700, padding: '3px 10px', borderRadius: 6, letterSpacing: '0.08em' }}>
                    {project.priority.toUpperCase()}
                  </span>
                )}
              </div>
              {project.description && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>{project.description}</p>
              )}
            </div>

            {/* Progress */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Progress</span>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}>{project.progress ?? 0}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 99, background: project.status === 'blocked' ? 'var(--fg)' : project.status === 'completed' ? 'var(--fg)' : 'var(--fg)', width: `${project.progress ?? 0}%`, transition: 'width 0.4s' }} />
              </div>
            </div>

            {/* Key stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { icon: <DollarSign size={13} />, label: 'Budget',   value: `${curr}${Number(project.budget).toLocaleString()}`, color: 'var(--fg)' },
                { icon: <Calendar size={13} />,   label: 'Deadline', value: fmtDate(project.deadline), color: overdue ? 'var(--fg)' : 'var(--text-primary)', extra: overdue ? ' ⚠' : '' },
                { icon: <Activity size={13} />,   label: 'Timeline', value: daysLeft(project.deadline), color: overdue ? 'var(--fg)' : 'var(--fg)' },
                { icon: <Clock size={13} />,       label: 'Hours Logged', value: `${totalHours}h`, color: 'var(--fg)' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                  <span style={{ color: 'var(--fg)', flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flex: 1, textTransform: 'uppercase' }}>{item.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: item.color, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{item.value}{item.extra}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Client card */}
          {project.client && (
            <div style={card}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Client</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'var(--bg)', flexShrink: 0 }}>
                  {getInitials(project.client.name)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{project.client.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{project.client.email}</div>
                </div>
              </div>
            </div>
          )}

          {/* Team card */}
          {team.length > 0 && (
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Users size={13} style={{ color: 'var(--fg)' }} />
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Team ({team.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {team.map(m => (
                  <Link key={m.id} href={`/admin/freelancers/${m.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 8, textDecoration: 'none', border: '1px solid transparent', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--fg)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'var(--bg)', flexShrink: 0 }}>
                      {getInitials(m.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {m.name}
                        {m.role && <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--fg)', background: 'rgb(var(--fg-rgb) / 0.1)', padding: '1px 6px', borderRadius: 4 }}>{m.role.toUpperCase()}</span>}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
                    </div>
                    <ChevronRight size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Links card */}
          {(project.repoUrl || project.liveUrl || project.correctionSheetUrl) && (
            <div style={card}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Links</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {project.repoUrl && (
                  <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 8, textDecoration: 'none', color: 'var(--fg)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                    <Code2 size={13} /> Repository <ExternalLink size={11} style={{ marginLeft: 'auto' }} />
                  </a>
                )}
                {project.liveUrl && (
                  <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 8, textDecoration: 'none', color: 'var(--fg)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                    <Globe size={13} /> Live URL <ExternalLink size={11} style={{ marginLeft: 'auto' }} />
                  </a>
                )}
                {project.correctionSheetUrl && (
                  <a href={project.correctionSheetUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 8, textDecoration: 'none', color: 'var(--fg)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                    <FileSpreadsheet size={13} /> Correction Sheet <ExternalLink size={11} style={{ marginLeft: 'auto' }} />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Edit button */}
          <Link href={`/admin/projects?edit=${project.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 10, border: '1px solid rgb(var(--fg-rgb) / 0.3)', background: 'rgb(var(--fg-rgb) / 0.06)', color: 'var(--fg)', fontSize: 12, fontFamily: 'var(--font-mono)', textDecoration: 'none', letterSpacing: '0.08em' }}>
            <Pencil size={13} /> EDIT IN PROJECT MANAGER
          </Link>
        </div>

        {/* ═══════════════════════════════════════════
            RIGHT — Stats + Tasks + Worklogs
        ═══════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Activity summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { label: 'Total Tasks',  value: tasks.length,          color: 'var(--fg)',  sub: 'assigned' },
              { label: 'Completed',    value: doneTasks.length,       color: 'var(--fg)',  sub: `${tasks.length ? Math.round(doneTasks.length / tasks.length * 100) : 0}% done` },
              { label: 'Open',         value: openTasks.length,       color: 'var(--fg)',  sub: 'remaining' },
              { label: 'Blockers',     value: blockerLogs.length,     color: blockerLogs.length > 0 ? 'var(--fg)' : 'var(--fg)', sub: blockerLogs.length > 0 ? 'needs attention' : 'all clear' },
            ].map(item => (
              <div key={item.label} style={{ ...card, padding: '14px 16px' }}>
                <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: item.color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{item.value}</div>
                <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 4 }}>{item.sub}</div>
              </div>
            ))}
          </div>

          {/* Blockers */}
          {blockerLogs.length > 0 && (
            <div style={{ ...card, borderColor: 'rgb(var(--fg-rgb) / 0.3)', background: 'rgb(var(--fg-rgb) / 0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <AlertTriangle size={14} style={{ color: 'var(--fg)' }} />
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--fg)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Blockers & Escalations ({blockerLogs.length})
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {blockerLogs.map(w => {
                  const member = team.find(m => {
                    const fl = project.teamMembers?.find(tm => tm.id === w.freelancerId)
                    return fl?.user?.id === m.id || m.id === w.freelancerId
                  })
                  return (
                    <div key={w.id} style={{ display: 'flex', gap: 14, padding: '12px 14px', background: 'rgb(var(--fg-rgb) / 0.06)', border: '1px solid rgb(var(--fg-rgb) / 0.18)', borderRadius: 10 }}>
                      <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 52 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>{fmtShort(w.date)}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{daysAgo(w.date)}</div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--fg)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>{w.hoursWorked}h</div>
                      </div>
                      <div style={{ width: 1, background: 'rgb(var(--fg-rgb) / 0.2)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {w.freelancer?.user && (
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{w.freelancer.user.name}</div>
                        )}
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>{w.blockers}</p>
                        {w.nextSteps && (
                          <p style={{ fontSize: 11, color: 'var(--fg)', margin: '6px 0 0', fontFamily: 'var(--font-mono)' }}>→ {w.nextSteps}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div style={card}>
            <SprintTaskBoard projectId={id} team={team} tasks={tasks} setTasks={setTasks} sprints={sprints} setSprints={setSprints} />
          </div>

          <div style={card}>
            <ProjectLinks projectId={id} liveUrl={project.liveUrl ?? null} />
          </div>

          {/* Requests */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <MessageSquare size={14} style={{ color: 'var(--fg)' }} />
              <span style={sectionLabel}>Requests ({requests.length})</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}>{requests.filter(r => r.status === 'open').length} open</span>
              <button onClick={() => setAskOpen(o => !o)} style={smallBtn}>
                {askOpen ? <><X size={12} /> Cancel</> : <><Plus size={12} /> Ask client</>}
              </button>
            </div>

            {requestsError && <div style={{ marginBottom: 12 }}><ErrorBanner message={requestsError} onClose={() => setRequestsError('')} /></div>}

            {askOpen && (
              <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid rgb(var(--fg-rgb) / 0.15)', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.18em', margin: 0 }}>QUESTION FOR THE CLIENT</p>
                <input style={{ ...field, width: '100%' }} placeholder="Subject" value={askSubject}
                  onChange={e => setAskSubject(e.target.value)} disabled={asking} />
                <textarea style={{ ...field, width: '100%', resize: 'vertical' }} rows={3} placeholder="What do you need from the client?"
                  value={askBody} onChange={e => setAskBody(e.target.value)} disabled={asking} />
                <div>
                  <button onClick={handleAskClient} disabled={!askSubject.trim() || !askBody.trim() || asking}
                    style={{ ...smallBtn, opacity: !askSubject.trim() || !askBody.trim() || asking ? 0.4 : 1 }}>
                    <Send size={12} /> {asking ? 'Sending…' : 'Send question'}
                  </button>
                </div>
              </div>
            )}

            {requests.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>No requests yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {requests.map(r => {
                  const canResolve = r.status === 'open' && (r.kind === 'change' || r.kind === 'escalation')
                  return (
                    <div key={r.id} style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--bg-elevated)', border: `1px solid ${r.status === 'open' ? 'rgb(var(--fg-rgb) / 0.2)' : 'var(--border)'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                        <span style={tag}>{r.kind}</span>
                        {r.urgency !== 'normal' && <span style={tag}>{r.urgency}</span>}
                        <span style={{ ...tag, background: r.status === 'open' ? 'rgb(var(--fg-rgb) / 0.1)' : 'transparent', color: r.status === 'open' ? 'var(--fg)' : 'var(--text-muted)', border: '1px solid var(--border)' }}>{r.status}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{r.subject}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {r.fromUser?.name ?? 'Unknown'} · {fmtShort(r.createdAt)}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{r.body}</p>
                      {r.reply && (
                        <p style={{ fontSize: 12, color: 'var(--fg)', margin: '8px 0 0', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap' }}>→ {r.reply}</p>
                      )}
                      {r.status === 'resolved' && !r.reply && r.resolvedAt && (
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '8px 0 0', fontFamily: 'var(--font-mono)' }}>Resolved {fmtShort(r.resolvedAt)}</p>
                      )}
                      {r.status === 'open' && r.kind === 'question' && (
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '8px 0 0', fontFamily: 'var(--font-mono)' }}>Waiting for the client to answer</p>
                      )}
                      {canResolve && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <input style={{ ...field, flex: 1 }} placeholder="Reply (optional)"
                            value={replyDrafts[r.id] ?? ''}
                            onChange={e => setReplyDrafts(d => ({ ...d, [r.id]: e.target.value }))}
                            disabled={resolvingId === r.id} />
                          <button onClick={() => handleResolve(r.id)} disabled={resolvingId === r.id}
                            style={{ ...smallBtn, opacity: resolvingId === r.id ? 0.4 : 1 }}>
                            <CheckCircle2 size={12} /> {resolvingId === r.id ? 'Resolving…' : 'Resolve'}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Documents */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <FileText size={14} style={{ color: 'var(--fg)' }} />
              <span style={sectionLabel}>Documents ({documents.length})</span>
            </div>

            {docsError && <div style={{ marginBottom: 12 }}><ErrorBanner message={docsError} onClose={() => setDocsError('')} /></div>}

            {documents.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>No documents yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                {documents.map(d => {
                  const busy = docBusyId === d.id
                  return (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--bg-elevated)', opacity: busy ? 0.6 : 1 }}>
                      <FileText size={14} style={{ color: 'var(--fg)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                        <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {formatBytes(d.size)} · {d.uploadedBy?.name ?? 'Unknown'} · {fmtShort(d.createdAt)}
                        </div>
                      </div>
                      <span style={tag}>{d.type}</span>
                      <button onClick={() => handleToggleDocStatus(d)} disabled={busy} title="Toggle delivered / in review"
                        style={{ ...tag, border: '1px solid rgb(var(--fg-rgb) / 0.3)', cursor: 'pointer' }}>
                        {d.status === 'delivered' ? 'Delivered' : 'In review'}
                      </button>
                      <button onClick={() => handleDownload(d)} disabled={busy} title="Download" style={iconBtn}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                        <Download size={13} />
                      </button>
                      <button onClick={() => handleDeleteDoc(d)} disabled={busy} title="Delete" style={iconBtn}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Upload */}
            <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid rgb(var(--fg-rgb) / 0.15)' }}>
              <p style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.18em', marginBottom: 8 }}>UPLOAD DOCUMENT · MAX 10 MB</p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input key={fileInputKey} type="file" onChange={e => setDocFile(e.target.files?.[0] ?? null)} disabled={uploading}
                  style={{ ...field, flex: 1, minWidth: 180, padding: '5px 10px', fontSize: 12 }} />
                <select value={docType} onChange={e => setDocType(e.target.value as DocumentType)} disabled={uploading}
                  style={{ ...field, fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                  {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={docStatus} onChange={e => setDocStatus(e.target.value as 'delivered' | 'in-review')} disabled={uploading}
                  style={{ ...field, fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                  <option value="delivered">delivered</option>
                  <option value="in-review">in review</option>
                </select>
                <button onClick={handleUpload} disabled={!docFile || uploading}
                  style={{ ...smallBtn, opacity: !docFile || uploading ? 0.4 : 1 }}>
                  <Upload size={12} /> {uploading ? 'Uploading…' : 'Upload'}
                </button>
              </div>
            </div>
          </div>

          {/* Work Logs */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Clock size={14} style={{ color: 'var(--fg)' }} />
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Work Logs ({worklogs.length} · {totalHours}h total)
              </span>
            </div>
            {sortedLogs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>No worklogs yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {sortedLogs.slice(0, 10).map((w, i) => {
                  const hasBlocker = !!w.blockers?.trim()
                  const freelancerName = w.freelancer?.user?.name
                  return (
                    <div key={w.id} style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: i < Math.min(sortedLogs.length, 10) - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ flexShrink: 0, width: 74, textAlign: 'right' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{fmtShort(w.date)}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}>{w.hoursWorked}h</div>
                      </div>
                      <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          {freelancerName && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{freelancerName}</span>}
                          {hasBlocker && <span style={{ background: 'rgb(var(--fg-rgb) / 0.1)', color: 'var(--fg)', fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, padding: '1px 6px', borderRadius: 4 }}>BLOCKER</span>}
                          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginLeft: 'auto' }}>Progress: {w.progress}%</span>
                        </div>
                        {w.tasksCompleted && <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{w.tasksCompleted}</p>}
                        {hasBlocker && <p style={{ fontSize: 11, color: 'var(--fg)', margin: '4px 0 0', lineHeight: 1.4, fontStyle: 'italic' }}>⚠ {w.blockers}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
        {/* end right column */}
      </div>
    </DashboardLayout>
  )
}
