'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { projectsApi, projectRequestsApi, documentsApi } from '@/lib/api'
import { Project, ProjectStatus, ProjectRequest, ProjectDocument, DocumentType } from '@/lib/types'
import { AlertTriangle, X, Calendar, DollarSign, TrendingUp, User, Download, Trash2, Upload, MessageSquare, FileText } from 'lucide-react'
import { useAuthStore, useCurrencySymbol } from '@/lib/store'
import { apiError, formatBytes } from '@/lib/utils'
import ErrorBanner from '@/components/ui/ErrorBanner'

const STATUS_FILTERS: { label: string; value: 'all' | ProjectStatus }[] = [
  { label: 'All', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Blocked', value: 'blocked' },
  { label: 'Pending', value: 'pending_approval' },
  { label: 'Completed', value: 'completed' },
  { label: 'Delayed', value: 'delayed' },
]

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

const DOC_TYPES: DocumentType[] = ['deliverable', 'report', 'contract', 'invoice', 'attachment']
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

function uploadError(err: unknown) {
  if ((err as { response?: { status?: number } })?.response?.status === 413) {
    return 'That file is larger than the 10 MB upload limit.'
  }
  return apiError(err, 'Could not upload the file.')
}

const sectionTitle = 'text-mono-label text-[10px] mb-2 flex items-center gap-1.5'
const rowStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--border)' }

