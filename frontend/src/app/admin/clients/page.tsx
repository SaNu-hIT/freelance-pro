'use client'

import { useEffect, useState } from 'react'
import {
  Search, Building2, Mail, Phone, FolderKanban,
  Eye, X, Calendar, MoreHorizontal, UserPlus, Pencil,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { usersApi } from '@/lib/api'
import { apiError } from '@/lib/utils'
import ErrorBanner from '@/components/ui/ErrorBanner'
import NewClientForm from '@/components/admin/NewClientForm'
import { EditAccountForm, ResetPasswordForm } from '@/components/admin/EditAccountForm'

interface ClientUser {
  id: string
  name: string
  email: string
  company?: string | null
  phone?: string | null
  createdAt: string
  projectCount?: number
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

const AVATAR_COLORS = ['var(--fg)', 'var(--fg)', 'var(--fg)', 'var(--fg)', 'var(--fg)', 'var(--fg)']

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState<ClientUser | null>(null)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        // Each client comes back with its projectCount
        const res = await usersApi.list('client')
        setClients(res.data ?? [])
      } catch (err) {
        setError(apiError(err, 'Could not load clients'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.company ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <DashboardLayout allowedRoles={['admin']}>
      <div className="flex flex-col gap-5 h-full">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-primary-ui text-xl font-bold">Clients</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {clients.length} registered clients
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Stats chips */}
            {[
              { label: 'Total', val: clients.length, color: 'var(--fg)' },
              { label: 'With Projects', val: clients.filter(c => (c.projectCount ?? 0) > 0).length, color: 'var(--fg)' },
            ].map(({ label, val, color }) => (
              <div key={label} className="px-3 py-2 rounded-lg text-center"
                style={{ background: `color-mix(in srgb, ${color} 6%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 15%, transparent)` }}>
                <div className="text-sm font-bold" style={{ color }}>{val}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
              </div>
            ))}
            <button onClick={() => setAdding(true)}
              className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded text-sm">
              <UserPlus size={14} /> Add Client
            </button>
          </div>
        </div>

        {error && <ErrorBanner title="Clients unavailable" message={error} onClose={() => setError('')} />}

        {/* Search */}
        <div className="glass-card rounded-xl p-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              className="input-field pl-9 py-2 text-sm"
              placeholder="Search by name, email or company…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="glass-card rounded-xl overflow-hidden flex-1 flex flex-col">
          <div className="grid text-xs font-semibold px-5 py-3 border-b border-[var(--input-bg)]"
            style={{ gridTemplateColumns: '2.5fr 2fr 1.5fr 1fr 1fr 40px', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
            <span>CLIENT</span>
            <span>EMAIL</span>
            <span>COMPANY</span>
            <span>PROJECTS</span>
            <span>JOINED</span>
            <span />
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[var(--input-bg)]">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="px-5 py-4 grid gap-4 animate-pulse"
                  style={{ gridTemplateColumns: '2.5fr 2fr 1.5fr 1fr 1fr 40px' }}>
                  {[...Array(5)].map((__, j) => (
                    <div key={j} className="h-4 rounded" style={{ background: 'var(--input-bg)' }} />
                  ))}
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Building2 size={32} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No clients found</p>
              </div>
            ) : filtered.map((c, i) => {
              const color = AVATAR_COLORS[i % AVATAR_COLORS.length]
              return (
                <div key={c.id}
                  className="px-5 py-3.5 grid items-center gap-4 hover:bg-[var(--row-hover-bg)] transition-colors group"
                  style={{ gridTemplateColumns: '2.5fr 2fr 1.5fr 1fr 1fr 40px' }}>
                  {/* Client */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: `color-mix(in srgb, ${color} 9%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 21%, transparent)`, color }}>
                      {getInitials(c.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-primary-ui truncate">{c.name}</p>
                    </div>
                  </div>
                  {/* Email */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Mail size={12} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
                    <span className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{c.email}</span>
                  </div>
                  {/* Company */}
                  <div className="flex items-center gap-1.5">
                    <Building2 size={12} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{c.company || '—'}</span>
                  </div>
                  {/* Projects */}
                  <div className="flex items-center gap-1.5">
                    <FolderKanban size={12} style={{ color: 'var(--fg)' }} />
                    <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{c.projectCount ?? 0}</span>
                  </div>
                  {/* Joined */}
                  <div className="flex items-center gap-1.5">
                    <Calendar size={11} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmtDate(c.createdAt)}</span>
                  </div>
                  {/* Actions */}
                  <button
                    onClick={() => { setDetail(c); setEditing(false) }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg"
                    style={{ color: 'var(--text-muted)' }}>
                    <MoreHorizontal size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Add client */}
      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgb(var(--bg-rgb) / 0.92)' }}
          onClick={() => setAdding(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="add-client-title"
            className="glass-card rounded-xl p-7 w-full max-w-lg space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 id="add-client-title" className="text-primary-ui font-bold text-base">Add Client</h3>
              <button onClick={() => setAdding(false)} aria-label="Close" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
            </div>
            <NewClientForm onCreated={c => {
              setClients(prev => [c, ...prev])
              setAdding(false)
            }} />
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgb(var(--bg-rgb) / 0.92)' }}
          onClick={() => setDetail(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="client-detail-title"
            className={`glass-card rounded-xl p-7 w-full ${editing ? 'max-w-lg' : 'max-w-sm'} space-y-5 max-h-full overflow-y-auto`}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 id="client-detail-title" className="text-primary-ui font-bold text-base">{editing ? 'Edit Client' : 'Client Detail'}</h3>
              <div className="flex items-center gap-3">
                <button onClick={() => setEditing(e => !e)} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--fg)' }}>
                  {editing ? 'Done' : <><Pencil size={12} /> Edit</>}
                </button>
                <button onClick={() => setDetail(null)} aria-label="Close" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
              </div>
            </div>
            {editing ? (
              <>
                <EditAccountForm user={detail} showCompany onSaved={u => {
                  const next = { ...detail, ...u, projectCount: detail.projectCount }
                  setDetail(next)
                  setClients(prev => prev.map(c => (c.id === next.id ? next : c)))
                }} />
                <div className="pt-4 border-t border-[var(--input-bg)]">
                  <ResetPasswordForm userId={detail.id} />
                </div>
              </>
            ) : (<>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                style={{ background: 'rgb(var(--fg-rgb) / 0.15)', border: '2px solid rgb(var(--fg-rgb) / 0.35)', color: 'var(--fg)' }}>
                {getInitials(detail.name)}
              </div>
              <div>
                <p className="text-primary-ui font-semibold text-base">{detail.name}</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{detail.company || 'Individual'}</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {[
                { icon: Mail, label: 'Email', val: detail.email },
                { icon: Phone, label: 'Phone', val: detail.phone || 'Not provided' },
                { icon: FolderKanban, label: 'Projects', val: String(detail.projectCount ?? 0) },
                { icon: Calendar, label: 'Joined', val: fmtDate(detail.createdAt) },
              ].map(({ icon: Icon, label, val }) => (
                <div key={label} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                  style={{ background: 'var(--row-hover-bg)', border: '1px solid var(--border)' }}>
                  <Icon size={13} style={{ color: 'var(--fg)' }} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span className="ml-auto text-sm text-primary-ui font-medium">{val}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setDetail(null)}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{ background: 'rgb(var(--fg-rgb) / 0.12)', border: '1px solid rgb(var(--fg-rgb) / 0.25)', color: 'var(--fg)' }}>
              <Eye size={13} className="inline mr-1.5" />
              View Projects
            </button>
            </>)}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
