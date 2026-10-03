'use client'

import { useEffect, useState } from 'react'
import { Phone, Sparkles, Clock, CheckCircle, XCircle, Mail, User, Calendar, DollarSign, RefreshCw } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import api from '@/lib/api'
import { useCurrencySymbol } from '@/lib/store'
import { apiError } from '@/lib/utils'
import ErrorBanner from '@/components/ui/ErrorBanner'

interface Inquiry {
  id: string
  type: 'project_idea' | 'callback'
  name: string
  email: string
  phone?: string
  projectTitle?: string
  description?: string
  budgetRange?: string
  timeline?: string
  preferredCallbackTime?: string
  status: string
  createdAt: string
}

const STATUS_META: Record<string, { label: string; bg: string; border: string; color: string }> = {
  new:       { label: 'NEW',       bg: 'rgb(var(--fg-rgb) / 0.12)',  border: 'rgb(var(--fg-rgb) / 0.35)',  color: 'var(--fg)' },
  contacted: { label: 'CONTACTED', bg: 'rgb(var(--fg-rgb) / 0.12)',  border: 'rgb(var(--fg-rgb) / 0.35)',  color: 'var(--fg)' },
  converted: { label: 'CONVERTED', bg: 'rgb(var(--fg-rgb) / 0.12)',   border: 'rgb(var(--fg-rgb) / 0.35)',   color: 'var(--fg)' },
  closed:    { label: 'CLOSED',    bg: 'rgb(var(--fg-rgb) / 0.12)', border: 'rgb(var(--fg-rgb) / 0.35)', color: 'var(--text-muted)' },
}

const NEXT_STATUS: Record<string, string> = {
  new: 'contacted', contacted: 'converted', converted: 'closed', closed: 'new',
}

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META.new
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-mono-label"
      style={{ fontSize: 9, background: m.bg, border: `1px solid ${m.border}`, color: m.color }}
    >
      {m.label}
    </span>
  )
}

