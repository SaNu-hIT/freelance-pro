'use client'

import { useEffect, useState } from 'react'
import {
  Search, AlertTriangle, Paperclip, X, ChevronDown, Eye,
  Clock, TrendingUp, ShieldAlert, Users, ArrowRight, CheckCircle2,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { worklogsApi, projectsApi, freelancersApi } from '@/lib/api'
import { Worklog, Project, FreelancerProfile } from '@/lib/types'
import { localDate, sessionRange } from '@/lib/utils'
import { RunningTasks } from '@/components/ui/RunningTasks'

const today = localDate()

type DateFilter = 'today' | 'week' | 'month' | 'all'

function filterByDate(worklogs: Worklog[], filter: DateFilter): Worklog[] {
  const now = new Date()
  return worklogs.filter(w => {
    const d = new Date(w.date + 'T00:00:00')
    if (filter === 'today') return d.toDateString() === now.toDateString()
    if (filter === 'week') { const a = new Date(now); a.setDate(a.getDate() - 7); return d >= a }
    if (filter === 'month') { const a = new Date(now); a.setMonth(a.getMonth() - 1); return d >= a }
    return true
  })
}

const PRIORITY_COLORS: Record<string, string> = { low: 'var(--fg)', medium: 'var(--fg)', high: 'var(--fg)', critical: 'var(--fg)' }

function StandupCard({ w, onView }: { w: Worklog; onView: () => void }) {
  const hasBlocker = !!w.blockers
  return (
    <div className="glass-card rounded-xl overflow-hidden transition-all hover:border-[rgb(var(--fg-rgb)/0.3)]"
      style={{ borderColor: hasBlocker ? 'rgb(var(--fg-rgb) / 0.3)' : 'var(--input-bg)' }}>
      {/* Card header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
            style={{ background: 'rgb(var(--fg-rgb) / 0.15)', color: 'var(--fg)', border: '1px solid rgb(var(--fg-rgb) / 0.3)' }}>
            {w.freelancer?.user.name.split(' ').map(n => n[0]).join('') ?? '??'}
          </div>
          <div>
            <p className="text-primary-ui font-semibold text-sm leading-tight">{w.freelancer?.user.name ?? '—'}</p>
            <p className="text-mono-label" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {w.project?.title ?? `#${w.projectId}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: 'rgb(var(--fg-rgb) / 0.08)', border: '1px solid rgb(var(--fg-rgb) / 0.2)' }}>
            <Clock size={11} style={{ color: 'var(--fg)' }} />
            <span className="font-bold text-xs" style={{ color: 'var(--fg)' }}>{w.hoursWorked}h</span>
            {sessionRange(w) && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{sessionRange(w)}</span>}
          </div>
          {w.project?.priority && (
            <span className="text-mono-label px-2 py-0.5 rounded text-xs" style={{
              color: PRIORITY_COLORS[w.project.priority] ?? 'rgb(var(--fg-rgb) / .55)',
              background: `color-mix(in srgb, ${PRIORITY_COLORS[w.project.priority] ?? 'rgb(var(--fg-rgb) / .55)'} 9%, transparent)`,
              border: `1px solid color-mix(in srgb, ${PRIORITY_COLORS[w.project.priority] ?? 'rgb(var(--fg-rgb) / .55)'} 25%, transparent)`,
              fontSize: '10px',
            }}>
              {w.project.priority.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 pb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-mono-label" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>PROJECT PROGRESS</span>
          <span className="text-xs font-bold" style={{ color: 'var(--fg)' }}>{w.progress}%</span>
        </div>
        <div className="progress-bar" style={{ height: 3 }}>
          <div className="progress-fill" style={{ width: `${w.progress}%` }} />
        </div>
      </div>

      <div className="px-5 pb-4 space-y-3 border-t border-[var(--input-bg)] pt-3">
        {/* Tasks */}
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle2 size={11} style={{ color: 'var(--fg)' }} />
            <span className="text-mono-label" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>TODAY'S WORK</span>
          </div>
          <p className="text-sm leading-relaxed line-clamp-3" style={{ color: 'var(--text-primary)' }}>
            {w.tasksCompleted}
          </p>
        </div>

        {/* Blockers */}
        {w.blockers && (
          <div className="rounded-lg px-3 py-2.5" style={{ background: 'rgb(var(--fg-rgb) / 0.07)', border: '1px solid rgb(var(--fg-rgb) / 0.25)' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle size={11} style={{ color: 'var(--fg)' }} />
              <span className="text-mono-label" style={{ fontSize: '10px', color: 'var(--fg)' }}>BLOCKER</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--fg)' }}>{w.blockers}</p>
          </div>
        )}

        {/* Next steps */}
        {w.nextSteps && (
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowRight size={11} style={{ color: 'var(--fg)' }} />
              <span className="text-mono-label" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>NEXT</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{w.nextSteps}</p>
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--input-bg)]" style={{ background: 'rgb(var(--bg-rgb) / 0.2)' }}>
        <span className="text-mono-label" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          {new Date(w.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          {w.fileUrls && w.fileUrls.length > 0 && (
            <span className="ml-3 inline-flex items-center gap-1">
              <Paperclip size={9} /> {w.fileUrls.length} file{w.fileUrls.length > 1 ? 's' : ''}
            </span>
          )}
        </span>
        <button onClick={onView} className="flex items-center gap-1.5 text-xs py-1 px-3 rounded transition-colors btn-ghost">
          <Eye size={11} /> Full log
        </button>
      </div>
    </div>
  )
}

export default function AdminWorklogsPage() {
  const [worklogs, setWorklogs] = useState<Worklog[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [freelancers, setFreelancers] = useState<FreelancerProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [freelancerFilter, setFreelancerFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [detailLog, setDetailLog] = useState<Worklog | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [wRes, pRes, fRes] = await Promise.allSettled([
          worklogsApi.getAll({ limit: 1000 }),
          projectsApi.getAll(),
          freelancersApi.getAll(),
        ])
        setWorklogs(wRes.status === 'fulfilled' ? (wRes.value.data?.data ?? wRes.value.data) : [])
        setProjects(pRes.status === 'fulfilled' ? (pRes.value.data?.data ?? pRes.value.data) : [])
        setFreelancers(fRes.status === 'fulfilled' ? (fRes.value.data?.data ?? fRes.value.data) : [])
      } catch {
        setWorklogs([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const byDate = filterByDate(worklogs, dateFilter)
  const filtered = byDate.filter(w => {
    const matchProject = projectFilter === 'all' || w.projectId === projectFilter
    const matchFreelancer = freelancerFilter === 'all' || w.freelancerId === freelancerFilter
    const matchSearch = !search ||
      w.freelancer?.user.name.toLowerCase().includes(search.toLowerCase()) ||
      w.project?.title.toLowerCase().includes(search.toLowerCase()) ||
      w.tasksCompleted.toLowerCase().includes(search.toLowerCase())
    return matchProject && matchFreelancer && matchSearch
  })

  // Stats
  const todayLogs = filterByDate(worklogs, 'today')
  const totalHoursToday = todayLogs.reduce((s, w) => s + Number(w.hoursWorked), 0)
  const blockersToday = todayLogs.filter(w => w.blockers).length
  const activeFreelancersToday = new Set(todayLogs.map(w => w.freelancerId)).size

  const uniqueProjects = [...new Map(worklogs.filter(w => w.project).map(w => [w.projectId, w.project!])).values()]
  const uniqueFreelancers = [...new Map(worklogs.filter(w => w.freelancer).map(w => [w.freelancerId, w.freelancer!])).values()]

  return (
    <DashboardLayout allowedRoles={['admin']}>
      {/* Header */}
      <div className="mb-6">
        <p className="text-mono-label mb-1">DAILY ACTIVITY</p>
        <h1 className="text-display text-4xl text-primary-ui">STANDUP</h1>
        <p className="text-mono-label mt-1" style={{ color: 'var(--text-muted)' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { icon: <Clock size={16} />, label: "HOURS TODAY", value: `${totalHoursToday}h`, color: 'var(--fg)' },
          { icon: <Users size={16} />, label: "ACTIVE TODAY", value: activeFreelancersToday, color: 'var(--fg)' },
          { icon: <ShieldAlert size={16} />, label: "BLOCKERS", value: blockersToday, color: blockersToday > 0 ? 'var(--fg)' : 'var(--fg)' },
        ].map(({ icon, label, value, color }) => (
          <div key={label} className="glass-card-dark rounded-xl px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${color} 9%, transparent)`, color, border: `1px solid color-mix(in srgb, ${color} 19%, transparent)` }}>
              {icon}
            </div>
            <div>
              <p className="text-mono-label mb-0.5" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{label}</p>
              <p className="font-bold text-xl text-primary-ui">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sessions still running (not yet logged) */}
      <div className="mb-6">
        <RunningTasks showWho linkFor={t => `/admin/projects/${t.projectId}`} emptyText="No sessions running right now." />
      </div>

      {/* Filters */}
      <div className="glass-card-dark rounded-xl p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9 py-2.5 text-sm" />
        </div>
        <div className="flex gap-1.5">
          {(['today', 'week', 'month', 'all'] as const).map(d => (
            <button key={d} onClick={() => setDateFilter(d)} className={`px-3 py-2 rounded text-xs transition-all ${dateFilter === d ? 'btn-primary' : 'btn-ghost'}`}>
              {d === 'today' ? 'TODAY' : d === 'week' ? 'THIS WEEK' : d === 'month' ? 'THIS MONTH' : 'ALL TIME'}
            </button>
          ))}
        </div>
        <div className="relative">
          <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="input-field py-2.5 text-sm pr-8 appearance-none" style={{ width: 180 }}>
            <option value="all">All Projects</option>
            {(projects.length > 0 ? projects : uniqueProjects).map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
        </div>
        <div className="relative">
          <select value={freelancerFilter} onChange={e => setFreelancerFilter(e.target.value)} className="input-field py-2.5 text-sm pr-8 appearance-none" style={{ width: 180 }}>
            <option value="all">All Freelancers</option>
            {(freelancers.length > 0 ? freelancers : uniqueFreelancers).map(f => (
              <option key={f.id} value={f.id}>{f.user.name}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-5 animate-pulse space-y-3">
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full" style={{ background: 'rgb(var(--fg-rgb) / 0.1)' }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3 rounded" style={{ background: 'var(--input-bg)', width: '60%' }} />
                  <div className="h-2 rounded" style={{ background: 'var(--input-bg)', width: '80%' }} />
                </div>
              </div>
              <div className="h-2 rounded" style={{ background: 'var(--input-bg)' }} />
              <div className="h-12 rounded" style={{ background: 'var(--input-bg)' }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-xl text-center py-20">
          <TrendingUp size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-mono-label text-lg" style={{ color: 'var(--text-muted)' }}>
            {dateFilter === 'today' ? 'NO LOGS SUBMITTED TODAY' : 'NO WORKLOGS FOUND'}
          </p>
          <p className="text-mono-label mt-2" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {dateFilter === 'today' ? 'Freelancers haven\'t submitted their standup yet.' : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : dateFilter === 'today' || dateFilter === 'week' ? (
        /* Card / Standup View */
        <div>
          {dateFilter === 'week' && (
            /* Group by date for weekly view */
            <>
              {[...new Set(filtered.map(w => w.date))].sort((a, b) => b.localeCompare(a)).map(date => {
                const dayLogs = filtered.filter(w => w.date === date)
                const isToday = date === today
                return (
                  <div key={date} className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: isToday ? 'var(--fg)' : 'var(--track-bg)' }} />
                        <span className="font-bold text-sm" style={{ color: isToday ? 'var(--fg)' : 'var(--text-secondary)' }}>
                          {isToday ? 'TODAY — ' : ''}{new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex-1 h-px" style={{ background: 'var(--input-bg)' }} />
                      <span className="text-mono-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {dayLogs.reduce((s, w) => s + Number(w.hoursWorked), 0)}h · {dayLogs.length} log{dayLogs.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {dayLogs.map(w => <StandupCard key={w.id} w={w} onView={() => setDetailLog(w)} />)}
                    </div>
                  </div>
                )
              })}
            </>
          )}
          {dateFilter === 'today' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(w => <StandupCard key={w.id} w={w} onView={() => setDetailLog(w)} />)}
            </div>
          )}
        </div>
      ) : (
        /* Table View for month / all */
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Freelancer</th>
                  <th>Project</th>
                  <th>Hours</th>
                  <th>Progress</th>
                  <th>Tasks</th>
                  <th>Blockers</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(w => (
                  <tr key={w.id}>
                    <td>
                      <span className="text-mono-label" style={{ fontSize: '11px' }}>
                        {new Date(w.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: '2-digit' })}
                      </span>
                    </td>
                    <td>
                      <p className="text-primary-ui text-sm font-medium">{w.freelancer?.user.name ?? `#${w.freelancerId}`}</p>
                    </td>
                    <td>
                      <span className="text-sm max-w-[160px] truncate block" style={{ color: 'var(--text-secondary)' }}>
                        {w.project?.title ?? `#${w.projectId}`}
                      </span>
                    </td>
                    <td>
                      <span className="text-crimson font-bold text-sm">{w.hoursWorked}h</span>
                      {sessionRange(w) && <span className="block text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{sessionRange(w)}</span>}
                    </td>
                    <td style={{ minWidth: 110 }}>
                      <div className="flex items-center gap-2">
                        <div className="progress-bar flex-1"><div className="progress-fill" style={{ width: `${w.progress}%` }} /></div>
                        <span className="text-crimson text-xs">{w.progress}%</span>
                      </div>
                    </td>
                    <td style={{ maxWidth: 220 }}>
                      <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{w.tasksCompleted}</p>
                    </td>
                    <td>
                      {w.blockers
                        ? <div className="flex items-center gap-1.5"><AlertTriangle size={13} style={{ color: 'var(--fg)' }} /><span className="text-xs" style={{ color: 'var(--fg)' }}>Blocked</span></div>
                        : <span className="text-mono-label" style={{ fontSize: '10px', color: 'var(--fg)' }}>Clear</span>
                      }
                    </td>
                    <td>
                      <button onClick={() => setDetailLog(w)} className="btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-3 rounded">
                        <Eye size={12} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[rgb(var(--bg-rgb)/.92)]" onClick={() => setDetailLog(null)} />
          <div className="glass-card rounded-xl relative z-10 w-full max-w-2xl overflow-hidden" style={{ borderColor: 'rgb(var(--fg-rgb) / 0.4)' }}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--input-bg)]">
              <div>
                <p className="text-mono-label mb-0.5" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>WORKLOG DETAIL</p>
                <h2 className="text-primary-ui font-bold text-lg">
                  {detailLog.freelancer?.user.name ?? 'Unknown'} — {new Date(detailLog.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h2>
              </div>
              <button onClick={() => setDetailLog(null)} className="p-2 rounded glass-card-dark">
                <X size={16} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto" style={{ maxHeight: '70vh' }}>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Hours', value: `${detailLog.hoursWorked}h` },
                  { label: 'Progress', value: `${detailLog.progress}%` },
                  { label: 'Files', value: detailLog.fileUrls?.length ?? 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="glass-card-dark rounded-lg p-4 text-center">
                    <p className="text-mono-label mb-1" style={{ fontSize: '10px' }}>{label.toUpperCase()}</p>
                    <p className="text-crimson font-bold text-2xl">{value}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="label-field">Project</p>
                <p className="text-primary-ui font-medium">{detailLog.project?.title ?? `#${detailLog.projectId}`}</p>
              </div>

              {sessionRange(detailLog) && (
                <div>
                  <p className="label-field">Session</p>
                  <p className="text-primary-ui font-medium">{sessionRange(detailLog)}</p>
                </div>
              )}

              <div>
                <p className="label-field">Tasks Completed</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{detailLog.tasksCompleted}</p>
              </div>

              {detailLog.blockers && (
                <div className="rounded-lg p-4" style={{ background: 'rgb(var(--fg-rgb) / 0.07)', border: '1px solid rgb(var(--fg-rgb) / 0.3)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} style={{ color: 'var(--fg)' }} />
                    <p className="label-field" style={{ color: 'var(--fg)', marginBottom: 0 }}>Blocker</p>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--fg)' }}>{detailLog.blockers}</p>
                </div>
              )}

              {detailLog.nextSteps && (
                <div>
                  <p className="label-field">Next Steps</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{detailLog.nextSteps}</p>
                </div>
              )}

              {detailLog.fileUrls && detailLog.fileUrls.length > 0 && (
                <div>
                  <p className="label-field">Attachments</p>
                  <div className="space-y-2 mt-2">
                    {detailLog.fileUrls.map((url, i) => (
                      <div key={i} className="glass-card-dark rounded-lg p-3 flex items-center gap-3">
                        <Paperclip size={14} style={{ color: 'var(--fg)' }} />
                        <span className="text-mono-label flex-1" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{url}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[var(--input-bg)] flex justify-end">
              <button onClick={() => setDetailLog(null)} className="btn-ghost rounded text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
