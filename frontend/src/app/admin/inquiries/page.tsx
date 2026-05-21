'use client'

import { useEffect, useState } from 'react'
import { Phone, Sparkles, Clock, CheckCircle, XCircle, Mail, User, Calendar, DollarSign, RefreshCw } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import api from '@/lib/api'
import { useCurrencySymbol } from '@/lib/store'

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

const MOCK: Inquiry[] = [
  {
    id: 'i1', type: 'project_idea', name: 'Sarah Johnson', email: 'sarah@techinc.com', phone: '+1 555 0101',
    projectTitle: 'Customer Portal Rebuild', description: 'We need to rebuild our legacy customer portal into a modern React-based SaaS. Full auth, dashboard, billing integration with Stripe, and API for mobile app.',
    budgetRange: '$15,000 – $50,000', timeline: '3–6 months', status: 'new', createdAt: '2025-05-20T09:30:00Z',
  },
  {
    id: 'i2', type: 'callback', name: 'Marcus Lee', email: 'marcus@startupxyz.io', phone: '+1 555 0202',
    preferredCallbackTime: 'Morning (9am–12pm)', status: 'new', createdAt: '2025-05-20T11:15:00Z',
  },
  {
    id: 'i3', type: 'project_idea', name: 'Priya Sharma', email: 'priya@enterprise.co', phone: '+1 555 0303',
    projectTitle: 'AI Analytics Dashboard', description: 'Need a real-time analytics dashboard integrating with our ML pipeline. Charts, filters, export, role-based access for 3 teams.',
    budgetRange: '$5,000 – $15,000', timeline: '1–3 months', status: 'contacted', createdAt: '2025-05-19T14:00:00Z',
  },
  {
    id: 'i4', type: 'callback', name: 'Tom Bridges', email: '', phone: '+44 7700 900123',
    preferredCallbackTime: 'Evening (5pm–8pm)', status: 'contacted', createdAt: '2025-05-18T16:45:00Z',
  },
  {
    id: 'i5', type: 'project_idea', name: 'Aiko Tanaka', email: 'aiko@mediahouse.jp', phone: '',
    projectTitle: 'Mobile App for Content Creators', description: 'iOS/Android app for content scheduling, analytics, and collaboration. Instagram/TikTok integrations required.',
    budgetRange: '$50,000+', timeline: '3–6 months', status: 'converted', createdAt: '2025-05-15T10:00:00Z',
  },
]