export default function AdminInquiriesPage() {
  const curr = useCurrencySymbol()
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'project_idea' | 'callback'>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selected, setSelected] = useState<Inquiry | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/inquiries')
        setInquiries(res.data ?? [])
      } catch (err) {
        setError(apiError(err, 'Could not load inquiries'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const advanceStatus = async (id: string, currentStatus: string) => {
    const next = NEXT_STATUS[currentStatus] ?? 'new'
    setUpdating(id)
    setError('')
    try {
      const res = await api.patch(`/inquiries/${id}/status`, { status: next })
      const status: string = res.data?.status ?? next
      setInquiries(prev => prev.map(i => i.id === id ? { ...i, status } : i))
      setSelected(prev => prev?.id === id ? { ...prev, status } : prev)
      return true
    } catch (err) {
      setError(apiError(err, 'Could not update the inquiry status'))
      return false
    } finally {
      setUpdating(null)
    }
  }

  const filtered = inquiries.filter(i => {
    const matchType = filter === 'all' || i.type === filter
    const matchStatus = statusFilter === 'all' || i.status === statusFilter
    return matchType && matchStatus
  })

  const counts = {
    total: inquiries.length,
    ideas: inquiries.filter(i => i.type === 'project_idea').length,
    callbacks: inquiries.filter(i => i.type === 'callback').length,
    new: inquiries.filter(i => i.status === 'new').length,
  }

  return (
    <DashboardLayout allowedRoles={['admin']}>
      {/* Header */}
      <div className="mb-8">
        <p className="text-mono-label mb-1">LEAD MANAGEMENT</p>
        <h1 className="text-display text-4xl text-primary-ui">INQUIRIES</h1>
        <p className="text-mono-label mt-1" style={{ color: 'var(--text-muted)' }}>Client project ideas and callback requests</p>
      </div>

      {error && (
        <div className="mb-6">
          <ErrorBanner message={error} onClose={() => setError('')} />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'TOTAL', value: counts.total, color: 'var(--fg)' },
          { label: 'PROJECT IDEAS', value: counts.ideas, color: 'var(--fg)' },
          { label: 'CALLBACKS', value: counts.callbacks, color: 'var(--fg)' },
          { label: 'NEW / UNREAD', value: counts.new, color: 'var(--fg)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card metric-card rounded-lg">
            <p className="text-mono-label mb-2">{label}</p>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card-dark rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex gap-2">
          {(['all', 'project_idea', 'callback'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded text-xs transition-all ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
              style={filter !== f ? { padding: '8px 16px' } : {}}
            >
              {f === 'all' ? 'ALL' : f === 'project_idea' ? '💡 IDEAS' : '📞 CALLBACKS'}
            </button>
          ))}
        </div>
        <div className="w-px h-6 bg-[var(--track-bg)] mx-1" />
        <div className="flex gap-2">
          {['all', 'new', 'contacted', 'converted', 'closed'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded text-xs transition-all ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
              style={statusFilter !== s ? { padding: '6px 12px' } : {}}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="glass-card rounded-xl overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 border-b border-[var(--input-bg)] animate-pulse flex gap-4">
              <div className="h-4 bg-[var(--input-bg)] rounded w-1/4" />
              <div className="h-4 bg-[var(--input-bg)] rounded w-1/3" />
              <div className="h-4 bg-[var(--input-bg)] rounded w-1/5" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Mail size={32} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <p className="text-mono-label" style={{ color: 'var(--text-muted)' }}>NO INQUIRIES FOUND</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Details</th>
                <th>Received</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inq => (
                <tr key={inq.id} className="cursor-pointer" onClick={() => setSelected(inq)}>
                  <td>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-mono-label`} style={{
                      fontSize: 9,
                      background: inq.type === 'project_idea' ? 'rgb(var(--fg-rgb) / 0.1)' : 'rgb(var(--fg-rgb) / 0.1)',
                      border: `1px solid ${inq.type === 'project_idea' ? 'rgb(var(--fg-rgb) / 0.3)' : 'rgb(var(--fg-rgb) / 0.3)'}`,
                      color: inq.type === 'project_idea' ? 'var(--fg)' : 'var(--fg)',
                    }}>
                      {inq.type === 'project_idea' ? <><Sparkles size={9} /> IDEA</> : <><Phone size={9} /> CALLBACK</>}
                    </span>
                  </td>
                  <td>
                    <p className="font-medium text-primary-ui text-sm">{inq.name}</p>
                  </td>
                  <td>
                    <div className="space-y-0.5">
                      {inq.email && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{inq.email}</p>}
                      {inq.phone && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{inq.phone}</p>}
                    </div>
                  </td>
                  <td>
                    <p className="text-sm truncate max-w-[200px]" style={{ color: 'var(--text-secondary)' }}>
                      {inq.type === 'project_idea'
                        ? inq.projectTitle ?? '—'
                        : `Callback: ${inq.preferredCallbackTime ?? '—'}`}
                    </p>
                  </td>
                  <td>
                    <p className="text-mono-label text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(inq.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <StatusBadge status={inq.status} />
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelected(inq)}
                        className="btn-ghost text-xs py-1 px-3 rounded"
                        style={{ padding: '4px 10px' }}
                      >
                        View
                      </button>
                      <button
                        onClick={() => advanceStatus(inq.id, inq.status)}
                        disabled={updating === inq.id}
                        className="btn-ghost text-xs py-1 px-2 rounded"
                        style={{ padding: '4px 8px' }}
                        title={`Move to: ${NEXT_STATUS[inq.status]}`}
                      >
                        {updating === inq.id ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[rgb(var(--bg-rgb)/.92)]" onClick={() => setSelected(null)} />
          <div className="glass-card rounded-2xl p-8 relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto" style={{ borderColor: 'rgb(var(--fg-rgb) / 0.3)' }}>

            {/* Modal header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center`}
                  style={{ background: selected.type === 'project_idea' ? 'rgb(var(--fg-rgb) / 0.12)' : 'rgb(var(--fg-rgb) / 0.12)' }}>
                  {selected.type === 'project_idea'
                    ? <Sparkles size={20} style={{ color: 'var(--fg)' }} />
                    : <Phone size={20} style={{ color: 'var(--fg)' }} />}
                </div>
                <div>
                  <h2 className="text-primary-ui font-bold text-xl">{selected.name}</h2>
                  <p className="text-mono-label text-xs" style={{ color: 'var(--text-muted)' }}>
                    {selected.type === 'project_idea' ? 'Project Idea' : 'Callback Request'}
                    {' · '}
                    {new Date(selected.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 glass-card-dark rounded">
                <XCircle size={16} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            {/* Contact info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {selected.email && (
                <div className="glass-card-dark rounded-lg p-3 flex items-center gap-2">
                  <Mail size={14} className="text-[var(--fg)] shrink-0" />
                  <p className="text-sm text-primary-ui truncate">{selected.email}</p>
                </div>
              )}
              {selected.phone && (
                <div className="glass-card-dark rounded-lg p-3 flex items-center gap-2">
                  <Phone size={14} className="text-[var(--fg)] shrink-0" />
                  <p className="text-sm text-primary-ui">{selected.phone}</p>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="space-y-4">
              {selected.type === 'project_idea' ? (
                <>
                  {selected.projectTitle && (
                    <div>
                      <p className="label-field flex items-center gap-1.5"><Sparkles size={9} />Project Title</p>
                      <p className="text-primary-ui font-semibold text-lg">{selected.projectTitle}</p>
                    </div>
                  )}
                  {selected.description && (
                    <div>
                      <p className="label-field">Description</p>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{selected.description}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    {selected.budgetRange && (
                      <div>
                        <p className="label-field flex items-center gap-1.5"><DollarSign size={9} />Budget</p>
                        <p className="text-primary-ui font-medium">{selected.budgetRange?.replace(/\$/g, curr)}</p>
                      </div>
                    )}
                    {selected.timeline && (
                      <div>
                        <p className="label-field flex items-center gap-1.5"><Clock size={9} />Timeline</p>
                        <p className="text-primary-ui font-medium">{selected.timeline}</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div>
                  <p className="label-field flex items-center gap-1.5"><Calendar size={9} />Preferred Callback Time</p>
                  <p className="text-primary-ui font-semibold text-lg">{selected.preferredCallbackTime}</p>
                </div>
              )}
            </div>

            {/* Status & Actions */}
            <div className="mt-6 pt-5 border-t border-[var(--input-bg)] space-y-4">
              {error && <ErrorBanner message={error} onClose={() => setError('')} />}
              <div className="flex items-center justify-between">
                <div>
                  <p className="label-field mb-1">Current Status</p>
                  <StatusBadge status={selected.status} />
                </div>
                <div className="flex items-center gap-2">
                  {selected.status !== 'converted' && selected.status !== 'closed' && (
                    <button
                      onClick={() => advanceStatus(selected.id, selected.status)}
                      disabled={updating === selected.id}
                      className="btn-primary flex items-center gap-2 text-sm rounded py-2 px-4"
                    >
                      {updating === selected.id ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                      Mark as {NEXT_STATUS[selected.status] ?? 'next'}
                    </button>
                  )}
                  {selected.status !== 'closed' && (
                    <button
                      onClick={async () => { if (await advanceStatus(selected.id, 'converted')) setSelected(null) }}
                      disabled={updating === selected.id}
                      className="btn-ghost flex items-center gap-2 text-sm rounded py-2 px-3"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
              {selected.email && (
                <a
                  href={`mailto:${selected.email}?subject=Re: ${selected.type === 'project_idea' ? selected.projectTitle ?? 'Your Project Idea' : 'Callback Request'} - FreelancePro`}
                  className="btn-ghost w-full flex items-center justify-center gap-2 text-sm rounded py-2.5"
                >
                  <Mail size={14} />
                  Reply via Email
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
