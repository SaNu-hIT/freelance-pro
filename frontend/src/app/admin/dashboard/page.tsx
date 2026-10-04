'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Clock } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { dashboardApi, projectsApi, worklogsApi } from '@/lib/api'
import { DashboardStats, Project, Worklog } from '@/lib/types'
import { apiError } from '@/lib/utils'
import { useCurrencySymbol } from '@/lib/store'
import ErrorBanner from '@/components/ui/ErrorBanner'
import { InProgressTasks } from '@/components/ui/InProgressTasks'
import { HoursSummary } from '@/components/ui/HoursSummary'
import { LiveSessions } from '@/components/ui/LiveSessions'

interface MetricCardProps {
  label: string
  value: number | string
  note?: string
  loading?: boolean
  highlight?: boolean
}

function MetricCard({ label, value, note, loading, highlight }: MetricCardProps) {

  if (loading) {
    return (
      <div className="glass-card metric-card rounded-lg">
        <div className="animate-pulse space-y-3">
          <div className="h-3 bg-[var(--skeleton)] rounded w-2/3" />
          <div className="h-8 bg-[var(--skeleton)] rounded w-1/2" />
          <div className="h-2 bg-[var(--skeleton)] rounded w-1/3" />
        </div>
      </div>
    )
  }

  return (
    <div
      className="glass-card metric-card rounded-lg"
      style={highlight ? { borderColor: 'rgb(var(--fg-rgb) / 0.5)' } : {}}
    >
      <p className="text-mono-label mb-3">{label}</p>
      <p className="text-2xl font-bold text-primary-ui mb-2">{value}</p>
      {note && (
        <span className="text-mono-label" style={{ color: 'rgb(var(--fg-rgb) / .55)', fontSize: '9px' }}>
          {note}
        </span>
      )}
    </div>
  )
}

export default function AdminDashboardPage() {
  const curr = useCurrencySymbol()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [worklogs, setWorklogs] = useState<Worklog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchAll = async () => {
      const [statsRes, projectsRes, worklogsRes] = await Promise.allSettled([
        dashboardApi.getStats(),
        projectsApi.getAll(),
        worklogsApi.getAll({ limit: 6 }),
      ])

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)
      if (projectsRes.status === 'fulfilled') setProjects(projectsRes.value.data?.data ?? projectsRes.value.data)
      if (worklogsRes.status === 'fulfilled') setWorklogs(worklogsRes.value.data?.data ?? worklogsRes.value.data)
      const failed = [statsRes, projectsRes, worklogsRes].find(r => r.status === 'rejected')
      if (failed) setError(apiError(failed.reason, 'Could not load some dashboard data'))
      setLoading(false)
    }
    fetchAll()
  }, [])

  // Every project is fetched so these lists are complete; only the display is capped
  const recent = projects.slice(0, 8)
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

      {error && (
        <div className="mb-6">
          <ErrorBanner title="Dashboard data unavailable" message={error} onClose={() => setError('')} />
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <MetricCard label="TOTAL PROJECTS" value={stats?.totalProjects ?? 0} note={`+${stats?.newProjectsLast30Days ?? 0} in last 30 days`} loading={loading} />
        <MetricCard label="ACTIVE" value={stats?.activeProjects ?? 0} loading={loading} />
        <MetricCard label="DELAYED" value={stats?.delayedProjects ?? 0} loading={loading} highlight />
        <MetricCard label="PENDING APPROVAL" value={stats?.pendingApprovals ?? 0} loading={loading} />
        <MetricCard label="TOTAL FREELANCERS" value={stats?.totalFreelancers ?? 0} note={`+${stats?.newFreelancersLast30Days ?? 0} in last 30 days`} loading={loading} />
        <MetricCard label="ACTIVE FREELANCERS" value={stats?.activeFreelancers ?? 0} loading={loading} />
      </div>

      {/* Work in progress and hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <InProgressTasks showWho linkFor={t => `/admin/projects/${t.projectId}`} emptyText="No tasks in progress." />
        <HoursSummary showFreelancers linkFor={id => `/admin/projects/${id}`} />
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
                  <div className="h-4 bg-[var(--skeleton)] rounded flex-1" />
                  <div className="h-4 bg-[var(--skeleton)] rounded w-24" />
                  <div className="h-4 bg-[var(--skeleton)] rounded w-16" />
                </div>
              ))}
            </div>
          ) : recent.length === 0 ? (
            <p className="text-center text-mono-label py-8" style={{ color: 'var(--text-muted)' }}>No projects found</p>
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
                  {recent.map(p => (
                    <tr key={p.id}>
                      <td>
                        <p className="font-medium text-primary-ui text-sm truncate max-w-[180px]">{p.title}</p>
                      </td>
                      <td>
                        <span className="text-mono-label" style={{ color: 'rgb(var(--fg-rgb) / .55)', fontSize: '11px' }}>
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

          <LiveSessions showWho />

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse glass-card-dark rounded-lg p-4 space-y-2">
                  <div className="h-3 bg-[var(--skeleton)] rounded w-3/4" />
                  <div className="h-2 bg-[var(--skeleton)] rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : worklogs.length === 0 ? (
            <p className="text-center text-mono-label py-8" style={{ color: 'var(--text-muted)' }}>No worklogs found</p>
          ) : (
            <div className="space-y-3">
              {worklogs.map(w => (
                <div key={w.id} className="glass-card-dark rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-primary-ui text-sm font-semibold">{w.freelancer?.user.name ?? 'Unknown'}</p>
                      <p className="text-mono-label mt-0.5" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
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
                  <p className="text-mono-label text-xs leading-relaxed truncate" style={{ color: 'var(--text-muted)' }}>
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
        <div className="glass-card rounded-xl p-6" style={{ borderColor: 'rgb(var(--fg-rgb) / 0.5)' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-[var(--skeleton)] flex items-center justify-center">
              <AlertTriangle size={16} className="text-crimson" />
            </div>
            <div>
              <p className="text-mono-label mb-0.5">ATTENTION REQUIRED</p>
              <h2 className="text-primary-ui font-bold">Delayed &amp; Blocked Projects</h2>
            </div>
          </div>

          {delayed.length === 0 ? (
            <p className="text-mono-label text-center py-4" style={{ color: 'var(--fg)' }}>
              ✓ No delayed or blocked projects
            </p>
          ) : (
            <div className="space-y-3">
              {delayed.slice(0, 6).map(p => (
                <div
                  key={p.id}
                  className="glass-card-dark rounded-lg p-4 flex items-center justify-between"
                  style={{ borderColor: p.status === 'blocked' ? 'rgb(var(--fg-rgb) / 0.3)' : 'rgb(var(--fg-rgb) / 0.3)' }}
                >
                  <div>
                    <p className="text-primary-ui text-sm font-medium">{p.title}</p>
                    <p className="text-mono-label mt-1" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
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
            <div className="w-8 h-8 rounded-lg bg-[var(--skeleton)] flex items-center justify-center">
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
              {pending.slice(0, 6).map(p => (
                <div key={p.id} className="glass-card-dark rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-primary-ui text-sm font-medium">{p.title}</p>
                    <p className="text-mono-label mt-1" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
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
