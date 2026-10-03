'use client'

import { useEffect, useRef, useState } from 'react'
import {
  FileText, Download, Eye, FolderOpen,
  CheckCircle2, Clock, FileCheck, Package,
  Search, Filter, X, Paperclip, Upload,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import ErrorBanner from '@/components/ui/ErrorBanner'
import { documentsApi, projectsApi } from '@/lib/api'
import { DocumentType, Project, ProjectDocument } from '@/lib/types'
import { apiError, formatBytes } from '@/lib/utils'

type DocStatus = ProjectDocument['status']
type DocType = DocumentType

const TYPE_META: Record<DocType, { icon: typeof FileText; color: string; label: string }> = {
  deliverable: { icon: Package, color: 'var(--fg)', label: 'Deliverable' },
  contract:    { icon: FileCheck, color: 'var(--fg)', label: 'Contract' },
  report:      { icon: FileText, color: 'var(--fg)', label: 'Report' },
  invoice:     { icon: FileText, color: 'var(--fg)', label: 'Invoice' },
  attachment:  { icon: Paperclip, color: 'var(--fg)', label: 'Attachment' },
}

const STATUS_META: Record<DocStatus, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  delivered:  { icon: CheckCircle2, color: 'var(--fg)', bg: 'rgb(var(--fg-rgb) / 0.1)',   label: 'Delivered' },
  'in-review':{ icon: Clock,        color: 'var(--fg)', bg: 'rgb(var(--fg-rgb) / 0.1)',  label: 'In Review' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

export default function ClientDocumentsPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<DocType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<DocStatus | 'all'>('all')
  const [preview, setPreview] = useState<ProjectDocument | null>(null)
  const [docs, setDocs] = useState<ProjectDocument[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [uploadProject, setUploadProject] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadDocs = () => documentsApi.list()
    .then(res => { setDocs(res.data ?? []); setError('') })
    .catch(err => setError(apiError(err, 'Could not load documents.')))

  useEffect(() => {
    loadDocs().finally(() => setLoading(false))
    projectsApi.getAll()
      .then(r => {
        const list: Project[] = r.data?.data ?? r.data ?? []
        setProjects(list)
        if (list.length) setUploadProject(list[0].id)
      })
      .catch(err => setActionError(apiError(err, 'Could not load your projects for uploading.')))
  }, [])

  async function handleUpload(file: File | undefined) {
    if (!file || !uploadProject) return
    setUploading(true); setActionError('')
    try {
      await documentsApi.upload(uploadProject, file)
      await loadDocs()
    } catch (err) {
      setActionError(apiError(err, 'Upload failed.'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDownload(doc: ProjectDocument) {
    setActionError('')
    try {
      await documentsApi.download(doc.id, doc.name)
    } catch (err) {
      setActionError(apiError(err, 'Download failed.'))
    }
  }

  const filtered = docs.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.project?.title ?? '').toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || d.type === typeFilter
    const matchStatus = statusFilter === 'all' || d.status === statusFilter
    return matchSearch && matchType && matchStatus
  })

  const counts = {
    total: docs.length,
    delivered: docs.filter(d => d.status === 'delivered').length,
    inReview: docs.filter(d => d.status === 'in-review').length,
    attachments: docs.filter(d => d.type === 'attachment').length,
  }

  return (
    <DashboardLayout allowedRoles={['client']}>
      <div className="flex flex-col gap-5 h-full">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-primary-ui text-xl font-bold">Documents</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Deliverables, contracts, reports and invoices from your projects
            </p>
          </div>
          {projects.length > 0 && (
            <div className="flex items-center gap-2">
              <select className="input-field py-2 text-sm" value={uploadProject} onChange={e => setUploadProject(e.target.value)}>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
              <input ref={fileRef} type="file" className="hidden" onChange={e => handleUpload(e.target.files?.[0])} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading || !uploadProject}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 whitespace-nowrap"
                style={{ background: 'rgb(var(--fg-rgb) / 0.12)', border: '1px solid rgb(var(--fg-rgb) / 0.25)', color: 'var(--fg)' }}>
                <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload File'}
              </button>
            </div>
          )}
        </div>

        <ErrorBanner title="Could not load documents" message={error} />
        {actionError && <ErrorBanner message={actionError} onClose={() => setActionError('')} />}

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Files', val: counts.total, color: 'var(--fg)', icon: FolderOpen },
            { label: 'Delivered', val: counts.delivered, color: 'var(--fg)', icon: CheckCircle2 },
            { label: 'In QA Review', val: counts.inReview, color: 'var(--fg)', icon: Clock },
            { label: 'Your Attachments', val: counts.attachments, color: 'var(--fg)', icon: Paperclip },
          ].map(({ label, val, color, icon: Icon }) => (
            <div key={label} className="glass-card rounded-xl px-4 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `color-mix(in srgb, ${color} 7%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 15%, transparent)` }}>
                <Icon size={15} style={{ color }} />
              </div>
              <div>
                <div className="text-lg font-bold text-primary-ui">{val}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="glass-card rounded-xl p-4 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              className="input-field pl-9 py-2 text-sm w-full"
              placeholder="Search documents…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={12} style={{ color: 'var(--text-muted)' }} />
            {(['all', 'deliverable', 'contract', 'report', 'invoice', 'attachment'] as const).map(t => (
              <button key={t}
                onClick={() => setTypeFilter(t)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                style={{
                  background: typeFilter === t ? 'rgb(var(--fg-rgb) / 0.15)' : 'var(--input-bg)',
                  border: `1px solid ${typeFilter === t ? 'rgb(var(--fg-rgb) / 0.4)' : 'var(--input-bg)'}`,
                  color: typeFilter === t ? 'var(--fg)' : 'var(--text-muted)',
                }}>
                {t === 'all' ? 'All Types' : t}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {(['all', 'delivered', 'in-review'] as const).map(s => (
              <button key={s}
                onClick={() => setStatusFilter(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: statusFilter === s ? 'rgb(var(--fg-rgb) / 0.12)' : 'var(--input-bg)',
                  border: `1px solid ${statusFilter === s ? 'rgb(var(--fg-rgb) / 0.3)' : 'var(--input-bg)'}`,
                  color: statusFilter === s ? 'var(--fg)' : 'var(--text-muted)',
                }}>
                {s === 'all' ? 'All Status' : s === 'in-review' ? 'In Review' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Document list */}
        <div className="glass-card rounded-xl overflow-hidden flex-1 flex flex-col">
          <div className="grid text-xs font-semibold px-5 py-3 border-b border-[var(--input-bg)]"
            style={{ gridTemplateColumns: '2.5fr 1.5fr 1fr 1fr 80px 80px', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
            <span>DOCUMENT</span>
            <span>PROJECT</span>
            <span>TYPE</span>
            <span>STATUS</span>
            <span>SIZE</span>
            <span>DATE</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[var(--input-bg)]">
            {loading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'var(--input-bg)' }} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <FolderOpen size={32} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{docs.length === 0 ? 'No documents yet' : 'No documents found'}</p>
              </div>
            ) : filtered.map(doc => {
              const type = TYPE_META[doc.type]
              const status = STATUS_META[doc.status]
              const TypeIcon = type.icon
              const StatusIcon = status.icon
              return (
                <div key={doc.id}
                  className="px-5 py-3.5 grid items-center gap-4 hover:bg-[var(--row-hover-bg)] transition-colors group"
                  style={{ gridTemplateColumns: '2.5fr 1.5fr 1fr 1fr 80px 80px' }}>
                  {/* Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `color-mix(in srgb, ${type.color} 7%, transparent)`, border: `1px solid color-mix(in srgb, ${type.color} 15%, transparent)` }}>
                      <TypeIcon size={14} style={{ color: type.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-primary-ui truncate">{doc.name}</p>
                    </div>
                  </div>
                  {/* Project */}
                  <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{doc.project?.title ?? '—'}</p>
                  {/* Type badge */}
                  <span className="text-xs px-2 py-1 rounded-md w-fit"
                    style={{ background: `color-mix(in srgb, ${type.color} 7%, transparent)`, border: `1px solid color-mix(in srgb, ${type.color} 15%, transparent)`, color: type.color }}>
                    {type.label}
                  </span>
                  {/* Status badge */}
                  <div className="flex items-center gap-1.5">
                    <StatusIcon size={11} style={{ color: status.color }} />
                    <span className="text-xs" style={{ color: status.color }}>{status.label}</span>
                  </div>
                  {/* Size */}
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatBytes(doc.size)}</span>
                  {/* Date + actions */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmtDate(doc.createdAt)}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                      <button onClick={() => setPreview(doc)} className="p-1.5 rounded" style={{ color: 'var(--text-secondary)' }} title="Preview">
                        <Eye size={13} />
                      </button>
                      <button className="p-1.5 rounded" style={{ color: 'var(--text-secondary)' }} title="Download"
                        onClick={() => handleDownload(doc)}>
                        <Download size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgb(var(--bg-rgb) / 0.92)' }}
          onClick={() => setPreview(null)}>
          <div className="glass-card rounded-xl p-7 w-full max-w-md space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-primary-ui font-bold text-base">Document Details</h3>
              <button onClick={() => setPreview(null)} style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `color-mix(in srgb, ${TYPE_META[preview.type].color} 7%, transparent)`, border: `1px solid color-mix(in srgb, ${TYPE_META[preview.type].color} 19%, transparent)` }}>
                {(() => { const Icon = TYPE_META[preview.type].icon; return <Icon size={20} style={{ color: TYPE_META[preview.type].color }} /> })()}
              </div>
              <div>
                <p className="text-primary-ui font-semibold text-sm leading-snug">{preview.name}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{preview.project?.title ?? '—'}</p>
              </div>
            </div>
            {preview.description && (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{preview.description}</p>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Type', val: TYPE_META[preview.type].label },
                { label: 'Status', val: STATUS_META[preview.status].label },
                { label: 'Size', val: formatBytes(preview.size) },
                { label: 'Date', val: fmtDate(preview.createdAt) },
              ].map(({ label, val }) => (
                <div key={label} className="px-3 py-2.5 rounded-lg"
                  style={{ background: 'var(--row-hover-bg)', border: '1px solid var(--border)' }}>
                  <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <p className="text-sm font-medium text-primary-ui">{val}</p>
                </div>
              ))}
            </div>
            <button
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{ background: 'rgb(var(--fg-rgb) / 0.12)', border: '1px solid rgb(var(--fg-rgb) / 0.25)', color: 'var(--fg)' }}
              onClick={() => handleDownload(preview)}>
              <Download size={14} /> Download File
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
