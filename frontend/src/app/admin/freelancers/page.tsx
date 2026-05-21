'use client'

import { useEffect, useState } from 'react'
import { Search, CheckCircle, Eye, User } from 'lucide-react'
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
  inactive: { bg: 'rgba(156,163,175,0.1)', border: 'rgba(156,163,175,0.3)', color: '#9ca3af' },
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function AdminFreelancersPage() {
  const curr = useCurrencySymbol()
  const [freelancers, setFreelancers] = useState<FreelancerProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'inactive'>('all')
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [detailFreelancer, setDetailFreelancer] = useState<FreelancerProfile | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await freelancersApi.getAll()
        setFreelancers(res.data?.data ?? res.data)
      } catch {
        setFreelancers(MOCK_FREELANCERS)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleApprove = async (id: string) => {
    setApprovingId(id)
    try {
      await freelancersApi.approve(id)
      setFreelancers(prev => prev.map(f => f.id === id ? { ...f, status: 'active' } : f))
    } catch {
      setFreelancers(prev => prev.map(f => f.id === id ? { ...f, status: 'active' } : f))
    } finally {
      setApprovingId(null)
    }
  }

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
        <h1 className="text-display text-4xl text-white">FREELANCERS</h1>
        <p className="text-mono-label mt-1" style={{ color: 'rgba(240,240,242,0.35)' }}>Manage your freelancer network</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'TOTAL', value: counts.total, color: '#DC143C' },
          { label: 'ACTIVE', value: counts.active, color: '#4ade80' },
          { label: 'PENDING APPROVAL', value: counts.pending, color: '#fbbf24' },
          { label: 'INACTIVE', value: counts.inactive, color: '#9ca3af' },
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
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(240,240,242,0.35)' }} />
          <input
            type="text"
            placeholder="Search by name, email, or skill..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9 py-2.5 text-sm"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'pending', 'inactive'] as const).map(s => (
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
      </div>

      {/* Freelancers Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-6 animate-pulse space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#3D0000]" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-[#3D0000] rounded w-3/4" />
                  <div className="h-3 bg-[#3D0000] rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-[#3D0000] rounded" />
              <div className="flex gap-2">
                <div className="h-6 bg-[#3D0000] rounded w-16" />
                <div className="h-6 bg-[#3D0000] rounded w-20" />
                <div className="h-6 bg-[#3D0000] rounded w-14" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <User size={32} className="mx-auto mb-4" style={{ color: 'rgba(240,240,242,0.35)' }} />
          <p className="text-mono-label text-lg" style={{ color: 'rgba(240,240,242,0.35)' }}>NO FREELANCERS FOUND</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(f => {
            const sc = STATUS_COLORS[f.status]
            return (
              <div key={f.id} className="glass-card rounded-xl p-6 flex flex-col gap-4 transition-all hover:border-[#DC143C]" style={{ cursor: 'default' }}>
                {/* Avatar + Name */}
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm"
                    style={{ background: 'linear-gradient(135deg, #8B0000, #DC143C)' }}
                  >
                    {getInitials(f.user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-base truncate">{f.user.name}</p>
                    <p className="text-mono-label truncate" style={{ fontSize: '11px', color: '#9ca3af' }}>
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
                  <p className="text-sm leading-relaxed line-clamp-2" style={{ color: '#9ca3af' }}>{f.bio}</p>
                )}

                {/* Skills */}
                <div className="flex flex-wrap gap-1.5">
                  {f.skills.slice(0, 5).map(skill => (
                    <span
                      key={skill}
                      className="glass-card-dark text-mono-label px-2 py-0.5 rounded"
                      style={{ fontSize: '10px', color: '#d1d5db' }}
                    >
                      {skill}
                    </span>
                  ))}
                  {f.skills.length > 5 && (
                    <span className="text-mono-label px-2 py-0.5 rounded" style={{ fontSize: '10px', color: 'rgba(240,240,242,0.35)' }}>
                      +{f.skills.length - 5}
                    </span>
                  )}
                </div>

                {/* Meta */}
                <div className="flex items-center gap-4 text-mono-label" style={{ fontSize: '11px' }}>
                  <span style={{ color: '#9ca3af' }}>{f.experience} yr exp</span>
                  <span className="text-crimson font-bold">{curr}{f.hourlyRate}/hr</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-[rgba(255,255,255,0.08)]">
                  {f.status === 'pending' && (
                    <button
                      onClick={() => handleApprove(f.id)}
                      disabled={approvingId === f.id}
                      className="btn-primary flex items-center gap-1.5 rounded text-xs py-2 px-4 flex-1"
                    >
                      <CheckCircle size={13} />
                      {approvingId === f.id ? 'Approving...' : 'Approve'}
                    </button>
                  )}
                  <button
                    onClick={() => setDetailFreelancer(f)}
                    className="btn-ghost flex items-center gap-1.5 rounded text-xs py-2 px-4 flex-1"
                  >
                    <Eye size={13} />
                    View Details
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      {detailFreelancer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDetailFreelancer(null)} />
          <div className="glass-card rounded-xl p-8 relative z-10 w-full max-w-lg" style={{ borderColor: 'rgba(220,20,60,0.4)' }}>
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl"
                  style={{ background: 'linear-gradient(135deg, #8B0000, #DC143C)' }}
                >
                  {getInitials(detailFreelancer.user.name)}
                </div>
                <div>
                  <h2 className="text-white font-bold text-xl">{detailFreelancer.user.name}</h2>
                  <p className="text-mono-label" style={{ fontSize: '11px', color: '#9ca3af' }}>
                    {detailFreelancer.user.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailFreelancer(null)}
                className="p-2 rounded glass-card-dark"
              >
                <Search size={14} style={{ color: 'rgba(240,240,242,0.35)' }} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="label-field">Bio</p>
                <p className="text-sm leading-relaxed" style={{ color: '#d1d5db' }}>
                  {detailFreelancer.bio || 'No bio provided.'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="label-field">Experience</p>
                  <p className="text-white font-bold">{detailFreelancer.experience} years</p>
                </div>
                <div>
                  <p className="label-field">Hourly Rate</p>
                  <p className="text-crimson font-bold">{curr}{detailFreelancer.hourlyRate}/hr</p>
                </div>
              </div>
              <div>
                <p className="label-field">Skills</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {detailFreelancer.skills.map(skill => (
                    <span key={skill} className="glass-card-dark text-mono-label px-3 py-1 rounded" style={{ fontSize: '11px', color: '#d1d5db' }}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="label-field">Member Since</p>
                <p className="text-mono-label" style={{ color: '#9ca3af' }}>
                  {new Date(detailFreelancer.user.createdAt || '').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-[rgba(255,255,255,0.08)] flex justify-end gap-3">
              {detailFreelancer.status === 'pending' && (
                <button
                  onClick={() => { handleApprove(detailFreelancer.id); setDetailFreelancer(null) }}
                  className="btn-primary rounded flex items-center gap-2 text-sm"
                >
                  <CheckCircle size={14} />
                  Approve Freelancer
                </button>
              )}
              <button onClick={() => setDetailFreelancer(null)} className="btn-ghost rounded text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
