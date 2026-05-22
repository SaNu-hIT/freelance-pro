'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { projectsApi, worklogsApi } from '@/lib/api'
import api from '@/lib/api'
import { DashboardStats, Project, Worklog } from '@/lib/types'
import { useCurrencySymbol } from '@/lib/store'

const MOCK_STATS: DashboardStats = {
  totalProjects: 24,
  activeProjects: 11,
  delayedProjects: 3,
  completedProjects: 8,
  pendingApprovals: 4,
  totalFreelancers: 18,
  activeFreelancers: 13,
  totalEarnings: 128400,
  pendingPayments: 14200,
}

const MOCK_PROJECTS: Project[] = [
  {
    id: '1', title: 'E-Commerce Platform Rebuild', description: '', budget: 12000,
    deadline: '2025-06-15', status: 'in_progress', priority: 'high',
    clientId: 'c1', client: { id: 'c1', name: 'Acme Corp', email: 'acme@corp.com', role: 'client', createdAt: '' },
    progress: 68, createdAt: '', updatedAt: '',
  },
  {
    id: '2', title: 'Mobile App UI Redesign', description: '', budget: 8500,
    deadline: '2025-05-30', status: 'delayed', priority: 'critical',
    clientId: 'c2', client: { id: 'c2', name: 'Nexus Labs', email: 'nexus@labs.com', role: 'client', createdAt: '' },
    progress: 34, createdAt: '', updatedAt: '',
  },
  {
    id: '3', title: 'API Integration Suite', description: '', budget: 5500,
    deadline: '2025-07-01', status: 'pending_approval', priority: 'medium',
    clientId: 'c3', client: { id: 'c3', name: 'DataFlow Inc', email: 'df@inc.com', role: 'client', createdAt: '' },
    progress: 90, createdAt: '', updatedAt: '',
  },
  {
    id: '4', title: 'Analytics Dashboard', description: '', budget: 7200,
    deadline: '2025-08-10', status: 'assigned', priority: 'medium',
    clientId: 'c4', client: { id: 'c4', name: 'Pulse Media', email: 'pulse@media.com', role: 'client', createdAt: '' },
    progress: 15, createdAt: '', updatedAt: '',
  },
]

const MOCK_WORKLOGS: Worklog[] = [
  {
    id: 'w1', projectId: '1', date: '2025-05-18', hoursWorked: 6, progress: 68,
    tasksCompleted: 'Completed checkout flow, integrated payment gateway',
    freelancerId: 'f1',
    freelancer: { id: 'f1', userId: 'u1', skills: [], experience: 4, hourlyRate: 75, status: 'active', user: { id: 'u1', name: 'Alex Rivera', email: 'alex@dev.com', role: 'freelancer', createdAt: '' } },
    project: MOCK_PROJECTS[0],
    createdAt: '',
  },
  {
    id: 'w2', projectId: '2', date: '2025-05-17', hoursWorked: 4, progress: 34,
    tasksCompleted: 'Wireframes for onboarding screens', blockers: 'Awaiting brand assets',
    freelancerId: 'f2',
    freelancer: { id: 'f2', userId: 'u2', skills: [], experience: 6, hourlyRate: 90, status: 'active', user: { id: 'u2', name: 'Sam Chen', email: 'sam@ux.com', role: 'freelancer', createdAt: '' } },
    project: MOCK_PROJECTS[1],
    createdAt: '',
  },
  {
    id: 'w3', projectId: '3', date: '2025-05-17', hoursWorked: 8, progress: 90,
    tasksCompleted: 'OAuth integration, token refresh mechanism',
    freelancerId: 'f3',
    freelancer: { id: 'f3', userId: 'u3', skills: [], experience: 5, hourlyRate: 80, status: 'active', user: { id: 'u3', name: 'Jordan Lee', email: 'jordan@api.com', role: 'freelancer', createdAt: '' } },
    project: MOCK_PROJECTS[2],
    createdAt: '',
  },
]

interface MetricCardProps {
  label: string
  value: number | string
  trend?: 'up' | 'down' | 'neutral'
  loading?: boolean
  highlight?: boolean
}

