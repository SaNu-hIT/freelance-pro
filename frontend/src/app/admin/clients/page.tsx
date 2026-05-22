'use client'

import { useEffect, useState } from 'react'
import {
  Search, Building2, Mail, Phone, FolderKanban,
  Eye, X, Calendar, MoreHorizontal,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { projectsApi } from '@/lib/api'
import api from '@/lib/api'

interface ClientUser {
  id: string
  name: string
  email: string
  company?: string
  phone?: string
  createdAt: string
  projectCount?: number
}

const MOCK_CLIENTS: ClientUser[] = [
  { id: 'c1', name: 'Jane Smith', email: 'jane@acmecorp.com', company: 'Acme Corp', phone: '+1 555-0101', createdAt: '2024-02-10', projectCount: 3 },
  { id: 'c2', name: 'David Nguyen', email: 'david@techstart.io', company: 'TechStart', phone: '+1 555-0202', createdAt: '2024-03-22', projectCount: 1 },
  { id: 'c3', name: 'Sarah Patel', email: 'sarah@nexabuild.com', company: 'NexaBuild', phone: '+44 7700 900303', createdAt: '2024-05-15', projectCount: 2 },
  { id: 'c4', name: 'Liam Torres', email: 'liam@cloudnine.co', company: 'CloudNine', phone: '+1 555-0404', createdAt: '2024-07-01', projectCount: 4 },
  { id: 'c5', name: 'Emma Larsson', email: 'emma@designhaus.se', company: 'Designhaus', phone: '+46 700 555 05', createdAt: '2024-09-18', projectCount: 1 },
  { id: 'c6', name: 'Omar Hassan', email: 'omar@digital.ae', company: 'Digital AE', phone: '+971 50 123 0606', createdAt: '2025-01-08', projectCount: 2 },
]

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

const AVATAR_COLORS = ['#60a5fa', '#818cf8', '#34d399', '#fbbf24', '#f472b6', '#fb923c']

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState<ClientUser | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/users?role=client')
        const data = res.data?.data ?? res.data ?? []
        if (Array.isArray(data) && data.length > 0) {
          const withCounts = await Promise.all(
            data.map(async (u: ClientUser) => {
              try {
                const pRes = await projectsApi.getAll()
                const all = pRes.data?.data ?? pRes.data ?? []
                return { ...u, projectCount: all.filter((p: { clientId: string }) => p.clientId === u.id).length }
              } catch { return { ...u, projectCount: 0 } }
            })
          )
          setClients(withCounts)
        } else {
          setClients(MOCK_CLIENTS)
        }
      } catch {
        setClients(MOCK_CLIENTS)
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
              { label: 'Total', val: clients.length, color: '#60a5fa' },
              { label: 'With Projects', val: clients.filter(c => (c.projectCount ?? 0) > 0).length, color: '#4ade80' },
            ].map(({ label, val, color }) => (
              <div key={label} className="px-3 py-2 rounded-lg text-center"
                style={{ background: `${color}10`, border: `1px solid ${color}25` }}>
                <div className="text-sm font-bold" style={{ color }}>{val}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

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
                      style={{ background: `${color}18`, border: `1px solid ${color}35`, color }}>
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
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{c.company ?? '—'}</span>
                  </div>
                  {/* Projects */}
                  <div className="flex items-center gap-1.5">
                    <FolderKanban size={12} style={{ color: '#60a5fa' }} />
                    <span className="text-sm font-semibold" style={{ color: '#60a5fa' }}>{c.projectCount ?? 0}</span>
                  </div>
                  {/* Joined */}
                  <div className="flex items-center gap-1.5">
                    <Calendar size={11} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmtDate(c.createdAt)}</span>
                  </div>
                  {/* Actions */}
                  <button
                    onClick={() => setDetail(c)}
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

      {/* Detail drawer */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(3,0,0,0.8)', backdropFilter: 'blur(8px)' }}
          onClick={() => setDetail(null)}>
          <div className="glass-card rounded-xl p-7 w-full max-w-sm space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-primary-ui font-bold text-base">Client Detail</h3>
              <button onClick={() => setDetail(null)} style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                style={{ background: 'rgba(96,165,250,0.15)', border: '2px solid rgba(96,165,250,0.35)', color: '#60a5fa' }}>
                {getInitials(detail.name)}
              </div>
              <div>
                <p className="text-primary-ui font-semibold text-base">{detail.name}</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{detail.company ?? 'Individual'}</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {[
                { icon: Mail, label: 'Email', val: detail.email },
                { icon: Phone, label: 'Phone', val: detail.phone ?? 'Not provided' },
                { icon: FolderKanban, label: 'Projects', val: String(detail.projectCount ?? 0) },
                { icon: Calendar, label: 'Joined', val: fmtDate(detail.createdAt) },
              ].map(({ icon: Icon, label, val }) => (
                <div key={label} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                  style={{ background: 'var(--row-hover-bg)', border: '1px solid var(--border)' }}>
                  <Icon size={13} style={{ color: '#60a5fa' }} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span className="ml-auto text-sm text-primary-ui font-medium">{val}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setDetail(null)}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{ background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.25)', color: '#60a5fa' }}>
              <Eye size={13} className="inline mr-1.5" />
              View Projects
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
