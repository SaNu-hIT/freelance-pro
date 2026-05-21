'use client'

import { useState } from 'react'
import {
  FileText, Download, Eye, FolderOpen,
  CheckCircle2, Clock, FileCheck, Package,
  Search, Filter, X,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'

type DocStatus = 'delivered' | 'in-review' | 'pending'
type DocType = 'deliverable' | 'contract' | 'report' | 'invoice'

interface Document {
  id: string
  name: string
  project: string
  type: DocType
  status: DocStatus
  size: string
  date: string
  description: string
}

const MOCK_DOCS: Document[] = [
  { id: 'd1', name: 'Homepage Redesign — Final.zip', project: 'Website Overhaul', type: 'deliverable', status: 'delivered', size: '12.4 MB', date: '2025-05-18', description: 'All source files for the homepage redesign including Figma, HTML/CSS, and assets.' },
  { id: 'd2', name: 'QA Report — Sprint 3.pdf', project: 'Website Overhaul', type: 'report', status: 'delivered', size: '340 KB', date: '2025-05-16', description: 'QA findings and resolution status for Sprint 3 deliverables.' },
  { id: 'd3', name: 'Mobile App MVP — v1.0.zip', project: 'Mobile App Development', type: 'deliverable', status: 'delivered', size: '28.7 MB', date: '2025-05-10', description: 'iOS and Android source code for the MVP release, including build instructions.' },
  { id: 'd4', name: 'Service Agreement — May 2025.pdf', project: 'All Projects', type: 'contract', status: 'delivered', size: '180 KB', date: '2025-05-01', description: 'Signed service agreement covering all active projects for May 2025.' },
  { id: 'd5', name: 'Monthly Progress Report — April.pdf', project: 'All Projects', type: 'report', status: 'delivered', size: '520 KB', date: '2025-05-02', description: 'Summary of progress, hours worked, and milestone status for April 2025.' },
  { id: 'd6', name: 'Invoice #INV-2025-004.pdf', project: 'All Projects', type: 'invoice', status: 'delivered', size: '95 KB', date: '2025-05-01', description: 'Invoice for services rendered in April 2025.' },
  { id: 'd7', name: 'Backend API Module — Auth.zip', project: 'CRM Integration', type: 'deliverable', status: 'in-review', size: '4.2 MB', date: '2025-05-20', description: 'Authentication module code — currently under QA review before handoff.' },
  { id: 'd8', name: 'Dashboard UI Kit.zip', project: 'Analytics Dashboard', type: 'deliverable', status: 'pending', size: '—', date: '—', description: 'Scheduled for delivery at end of Sprint 4 (est. 28 May 2025).' },
]

const TYPE_META: Record<DocType, { icon: typeof FileText; color: string; label: string }> = {
  deliverable: { icon: Package, color: '#60a5fa', label: 'Deliverable' },
  contract:    { icon: FileCheck, color: '#a78bfa', label: 'Contract' },
  report:      { icon: FileText, color: '#34d399', label: 'Report' },
  invoice:     { icon: FileText, color: '#fbbf24', label: 'Invoice' },
}

const STATUS_META: Record<DocStatus, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  delivered:  { icon: CheckCircle2, color: '#4ade80', bg: 'rgba(74,222,128,0.1)',   label: 'Delivered' },
  'in-review':{ icon: Clock,        color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  label: 'In Review' },
  pending:    { icon: Clock,        color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', label: 'Pending' },
}

function fmtDate(iso: string) {
  if (iso === '—') return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

export default function ClientDocumentsPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<DocType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<DocStatus | 'all'>('all')
  const [preview, setPreview] = useState<Document | null>(null)

  const filtered = MOCK_DOCS.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.project.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || d.type === typeFilter
    const matchStatus = statusFilter === 'all' || d.status === statusFilter
    return matchSearch && matchType && matchStatus
  })

  const counts = {
    total: MOCK_DOCS.length,
    delivered: MOCK_DOCS.filter(d => d.status === 'delivered').length,
    inReview: MOCK_DOCS.filter(d => d.status === 'in-review').length,
    pending: MOCK_DOCS.filter(d => d.status === 'pending').length,
  }

  return (
    <DashboardLayout allowedRoles={['client']}>
      <div className="flex flex-col gap-5 h-full">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl font-bold">Documents</h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(240,240,242,0.4)' }}>
              Deliverables, contracts, reports and invoices from your projects
            </p>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Files', val: counts.total, color: '#60a5fa', icon: FolderOpen },
            { label: 'Delivered', val: counts.delivered, color: '#4ade80', icon: CheckCircle2 },
            { label: 'In QA Review', val: counts.inReview, color: '#fbbf24', icon: Clock },
            { label: 'Pending', val: counts.pending, color: '#9ca3af', icon: Clock },
          ].map(({ label, val, color, icon: Icon }) => (
            <div key={label} className="glass-card rounded-xl px-4 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
                <Icon size={15} style={{ color }} />
              </div>
              <div>
                <div className="text-lg font-bold text-white">{val}</div>
                <div className="text-xs" style={{ color: 'rgba(240,240,242,0.4)' }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="glass-card rounded-xl p-4 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(240,240,242,0.3)' }} />
            <input
              className="input-field pl-9 py-2 text-sm w-full"
              placeholder="Search documents…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={12} style={{ color: 'rgba(240,240,242,0.35)' }} />
            {(['all', 'deliverable', 'contract', 'report', 'invoice'] as const).map(t => (
              <button key={t}
                onClick={() => setTypeFilter(t)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                style={{
                  background: typeFilter === t ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${typeFilter === t ? 'rgba(96,165,250,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  color: typeFilter === t ? '#60a5fa' : 'rgba(240,240,242,0.45)',
                }}>
                {t === 'all' ? 'All Types' : t}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {(['all', 'delivered', 'in-review', 'pending'] as const).map(s => (
              <button key={s}
                onClick={() => setStatusFilter(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: statusFilter === s ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${statusFilter === s ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  color: statusFilter === s ? '#4ade80' : 'rgba(240,240,242,0.45)',
                }}>
                {s === 'all' ? 'All Status' : s === 'in-review' ? 'In Review' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Document list */}
        <div className="glass-card rounded-xl overflow-hidden flex-1 flex flex-col">
          <div className="grid text-xs font-semibold px-5 py-3 border-b border-[rgba(255,255,255,0.07)]"
            style={{ gridTemplateColumns: '2.5fr 1.5fr 1fr 1fr 80px 80px', color: 'rgba(240,240,242,0.4)', letterSpacing: '0.06em' }}>
            <span>DOCUMENT</span>
            <span>PROJECT</span>
            <span>TYPE</span>
            <span>STATUS</span>
            <span>SIZE</span>
            <span>DATE</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[rgba(255,255,255,0.05)]">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <FolderOpen size={32} style={{ color: 'rgba(240,240,242,0.1)', marginBottom: 12 }} />
                <p className="text-sm" style={{ color: 'rgba(240,240,242,0.3)' }}>No documents found</p>
              </div>
            ) : filtered.map(doc => {
              const type = TYPE_META[doc.type]
              const status = STATUS_META[doc.status]
              const TypeIcon = type.icon
              const StatusIcon = status.icon
              return (
                <div key={doc.id}
                  className="px-5 py-3.5 grid items-center gap-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors group"
                  style={{ gridTemplateColumns: '2.5fr 1.5fr 1fr 1fr 80px 80px', opacity: doc.status === 'pending' ? 0.65 : 1 }}>
                  {/* Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${type.color}12`, border: `1px solid ${type.color}25` }}>
                      <TypeIcon size={14} style={{ color: type.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{doc.name}</p>
                    </div>
                  </div>
                  {/* Project */}
                  <p className="text-sm truncate" style={{ color: 'rgba(240,240,242,0.55)' }}>{doc.project}</p>
                  {/* Type badge */}
                  <span className="text-xs px-2 py-1 rounded-md w-fit"
                    style={{ background: `${type.color}12`, border: `1px solid ${type.color}25`, color: type.color }}>
                    {type.label}
                  </span>
                  {/* Status badge */}
                  <div className="flex items-center gap-1.5">
                    <StatusIcon size={11} style={{ color: status.color }} />
                    <span className="text-xs" style={{ color: status.color }}>{status.label}</span>
                  </div>
                  {/* Size */}
                  <span className="text-xs" style={{ color: 'rgba(240,240,242,0.4)' }}>{doc.size}</span>
                  {/* Date + actions */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'rgba(240,240,242,0.4)' }}>{fmtDate(doc.date)}</span>
                    {doc.status === 'delivered' && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                        <button onClick={() => setPreview(doc)} className="p-1.5 rounded" style={{ color: 'rgba(240,240,242,0.5)' }} title="Preview">
                          <Eye size={13} />
                        </button>
                        <button className="p-1.5 rounded" style={{ color: 'rgba(240,240,242,0.5)' }} title="Download"
                          onClick={() => alert('Download is disabled in demo mode.')}>
                          <Download size={13} />
                        </button>
                      </div>
                    )}
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
          style={{ background: 'rgba(3,0,0,0.8)', backdropFilter: 'blur(8px)' }}
          onClick={() => setPreview(null)}>
          <div className="glass-card rounded-xl p-7 w-full max-w-md space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-base">Document Details</h3>
              <button onClick={() => setPreview(null)} style={{ color: 'rgba(240,240,242,0.35)' }}><X size={16} /></button>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${TYPE_META[preview.type].color}12`, border: `1px solid ${TYPE_META[preview.type].color}30` }}>
                {(() => { const Icon = TYPE_META[preview.type].icon; return <Icon size={20} style={{ color: TYPE_META[preview.type].color }} /> })()}
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-snug">{preview.name}</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(240,240,242,0.4)' }}>{preview.project}</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(240,240,242,0.6)' }}>{preview.description}</p>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Type', val: TYPE_META[preview.type].label },
                { label: 'Status', val: STATUS_META[preview.status].label },
                { label: 'Size', val: preview.size },
                { label: 'Date', val: fmtDate(preview.date) },
              ].map(({ label, val }) => (
                <div key={label} className="px-3 py-2.5 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-xs mb-0.5" style={{ color: 'rgba(240,240,242,0.35)' }}>{label}</p>
                  <p className="text-sm font-medium text-white">{val}</p>
                </div>
              ))}
            </div>
            <button
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{ background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.25)', color: '#60a5fa' }}
              onClick={() => alert('Download is disabled in demo mode.')}>
              <Download size={14} /> Download File
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