const STATUS_META: Record<string, { label: string; bg: string; border: string; color: string }> = {
  new:       { label: 'NEW',       bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.35)',  color: '#93c5fd' },
  contacted: { label: 'CONTACTED', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.35)',  color: '#fcd34d' },
  converted: { label: 'CONVERTED', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.35)',   color: '#86efac' },
  closed:    { label: 'CLOSED',    bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.35)', color: '#9ca3af' },
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

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/inquiries')
        setInquiries(res.data)
      } catch {
        setInquiries(MOCK)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const advanceStatus = async (id: string, currentStatus: string) => {
    const next = NEXT_STATUS[currentStatus] ?? 'new'
    setUpdating(id)
    try {
      await api.patch(`/inquiries/${id}/status`, { status: next })
    } catch { /* optimistic */ }
    setInquiries(prev => prev.map(i => i.id === id ? { ...i, status: next } : i))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: next } : null)
    setUpdating(null)
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
        <h1 className="text-display text-4xl text-white">INQUIRIES</h1>
        <p className="text-mono-label mt-1" style={{ color: 'rgba(240,240,242,0.35)' }}>Client project ideas and callback requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'TOTAL', value: counts.total, color: '#DC143C' },
          { label: 'PROJECT IDEAS', value: counts.ideas, color: '#a78bfa' },
          { label: 'CALLBACKS', value: counts.callbacks, color: '#60a5fa' },
          { label: 'NEW / UNREAD', value: counts.new, color: '#fbbf24' },
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
        <div className="w-px h-6 bg-[rgba(255,255,255,0.1)] mx-1" />
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
            <div key={i} className="p-4 border-b border-[rgba(255,255,255,0.05)] animate-pulse flex gap-4">
              <div className="h-4 bg-[rgba(255,255,255,0.06)] rounded w-1/4" />
              <div className="h-4 bg-[rgba(255,255,255,0.06)] rounded w-1/3" />
              <div className="h-4 bg-[rgba(255,255,255,0.06)] rounded w-1/5" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Mail size={32} className="mx-auto mb-4" style={{ color: 'rgba(240,240,242,0.2)' }} />
          <p className="text-mono-label" style={{ color: 'rgba(240,240,242,0.35)' }}>NO INQUIRIES FOUND</p>
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
                      background: inq.type === 'project_idea' ? 'rgba(167,139,250,0.1)' : 'rgba(96,165,250,0.1)',
                      border: `1px solid ${inq.type === 'project_idea' ? 'rgba(167,139,250,0.3)' : 'rgba(96,165,250,0.3)'}`,
                      color: inq.type === 'project_idea' ? '#a78bfa' : '#60a5fa',
                    }}>
                      {inq.type === 'project_idea' ? <><Sparkles size={9} /> IDEA</> : <><Phone size={9} /> CALLBACK</>}
                    </span>
                  </td>
                  <td>
                    <p className="font-medium text-white text-sm">{inq.name}</p>
                  </td>
                  <td>
                    <div className="space-y-0.5">
                      {inq.email && <p className="text-xs" style={{ color: 'rgba(240,240,242,0.5)' }}>{inq.email}</p>}
                      {inq.phone && <p className="text-xs" style={{ color: 'rgba(240,240,242,0.5)' }}>{inq.phone}</p>}
                    </div>
                  </td>
                  <td>
                    <p className="text-sm truncate max-w-[200px]" style={{ color: 'rgba(240,240,242,0.6)' }}>
                      {inq.type === 'project_idea'
                        ? inq.projectTitle ?? '—'
                        : `Callback: ${inq.preferredCallbackTime ?? '—'}`}
                    </p>
                  </td>
                  <td>
                    <p className="text-mono-label text-xs" style={{ color: 'rgba(240,240,242,0.4)' }}>
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
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="glass-card rounded-2xl p-8 relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto" style={{ borderColor: 'rgba(220,20,60,0.3)' }}>

            {/* Modal header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center`}
                  style={{ background: selected.type === 'project_idea' ? 'rgba(167,139,250,0.12)' : 'rgba(96,165,250,0.12)' }}>
                  {selected.type === 'project_idea'
                    ? <Sparkles size={20} style={{ color: '#a78bfa' }} />
                    : <Phone size={20} style={{ color: '#60a5fa' }} />}
                </div>
                <div>
                  <h2 className="text-white font-bold text-xl">{selected.name}</h2>
                  <p className="text-mono-label text-xs" style={{ color: 'rgba(240,240,242,0.4)' }}>
                    {selected.type === 'project_idea' ? 'Project Idea' : 'Callback Request'}
                    {' · '}
                    {new Date(selected.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 glass-card-dark rounded">
                <XCircle size={16} style={{ color: 'rgba(240,240,242,0.4)' }} />
              </button>
            </div>

            {/* Contact info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {selected.email && (
                <div className="glass-card-dark rounded-lg p-3 flex items-center gap-2">
                  <Mail size={14} className="text-[#DC143C] shrink-0" />
                  <p className="text-sm text-white truncate">{selected.email}</p>
                </div>
              )}
              {selected.phone && (
                <div className="glass-card-dark rounded-lg p-3 flex items-center gap-2">
                  <Phone size={14} className="text-[#DC143C] shrink-0" />
                  <p className="text-sm text-white">{selected.phone}</p>
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
                      <p className="text-white font-semibold text-lg">{selected.projectTitle}</p>
                    </div>
                  )}
                  {selected.description && (
                    <div>
                      <p className="label-field">Description</p>
                      <p className="text-sm leading-relaxed" style={{ color: 'rgba(240,240,242,0.7)' }}>{selected.description}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    {selected.budgetRange && (
                      <div>
                        <p className="label-field flex items-center gap-1.5"><DollarSign size={9} />Budget</p>
                        <p className="text-white font-medium">{selected.budgetRange?.replace(/\$/g, curr)}</p>
                      </div>
                    )}
                    {selected.timeline && (
                      <div>
                        <p className="label-field flex items-center gap-1.5"><Clock size={9} />Timeline</p>
                        <p className="text-white font-medium">{selected.timeline}</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div>
                  <p className="label-field flex items-center gap-1.5"><Calendar size={9} />Preferred Callback Time</p>
                  <p className="text-white font-semibold text-lg">{selected.preferredCallbackTime}</p>
                </div>
              )}
            </div>

            {/* Status & Actions */}
            <div className="mt-6 pt-5 border-t border-[rgba(255,255,255,0.08)] space-y-4">
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
                      onClick={() => { advanceStatus(selected.id, 'converted'); setTimeout(() => setSelected(null), 300) }}
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
