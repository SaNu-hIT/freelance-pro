'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, User, LayoutGrid, List } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { freelancersApi } from '@/lib/api'
import { FreelancerProfile } from '@/lib/types'
import { useCurrencySymbol } from '@/lib/store'

const MOCK_FREELANCERS: FreelancerProfile[] = [
  { id: 'f1', userId: 'u1', skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'], experience: 4, hourlyRate: 75, status: 'active', bio: 'Full-stack engineer specializing in React and Node ecosystems.', user: { id: 'u1', name: 'Alex Rivera', email: 'alex@dev.com', role: 'freelancer', createdAt: '2024-01-15' } },
  { id: 'f2', userId: 'u2', skills: ['Figma', 'UI/UX', 'CSS', 'Tailwind'], experience: 6, hourlyRate: 90, status: 'active', bio: 'Senior UX designer with 6 years building SaaS products.', user: { id: 'u2', name: 'Sam Chen', email: 'sam@ux.com', role: 'freelancer', createdAt: '2024-02-10' } },
  { id: 'f3', userId: 'u3', skills: ['Python', 'Django', 'REST API', 'AWS'], experience: 5, hourlyRate: 80, status: 'active', bio: 'Backend engineer focused on scalable APIs.', user: { id: 'u3', name: 'Jordan Lee', email: 'jordan@api.com', role: 'freelancer', createdAt: '2024-01-28' } },
  { id: 'f4', userId: 'u4', skills: ['Flutter', 'Dart', 'iOS', 'Android'], experience: 3, hourlyRate: 65, status: 'pending', bio: 'Mobile developer with apps on both major stores.', user: { id: 'u4', name: 'Morgan Wu', email: 'morgan@mobile.dev', role: 'freelancer', createdAt: '2025-04-01' } },
  { id: 'f5', userId: 'u5', skills: ['DevOps', 'Kubernetes', 'Docker', 'CI/CD'], experience: 7, hourlyRate: 110, status: 'pending', bio: 'Infrastructure architect specializing in cloud-native apps.', user: { id: 'u5', name: 'Casey Park', email: 'casey@devops.io', role: 'freelancer', createdAt: '2025-04-15' } },
  { id: 'f6', userId: 'u6', skills: ['Vue.js', 'Laravel', 'PHP'], experience: 2, hourlyRate: 50, status: 'inactive', bio: 'Junior developer available for small-scale projects.', user: { id: 'u6', name: 'Riley Brooks', email: 'riley@vue.dev', role: 'freelancer', createdAt: '2023-11-20' } },
]

const STATUS_COLORS = {
  active: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', color: '#4ade80' },
  pending: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', color: '#fbbf24' },
  inactive: { bg: 'rgba(156,163,175,0.1)', border: 'rgba(156,163,175,0.3)', color: 'var(--text-muted)' },
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function AdminFreelancersPage() {
  const curr = useCurrencySymbol()
  const router = useRouter()
  const [freelancers, setFreelancers] = useState<FreelancerProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await freelancersApi.getAll({ status: 'active' })
        const data = res.data?.data ?? res.data
        setFreelancers(Array.isArray(data) ? data.filter((f: FreelancerProfile) => f.status === 'active') : [])
      } catch {
        setFreelancers(MOCK_FREELANCERS.filter(f => f.status === 'active'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = freelancers.filter(f => {
    const matchSearch =
      f.user.name.toLowerCase().includes(search.toLowerCase()) ||
      f.user.email.toLowerCase().includes(search.toLowerCase()) ||
      f.skills.some(s => s.toLowerCase().includes(search.toLowerCase()))
    const matchStatus = statusFilter === 'all' || f.status === statusFilter
    return matchSearch && matchStatus
  })

  const counts = {
    total: freelancers.length,
    active: freelancers.filter(f => f.status === 'active').length,
    pending: freelancers.filter(f => f.status === 'pending').length,
    inactive: freelancers.filter(f => f.status === 'inactive').length,
  }

  return (
    <DashboardLayout allowedRoles={['admin']}>
      {/* Header */}
      <div className="mb-8">
        <p className="text-mono-label mb-1">TALENT POOL</p>
        <h1 className="text-display text-4xl text-primary-ui">OUR TEAM</h1>
        <p className="text-mono-label mt-1" style={{ color: 'var(--text-muted)' }}>Approved freelancers on the platform</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {[
          { label: 'TEAM SIZE', value: counts.total, color: '#DC143C' },
          { label: 'ACTIVE', value: counts.active, color: '#4ade80' },
        ].map(item => (
          <div key={item.label} className="glass-card metric-card rounded-lg">
            <p className="text-mono-label mb-2">{item.label}</p>
            <p className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card-dark rounded-xl p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by name, email, or skill..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9 py-2.5 text-sm"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded text-xs transition-all ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
              style={statusFilter !== s ? { padding: '8px 16px' } : {}}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
        {/* View toggle */}
        <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <button
            onClick={() => setViewMode('grid')}
            className="p-1.5 rounded transition-all"
            style={{ background: viewMode === 'grid' ? 'rgba(220,20,60,0.15)' : 'transparent', color: viewMode === 'grid' ? '#DC143C' : 'var(--text-muted)' }}
            title="Grid view"
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className="p-1.5 rounded transition-all"
            style={{ background: viewMode === 'list' ? 'rgba(220,20,60,0.15)' : 'transparent', color: viewMode === 'list' ? '#DC143C' : 'var(--text-muted)' }}
            title="List view"
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {/* Freelancers — Grid / List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-6 animate-pulse space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[var(--skeleton)]" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-[var(--skeleton)] rounded w-3/4" />
                  <div className="h-3 bg-[var(--skeleton)] rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-[var(--skeleton)] rounded" />
              <div className="flex gap-2">
                <div className="h-6 bg-[var(--skeleton)] rounded w-16" />
                <div className="h-6 bg-[var(--skeleton)] rounded w-20" />
                <div className="h-6 bg-[var(--skeleton)] rounded w-14" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <User size={32} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <p className="text-mono-label text-lg" style={{ color: 'var(--text-muted)' }}>NO FREELANCERS FOUND</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(f => {
            const sc = STATUS_COLORS[f.status]
            return (
              <div
                key={f.id}
                className="glass-card rounded-xl p-6 flex flex-col gap-4 transition-all hover:border-[#DC143C] cursor-pointer"
                onClick={() => router.push(`/admin/freelancers/${f.id}`)}
              >
                {/* Avatar + Name */}
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-primary-ui font-bold text-sm"
                    style={{ background: 'linear-gradient(135deg, #8B0000, #DC143C)' }}
                  >
                    {getInitials(f.user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-primary-ui font-bold text-base truncate">{f.user.name}</p>
                    <p className="text-mono-label truncate" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {f.user.email}
                    </p>
                  </div>
                  <span
                    className="shrink-0 text-mono-label px-2 py-1 rounded"
                    style={{ fontSize: '9px', background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color }}
                  >
                    {f.status.toUpperCase()}
                  </span>
                </div>

                {/* Bio */}
                {f.bio && (
                  <p className="text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--text-muted)' }}>{f.bio}</p>
                )}

                {/* Skills */}
                <div className="flex flex-wrap gap-1.5">
                  {f.skills.slice(0, 5).map(skill => (
                    <span
                      key={skill}
                      className="glass-card-dark text-mono-label px-2 py-0.5 rounded"
                      style={{ fontSize: '10px', color: 'var(--text-secondary)' }}
                    >
                      {skill}
                    </span>
                  ))}
                  {f.skills.length > 5 && (
                    <span className="text-mono-label px-2 py-0.5 rounded" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      +{f.skills.length - 5}
                    </span>
                  )}
                </div>

                {/* Meta */}
                <div className="flex items-center gap-4 text-mono-label pt-2 border-t border-[var(--input-bg)]" style={{ fontSize: '11px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{f.experience} yr exp</span>
                  <span className="text-crimson font-bold">{curr}{f.hourlyRate}/hr</span>
                  <span className="ml-auto text-xs" style={{ color: '#60a5fa' }}>View →</span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* List view */
        <div className="glass-card rounded-xl overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Skills</th>
                <th>Experience</th>
                <th>Rate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => {
                const sc = STATUS_COLORS[f.status]
                return (
                  <tr
                    key={f.id}
                    className="cursor-pointer"
                    style={{ transition: 'background 0.15s' }}
                    onClick={() => router.push(`/admin/freelancers/${f.id}`)}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,20,60,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                          style={{ background: 'linear-gradient(135deg,#8B0000,#DC143C)', color: '#fff' }}>
                          {getInitials(f.user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-primary-ui">{f.user.name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{f.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {f.skills.slice(0, 4).map(s => (
                          <span key={s} className="glass-card-dark text-mono-label px-2 py-0.5 rounded" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{s}</span>
                        ))}
                        {f.skills.length > 4 && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>+{f.skills.length - 4}</span>}
                      </div>
                    </td>
                    <td><span className="text-mono-label text-xs" style={{ color: 'var(--text-secondary)' }}>{f.experience} yr</span></td>
                    <td><span className="text-crimson font-bold text-sm">{curr}{f.hourlyRate}/hr</span></td>
                    <td>
                      <span className="text-mono-label px-2 py-1 rounded" style={{ fontSize: '9px', background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color }}>
                        {f.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

    </DashboardLayout>
  )
}