// Questions to the client and the client's change requests for one project
function ProjectRequests({ projectId }: { projectId: string }) {
  const [requests, setRequests] = useState<ProjectRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [asking, setAsking] = useState(false)
  const [replies, setReplies] = useState<Record<string, string>>({})
  const [resolving, setResolving] = useState<string | null>(null)

  useEffect(() => {
    projectRequestsApi.list({ projectId })
      .then(res => setRequests(res.data ?? []))
      .catch(err => setError(apiError(err, 'Could not load questions and change requests.')))
      .finally(() => setLoading(false))
  }, [projectId])

  async function ask(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !body.trim()) return
    setAsking(true); setError('')
    try {
      const res = await projectRequestsApi.create({ projectId, kind: 'question', subject: subject.trim(), body: body.trim() })
      setRequests(rs => [res.data as ProjectRequest, ...rs])
      setSubject(''); setBody('')
    } catch (err) {
      setError(apiError(err, 'Could not send your question.'))
    } finally {
      setAsking(false)
    }
  }

  async function resolve(id: string) {
    setResolving(id); setError('')
    try {
      const res = await projectRequestsApi.resolve(id, replies[id]?.trim() || undefined)
      const updated = res.data as ProjectRequest
      setRequests(rs => rs.map(r => r.id === id ? { ...r, ...updated } : r))
    } catch (err) {
      setError(apiError(err, 'Could not resolve the request.'))
    } finally {
      setResolving(null)
    }
  }

  return (
    <div>
      <p className={sectionTitle}><MessageSquare size={11} /> QUESTIONS &amp; CHANGE REQUESTS</p>
      {error && <div className="mb-2"><ErrorBanner message={error} onClose={() => setError('')} /></div>}
      {loading ? (
        <div className="h-12 bg-[var(--input-bg)] rounded animate-pulse" />
      ) : requests.length === 0 ? (
        <p className="text-mono-label text-[10px] text-[var(--text-muted)] py-2">NO QUESTIONS OR CHANGE REQUESTS YET</p>
      ) : (
        <ul className="space-y-2">
          {requests.map(r => (
            <li key={r.id} className="rounded p-3 space-y-1.5" style={rowStyle}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-primary-ui text-sm font-semibold truncate">{r.subject}</p>
                <span className="text-mono-label text-[10px] shrink-0" style={{ color: r.status === 'open' ? 'var(--fg)' : 'var(--text-muted)' }}>
                  {r.kind.toUpperCase()} · {r.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{r.body}</p>
              <p className="text-mono-label text-[10px] text-[var(--text-muted)]">
                {r.fromUser?.name ?? 'Unknown'} · {fmtDate(r.createdAt)}
              </p>
              {r.reply && (
                <p className="text-xs pl-2" style={{ color: 'var(--text-secondary)', borderLeft: '2px solid rgb(var(--fg-rgb) / 0.3)' }}>
                  {r.reply}
                </p>
              )}
              {r.kind === 'change' && r.status === 'open' && (
                <div className="flex gap-2 pt-1">
                  <input className="input-field text-xs py-1.5 flex-1" placeholder="Reply (optional)"
                    value={replies[r.id] ?? ''}
                    onChange={e => setReplies(m => ({ ...m, [r.id]: e.target.value }))} />
                  <button type="button" onClick={() => resolve(r.id)} disabled={resolving === r.id}
                    className="btn-primary text-xs px-3 py-1.5 rounded disabled:opacity-50">
                    {resolving === r.id ? 'RESOLVING…' : 'RESOLVE'}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={ask} className="space-y-2 mt-3">
        <input className="input-field text-sm" placeholder="Question for the client" value={subject}
          onChange={e => setSubject(e.target.value)} />
        <textarea className="input-field text-sm" rows={2} placeholder="Details" value={body}
          onChange={e => setBody(e.target.value)} />
        <button type="submit" disabled={asking || !subject.trim() || !body.trim()}
          className="btn-ghost text-xs px-4 py-2 rounded disabled:opacity-50">
          {asking ? 'SENDING…' : 'ASK CLIENT'}
        </button>
      </form>
    </div>
  )
}

// Files on one project: list, download, upload, delete your own
function ProjectDocuments({ projectId }: { projectId: string }) {
  const { user } = useAuthStore()
  const [docs, setDocs] = useState<ProjectDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [type, setType] = useState<DocumentType>('deliverable')
  const [uploading, setUploading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [inputKey, setInputKey] = useState(0)

  useEffect(() => {
    documentsApi.list(projectId)
      .then(res => setDocs(res.data ?? []))
      .catch(err => setError(apiError(err, 'Could not load documents.')))
      .finally(() => setLoading(false))
  }, [projectId])

  async function upload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    if (file.size > MAX_UPLOAD_BYTES) { setError('That file is larger than the 10 MB upload limit.'); return }
    setUploading(true); setError('')
    try {
      const res = await documentsApi.upload(projectId, file, { type })
      setDocs(ds => [res.data as ProjectDocument, ...ds])
      setFile(null); setInputKey(k => k + 1)
    } catch (err) {
      setError(uploadError(err))
    } finally {
      setUploading(false)
    }
  }

  async function download(d: ProjectDocument) {
    setBusyId(d.id); setError('')
    try {
      await documentsApi.download(d.id, d.name)
    } catch (err) {
      setError(apiError(err, 'Could not download the file.'))
    } finally {
      setBusyId(null)
    }
  }

  async function remove(d: ProjectDocument) {
    if (!confirm(`Delete ${d.name}?`)) return
    setBusyId(d.id); setError('')
    try {
      await documentsApi.delete(d.id)
      setDocs(ds => ds.filter(x => x.id !== d.id))
    } catch (err) {
      setError(apiError(err, 'Could not delete the file.'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <p className={sectionTitle}><FileText size={11} /> DOCUMENTS</p>
      {error && <div className="mb-2"><ErrorBanner message={error} onClose={() => setError('')} /></div>}
      {loading ? (
        <div className="h-12 bg-[var(--input-bg)] rounded animate-pulse" />
      ) : docs.length === 0 ? (
        <p className="text-mono-label text-[10px] text-[var(--text-muted)] py-2">NO DOCUMENTS YET</p>
      ) : (
        <ul className="space-y-2">
          {docs.map(d => (
            <li key={d.id} className="rounded p-3 flex items-center gap-3" style={rowStyle}>
              <div className="flex-1 min-w-0">
                <p className="text-primary-ui text-sm font-semibold truncate">{d.name}</p>
                <p className="text-mono-label text-[10px] text-[var(--text-muted)]">
                  {d.type.toUpperCase()} · {formatBytes(d.size)} · {d.uploadedBy?.name ?? 'Unknown'} · {fmtDate(d.createdAt)}
                </p>
              </div>
              <button type="button" onClick={() => download(d)} disabled={busyId === d.id} aria-label={`Download ${d.name}`}
                className="text-[var(--text-muted)] hover:text-primary-ui transition-colors disabled:opacity-50">
                <Download size={15} />
              </button>
              {d.uploadedById === user?.id && (
                <button type="button" onClick={() => remove(d)} disabled={busyId === d.id} aria-label={`Delete ${d.name}`}
                  className="text-[var(--text-muted)] hover:text-primary-ui transition-colors disabled:opacity-50">
                  <Trash2 size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={upload} className="flex flex-wrap items-center gap-2 mt-3">
        <input key={inputKey} type="file" className="text-xs flex-1 min-w-0" style={{ color: 'var(--text-secondary)' }}
          onChange={e => setFile(e.target.files?.[0] ?? null)} />
        <select className="input-field text-xs py-1.5 w-auto" value={type} onChange={e => setType(e.target.value as DocumentType)}>
          {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button type="submit" disabled={!file || uploading}
          className="btn-ghost text-xs px-4 py-2 rounded flex items-center gap-1.5 disabled:opacity-50">
          <Upload size={12} /> {uploading ? 'UPLOADING…' : 'UPLOAD'}
        </button>
      </form>
      <p className="text-mono-label text-[10px] text-[var(--text-muted)] mt-1">MAX 10 MB</p>
    </div>
  )
}

export default function FreelancerProjectsPage() {
  const curr = useCurrencySymbol()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | ProjectStatus>('all')
  const [modal, setModal] = useState<Project | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await projectsApi.getAll()
        setProjects(res.data?.data ?? res.data ?? [])
      } catch (err) {
        setError(apiError(err, 'Could not load your projects.'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter)

  return (
    <DashboardLayout allowedRoles={['freelancer']}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-display text-3xl text-gradient">MY PROJECTS</h1>
          <p className="text-mono-label text-[11px] mt-1">{projects.length} TOTAL PROJECTS</p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-1.5 rounded text-mono-label text-[10px] tracking-widest border transition-all ${
                filter === f.value
                  ? 'bg-[var(--fg)] border-[var(--fg)] text-[var(--bg)]'
                  : 'border-[rgb(var(--fg-rgb)/0.2)] text-[var(--text-muted)] hover:border-[var(--fg)] hover:text-primary-ui'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Projects Grid */}
        {error ? (
          <ErrorBanner title="Projects failed to load" message={error} />
        ) : loading ? (
          <div className="grid grid-cols-2 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-card rounded-lg p-5 h-64 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card rounded-lg p-12 text-center">
            <p className="text-mono-label">{projects.length === 0 ? 'NO PROJECTS ASSIGNED TO YOU YET' : 'NO PROJECTS FOUND'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5">
            {filtered.map((p) => {
              const days = daysUntil(p.deadline)
              const nearDeadline = days >= 0 && days <= 7
              const overdue = days < 0
              return (
                <div key={p.id} className="glass-card rounded-lg p-5 flex flex-col gap-3 hover:border-[var(--fg)] transition-all">
                  {/* Title + status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-primary-ui font-bold text-base leading-tight truncate">{p.title}</h3>
                      <p className="text-mono-label text-[10px] mt-0.5 text-[var(--text-muted)] flex items-center gap-1">
                        <User size={10} />
                        {p.client?.name ?? 'Client'}
                      </p>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>

                  {/* Description */}
                  <p className="text-[var(--track-bg)] text-sm line-clamp-2 leading-relaxed">{p.description}</p>

                  {/* Deadline */}
                  <div className={`flex items-center gap-1.5 text-mono-label text-[10px] ${overdue ? 'text-[var(--fg)]' : nearDeadline ? 'text-[var(--fg)]' : 'text-[var(--text-muted)]'}`}>
                    {(overdue || nearDeadline) && <AlertTriangle size={11} />}
                    <Calendar size={10} />
                    {overdue
                      ? `OVERDUE BY ${Math.abs(days)} DAYS`
                      : nearDeadline
                      ? `DUE IN ${days} DAY${days === 1 ? '' : 'S'}`
                      : `DUE ${fmtDate(p.deadline)}`}
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-mono-label text-[10px]">PROGRESS</span>
                      <span className="text-mono-label text-[10px] text-[var(--fg)]">{p.progress}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${p.progress}%` }} />
                    </div>
                  </div>

                  {/* Budget */}
                  <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-mono-label text-[10px]">
                    <DollarSign size={11} />
                    BUDGET: <span className="text-primary-ui font-semibold">{curr}{Number(p.budget).toLocaleString()}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1 mt-auto">
                    <Link href="/freelancer/worklogs" className="flex-1">
                      <button className="btn-primary w-full text-xs py-2 px-3 rounded">Log Work</button>
                    </Link>
                    <button
                      onClick={() => setModal(p)}
                      className="btn-ghost flex-1 text-xs py-2 px-3 rounded"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgb(var(--bg-rgb) / 0.85)' }}
          onClick={() => setModal(null)}
        >
          <div
            className="glass-card rounded-xl p-6 max-w-2xl w-full space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-display text-xl text-primary-ui">{modal.title}</h2>
                <p className="text-mono-label text-[10px] mt-1">{modal.client?.name ?? 'CLIENT'}</p>
              </div>
              <button onClick={() => setModal(null)} className="text-[var(--text-muted)] hover:text-primary-ui transition-colors">
                <X size={20} />
              </button>
            </div>

            <p className="text-[var(--track-bg)] text-sm leading-relaxed">{modal.description}</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card-dark rounded p-3">
                <p className="text-mono-label text-[10px] mb-1">STATUS</p>
                <StatusBadge status={modal.status} />
              </div>
              <div className="glass-card-dark rounded p-3">
                <p className="text-mono-label text-[10px] mb-1">PRIORITY</p>
                <p className="text-primary-ui text-sm font-semibold uppercase">{modal.priority}</p>
              </div>
              <div className="glass-card-dark rounded p-3">
                <p className="text-mono-label text-[10px] mb-1">BUDGET</p>
                <p className="text-primary-ui font-semibold">{curr}{Number(modal.budget).toLocaleString()}</p>
              </div>
              <div className="glass-card-dark rounded p-3">
                <p className="text-mono-label text-[10px] mb-1">DEADLINE</p>
                <p className={`text-sm font-semibold ${daysUntil(modal.deadline) < 0 ? 'text-[var(--fg)]' : 'text-primary-ui'}`}>
                  {fmtDate(modal.deadline)}
                </p>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-mono-label text-[10px]">PROGRESS</span>
                <span className="text-mono-label text-[10px] text-[var(--fg)]">{modal.progress}%</span>
              </div>
              <div className="progress-bar h-2">
                <div className="progress-fill" style={{ width: `${modal.progress}%` }} />
              </div>
            </div>

            <ProjectRequests key={`r-${modal.id}`} projectId={modal.id} />
            <ProjectDocuments key={`d-${modal.id}`} projectId={modal.id} />

            <div className="flex gap-3 pt-2">
              <Link href="/freelancer/worklogs" className="flex-1">
                <button className="btn-primary w-full text-xs py-2.5 rounded">LOG WORK</button>
              </Link>
              <button onClick={() => setModal(null)} className="btn-ghost flex-1 text-xs py-2.5 rounded">CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