function MetricCard({ label, value, trend = 'neutral', loading, highlight }: MetricCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? '#4ade80' : trend === 'down' ? '#f87171' : '#6b7280'

  if (loading) {
    return (
      <div className="glass-card metric-card rounded-lg">
        <div className="animate-pulse space-y-3">
          <div className="h-3 bg-[#3D0000] rounded w-2/3" />
          <div className="h-8 bg-[#3D0000] rounded w-1/2" />
          <div className="h-2 bg-[#3D0000] rounded w-1/3" />
        </div>
      </div>
    )
  }

  return (
    <div
      className="glass-card metric-card rounded-lg"
      style={highlight ? { borderColor: 'rgba(220,20,60,0.5)' } : {}}
    >
      <p className="text-mono-label mb-3">{label}</p>
      <p className="text-2xl font-bold text-primary-ui mb-2">{value}</p>
      <div className="flex items-center gap-1.5">
        <TrendIcon size={12} style={{ color: trendColor }} />
        <span className="text-mono-label" style={{ color: trendColor, fontSize: '9px' }}>
          vs last month
        </span>
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const curr = useCurrencySymbol()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [worklogs, setWorklogs] = useState<Worklog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, projectsRes, worklogsRes] = await Promise.allSettled([
          api.get('/dashboard/stats'),
          projectsApi.getAll({ limit: 8 }),
          worklogsApi.getAll({ limit: 6 }),
        ])

        setStats(statsRes.status === 'fulfilled' ? statsRes.value.data : MOCK_STATS)
        setProjects(projectsRes.status === 'fulfilled' ? (projectsRes.value.data?.data ?? projectsRes.value.data) : MOCK_PROJECTS)
        setWorklogs(worklogsRes.status === 'fulfilled' ? (worklogsRes.value.data?.data ?? worklogsRes.value.data) : MOCK_WORKLOGS)
      } catch {
        setStats(MOCK_STATS)
        setProjects(MOCK_PROJECTS)
        setWorklogs(MOCK_WORKLOGS)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const delayed = projects.filter(p => p.status === 'delayed' || p.status === 'blocked')
  const pending = projects.filter(p => p.status === 'pending_approval')

  return (
    <DashboardLayout allowedRoles={['admin']}>
      {/* Page Header */}
      <div className="mb-8">
        <p className="text-mono-label mb-1">ADMIN PANEL</p>
        <h1 className="text-display text-4xl text-primary-ui">DASHBOARD</h1>
        <p className="text-mono-label mt-1" style={{ color: 'var(--text-muted)' }}>Command Center — Real-time project intelligence</p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <MetricCard label="TOTAL PROJECTS" value={stats?.totalProjects ?? 0} trend="up" loading={loading} />
        <MetricCard label="ACTIVE" value={stats?.activeProjects ?? 0} trend="up" loading={loading} />
        <MetricCard label="DELAYED" value={stats?.delayedProjects ?? 0} trend="down" loading={loading} highlight />
        <MetricCard label="PENDING APPROVAL" value={stats?.pendingApprovals ?? 0} trend="neutral" loading={loading} />
        <MetricCard label="TOTAL FREELANCERS" value={stats?.totalFreelancers ?? 0} trend="up" loading={loading} />
        <MetricCard label="ACTIVE FREELANCERS" value={stats?.activeFreelancers ?? 0} trend="up" loading={loading} />
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        {/* Recent Projects — 60% */}
        <div className="lg:col-span-3 glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-mono-label mb-1">OVERVIEW</p>
              <h2 className="text-primary-ui font-bold text-lg">Recent Projects</h2>
            </div>
            <a href="/admin/projects" className="btn-ghost text-xs py-2 px-4 rounded">View All</a>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse flex gap-4 py-3">
                  <div className="h-4 bg-[#3D0000] rounded flex-1" />
                  <div className="h-4 bg-[#3D0000] rounded w-24" />
                  <div className="h-4 bg-[#3D0000] rounded w-16" />
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <p className="text-center text-mono-label py-8" style={{ color: '#6b7280' }}>No projects found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Client</th>
                    <th>Deadline</th>
                    <th>Progress</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map(p => (
                    <tr key={p.id}>
                      <td>
                        <p className="font-medium text-primary-ui text-sm truncate max-w-[180px]">{p.title}</p>
                      </td>
                      <td>
                        <span className="text-mono-label" style={{ color: '#aaa', fontSize: '11px' }}>
                          {p.client?.name ?? '—'}
                        </span>
                      </td>
                      <td>
                        <span className="text-mono-label" style={{ fontSize: '11px' }}>
                          {new Date(p.deadline).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
                        </span>
                      </td>
                      <td style={{ minWidth: 100 }}>
                        <div className="flex items-center gap-2">
                          <div className="progress-bar flex-1">
                            <div className="progress-fill" style={{ width: `${p.progress}%` }} />
                          </div>
                          <span className="text-crimson text-xs font-bold">{p.progress}%</span>
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={p.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Worklogs — 40% */}
        <div className="lg:col-span-2 glass-card rounded-xl p-6">
          <div className="mb-5">
            <p className="text-mono-label mb-1">ACTIVITY FEED</p>
            <h2 className="text-primary-ui font-bold text-lg">Recent Worklogs</h2>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse glass-card-dark rounded-lg p-4 space-y-2">
                  <div className="h-3 bg-[#3D0000] rounded w-3/4" />
                  <div className="h-2 bg-[#3D0000] rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : worklogs.length === 0 ? (
            <p className="text-center text-mono-label py-8" style={{ color: '#6b7280' }}>No worklogs found</p>
          ) : (
            <div className="space-y-3">
              {worklogs.map(w => (
                <div key={w.id} className="glass-card-dark rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-primary-ui text-sm font-semibold">{w.freelancer?.user.name ?? 'Unknown'}</p>
                      <p className="text-mono-label mt-0.5" style={{ fontSize: '10px', color: '#9ca3af' }}>
                        {w.project?.title ?? `Project #${w.projectId}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-crimson text-sm font-bold">{w.hoursWorked}h</p>
                      <p className="text-mono-label" style={{ fontSize: '9px' }}>
                        {new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <p className="text-mono-label text-xs leading-relaxed truncate" style={{ color: '#9ca3af' }}>
                    {w.tasksCompleted}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="progress-bar flex-1">
                      <div className="progress-fill" style={{ width: `${w.progress}%` }} />
                    </div>
                    <span className="text-crimson text-xs">{w.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Alerts + Pending */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delayed / Blocked Alert */}
        <div className="glass-card rounded-xl p-6" style={{ borderColor: 'rgba(220,20,60,0.5)' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-[#3D0000] flex items-center justify-center">
              <AlertTriangle size={16} className="text-crimson" />
            </div>
            <div>
              <p className="text-mono-label mb-0.5">ATTENTION REQUIRED</p>
              <h2 className="text-primary-ui font-bold">Delayed &amp; Blocked Projects</h2>
            </div>
          </div>

          {delayed.length === 0 ? (
            <p className="text-mono-label text-center py-4" style={{ color: '#4ade80' }}>
              ✓ No delayed or blocked projects
            </p>
          ) : (
            <div className="space-y-3">
              {delayed.map(p => (
                <div
                  key={p.id}
                  className="glass-card-dark rounded-lg p-4 flex items-center justify-between"
                  style={{ borderColor: p.status === 'blocked' ? 'rgba(239,68,68,0.3)' : 'rgba(249,115,22,0.3)' }}
                >
                  <div>
                    <p className="text-primary-ui text-sm font-medium">{p.title}</p>
                    <p className="text-mono-label mt-1" style={{ fontSize: '10px', color: '#9ca3af' }}>
                      Client: {p.client?.name ?? '—'} · Due: {new Date(p.deadline).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Approvals */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-[#3D0000] flex items-center justify-center">
              <Clock size={16} className="text-crimson" />
            </div>
            <div>
              <p className="text-mono-label mb-0.5">REVIEW QUEUE</p>
              <h2 className="text-primary-ui font-bold">Pending Approvals</h2>
            </div>
          </div>

          {pending.length === 0 ? (
            <p className="text-mono-label text-center py-4" style={{ color: 'var(--text-muted)' }}>
              No items pending approval
            </p>
          ) : (
            <div className="space-y-3">
              {pending.map(p => (
                <div key={p.id} className="glass-card-dark rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-primary-ui text-sm font-medium">{p.title}</p>
                    <p className="text-mono-label mt-1" style={{ fontSize: '10px', color: '#9ca3af' }}>
                      {p.client?.name ?? '—'} · {p.progress}% complete
                    </p>
                  </div>
                  <a href="/admin/projects" className="btn-primary text-xs py-2 px-3 rounded">
                    Review
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
