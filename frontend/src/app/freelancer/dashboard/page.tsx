'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthStore, useCurrencySymbol } from '@/lib/store'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { projectsApi, worklogsApi, paymentsApi, tasksApi } from '@/lib/api'
import { Project, Worklog, ProjectStatus, Payment, ProjectTask } from '@/lib/types'
import { Briefcase, Clock, DollarSign, CheckSquare, Square, AlertTriangle, Shield, ChevronRight } from 'lucide-react'
import { useFreelancerStore } from '@/lib/freelancerStore'
import { freelancersApi } from '@/lib/api'
import { localDate, apiError } from '@/lib/utils'
import ErrorBanner from '@/components/ui/ErrorBanner'
import { InProgressTasks } from '@/components/ui/InProgressTasks'
import { HoursSummary } from '@/components/ui/HoursSummary'
import { InProgressChip } from '@/components/ui/TaskTimer'

function isOverdue(deadline: string) {
  return new Date(deadline) < new Date()
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

function fmtHours(h: number) {
  return h % 1 === 0 ? `${h}h` : `${h}h`
}

export default function FreelancerDashboardPage() {
  const { user } = useAuthStore()
  const curr = useCurrencySymbol()
  const fetchAvailability = useFreelancerStore(s => s.fetchAvailability)
  const getAvailability   = useFreelancerStore(s => s.getAvailability)
  const userId = user?.id ?? 'demo-freelancer'

  // null until the profile has loaded, so a failed load doesn't show a made-up status
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [hourlyRate, setHourlyRate] = useState<number | null>(null)

  // Load availability when profileId is known
  useEffect(() => {
    if (profileId) fetchAvailability(profileId)
  }, [profileId]) // eslint-disable-line

  const avail = profileId ? getAvailability(profileId) : getAvailability(userId)
  const activeDays = Object.values(avail.schedule).filter(d => d.enabled).length
  const [projects, setProjects] = useState<Project[]>([])
  const [worklogs, setWorklogs] = useState<Worklog[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [tasks, setTasks] = useState<ProjectTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  }).toUpperCase()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'GOOD MORNING,' : hour < 17 ? 'GOOD AFTERNOON,' : 'GOOD EVENING,'

  useEffect(() => {
    async function load() {
      try {
        const [fRes, pRes, wRes, payRes] = await Promise.all([
          freelancersApi.getAll(),
          projectsApi.getAll(),
          worklogsApi.getAll({ limit: 1000 }),
          paymentsApi.getAll(),
        ])
        const list = fRes.data?.data ?? fRes.data ?? []
        const fp = Array.isArray(list) ? list[0] : list
        if (fp) {
          setProfileId(fp.id ?? null)
          // decimals arrive as strings
          setHourlyRate(Number(fp.hourlyRate) || 0)
          const stage = fp.onboardingStage ?? fp.status
          if (stage === 'approved' || fp.status === 'active') setApprovalStatus('approved')
          else if (stage === 'rejected' || fp.status === 'inactive') setApprovalStatus('rejected')
          else setApprovalStatus('pending')
        }
        const projs: Project[] = pRes.data?.data ?? pRes.data ?? []
        setProjects(projs)
        setWorklogs(wRes.data?.data ?? wRes.data ?? [])
        setPayments(payRes.data?.data ?? payRes.data ?? [])
        // Only tasks the admin assigned to this freelancer, across their projects
        const taskLists = await Promise.all(projs.map(p => tasksApi.getByProject(p.id)))
        setTasks(taskLists.flatMap(r => (r.data ?? []) as ProjectTask[]).filter(t => fp && t.assignedFreelancerId === fp.id))
      } catch (err) {
        setError(apiError(err, 'Could not load your dashboard.'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const todayStr = localDate()
  const todayHours = worklogs
    .filter(w => w.date.startsWith(todayStr))
    .reduce((s, w) => s + w.hoursWorked, 0)

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const weekHours = worklogs
    .filter(w => new Date(w.date + 'T00:00:00') >= weekStart)
    .reduce((s, w) => s + w.hoursWorked, 0)

  // Payments the admin has recorded for you that are not fully paid yet
  const pendingEarnings = payments
    .filter(p => p.status === 'pending' || p.status === 'partial')
    .reduce((s, p) => s + Number(p.netAmount), 0)

  const [inProgressKey, setInProgressKey] = useState(0)
  const [savingTask, setSavingTask] = useState<string | null>(null)

  async function toggleInProgress(task: ProjectTask) {
    setSavingTask(task.id)
    try {
      const res = await tasksApi.update(task.id, { inProgress: !task.inProgressAt })
      setTasks(ts => ts.map(t => (t.id === task.id ? { ...t, ...res.data } : t)))
      setInProgressKey(k => k + 1)
    } catch (err) {
      setError(apiError(err, 'Could not update the task.'))
    } finally {
      setSavingTask(null)
    }
  }

  // Open tasks first
  const myTasks = [...tasks].sort((a, b) => Number(a.completed) - Number(b.completed))

  const assignedCount = projects.filter(p => ['assigned', 'in_progress'].includes(p.status)).length

  const stats = [
    { label: 'Assigned Projects', value: assignedCount, icon: <Briefcase size={20} className="text-[var(--fg)]" /> },
    { label: "Today's Hours", value: fmtHours(todayHours), icon: <Clock size={20} className="text-[var(--fg)]" /> },
    { label: 'This Week Hours', value: fmtHours(weekHours), icon: <Clock size={20} className="text-[var(--fg)]" /> },
    { label: 'Pending Earnings', value: `${curr}${pendingEarnings.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, icon: <DollarSign size={20} className="text-[var(--fg)]" /> },
  ]

  const hasWorklogToday = worklogs.some(w => w.date.startsWith(todayStr))

  return (
    <DashboardLayout allowedRoles={['freelancer']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-mono-label text-xs tracking-widest mb-1">{greeting}</p>
            <h1 className="text-display text-4xl text-gradient leading-none">
              {user?.name?.toUpperCase() ?? 'FREELANCER'}
            </h1>
          </div>
          <span className="text-mono-label text-xs text-[var(--text-muted)]">{today}</span>
        </div>

        {error && <ErrorBanner title="Dashboard failed to load" message={error} />}

        {/* ── Approval status ── */}
        {(approvalStatus === 'pending' || approvalStatus === 'rejected') && (
          <Link href="/freelancer/profile"
            className="flex items-center gap-4 rounded-2xl p-4 transition-all hover:opacity-90"
            style={{
              background: approvalStatus === 'rejected' ? 'rgb(var(--fg-rgb) / 0.06)' : 'rgb(var(--fg-rgb) / 0.06)',
              border: `1px solid ${approvalStatus === 'rejected' ? 'rgb(var(--fg-rgb) / 0.25)' : 'rgb(var(--fg-rgb) / 0.25)'}`,
            }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: approvalStatus === 'rejected' ? 'rgb(var(--fg-rgb) / 0.12)' : 'rgb(var(--fg-rgb) / 0.12)',
                color: approvalStatus === 'rejected' ? 'var(--fg)' : 'var(--fg)',
              }}>
              <AlertTriangle size={18} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm" style={{ color: approvalStatus === 'rejected' ? 'var(--fg)' : 'var(--fg)' }}>
                {approvalStatus === 'rejected' ? 'Application Not Approved' : 'Application Under Review'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {approvalStatus === 'rejected'
                  ? 'Your application was not approved. Check your profile for details.'
                  : 'Our team is reviewing your profile. Complete your bio, skills, experience and rate for faster approval.'}
              </p>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
          </Link>
        )}

        {approvalStatus === 'approved' && (
          <div className="flex items-center gap-4 rounded-2xl p-4"
            style={{ background: 'rgb(var(--fg-rgb) / 0.05)', border: '1px solid rgb(var(--fg-rgb) / 0.2)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgb(var(--fg-rgb) / 0.1)', color: 'var(--fg)' }}>
              <Shield size={18} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm" style={{ color: 'var(--fg)' }}>Active — Approved Freelancer</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Your profile is live. You can be assigned to projects.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                style={{ background: 'rgb(var(--fg-rgb) / 0.08)', border: '1px solid rgb(var(--fg-rgb) / 0.2)', color: 'var(--fg)' }}>
                <Clock size={11} /> {avail.hoursPerWeek}h/wk
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                style={{ background: 'rgb(var(--fg-rgb) / 0.08)', border: '1px solid rgb(var(--fg-rgb) / 0.2)', color: 'var(--fg)' }}>
                {activeDays}d/wk available
              </div>
            </div>
          </div>
        )}

        {!error && (<>
        {/* Stats */}
        <div className="grid grid-cols-5 gap-4">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="glass-card metric-card rounded-lg animate-pulse h-24" />
              ))
            : stats.map((s) => (
                <div key={s.label} className="glass-card metric-card rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-mono-label text-[10px]">{s.label}</span>
                    {s.icon}
                  </div>
                  <p className="text-primary-ui text-2xl font-bold text-display">{s.value}</p>
                </div>
              ))}
          {/* Rate and weekly hours live on the profile, so the card opens it */}
          {!loading && (
            <Link href="/freelancer/profile" className="glass-card metric-card rounded-lg block transition-all hover:opacity-90">
              <div className="flex items-center justify-between mb-3">
                <span className="text-mono-label text-[10px]">Rate &amp; Hours</span>
                <ChevronRight size={16} className="text-[var(--text-muted)]" />
              </div>
              <p className="text-primary-ui text-2xl font-bold text-display">
                {hourlyRate ? `${curr}${hourlyRate}/hr` : 'Set rate'}
              </p>
              <p className="text-mono-label text-[10px] mt-1">{avail.hoursPerWeek}h/wk available</p>
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InProgressTasks key={inProgressKey} linkFor={() => '/freelancer/worklogs'} emptyText="Nothing in progress. Mark a task below or start a timer from Worklogs." />
          <HoursSummary />
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Today's Tasks */}
          <div className="space-y-4">
            <div className="glass-card rounded-lg p-5">
              <h2 className="text-mono-label text-xs tracking-widest mb-4">MY TASKS</h2>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-8 bg-[var(--input-bg)] rounded animate-pulse" />
                  ))}
                </div>
              ) : myTasks.length === 0 ? (
                <p className="text-mono-label text-center py-6">NO TASKS ASSIGNED TO YOU</p>
              ) : (
                <ul className="space-y-2">
                  {myTasks.map((task) => {
                    const proj = projects.find(p => p.id === task.projectId)
                    const overdue = proj ? isOverdue(proj.deadline) : false
                    return (
                      <li key={task.id} className="flex items-start gap-3 py-2 border-b border-[var(--input-bg)] last:border-0">
                        <span className={`mt-0.5 shrink-0 ${task.completed ? 'text-[var(--fg)]' : 'text-[var(--text-muted)]'}`}>
                          {task.completed ? <CheckSquare size={15} /> : <Square size={15} />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${task.completed ? 'line-through text-[var(--text-muted)]' : 'text-primary-ui'}`}>
                            {task.title}
                          </p>
                          <div className="mt-1 empty:hidden"><InProgressChip task={task} /></div>
                          {proj && (
                            <p className={`text-mono-label text-[10px] mt-0.5 ${overdue ? 'text-[var(--fg)]' : 'text-[var(--text-muted)]'}`}>
                              {overdue && <AlertTriangle size={10} className="inline mr-1" />}
                              {proj.title} — Due {fmtDate(proj.deadline)}
                            </p>
                          )}
                        </div>
                        {!task.completed && (
                          <button type="button" onClick={() => toggleInProgress(task)} disabled={savingTask === task.id}
                            className="text-mono-label text-[10px] px-2 py-1 rounded shrink-0 border border-[var(--input-bg)] hover:border-[var(--fg)] transition-colors disabled:opacity-50"
                            title={task.inProgressAt ? 'Move back to to-do' : 'Mark as in progress'}>
                            {task.inProgressAt ? 'TO-DO' : 'START'}
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Worklog Reminder */}
            {!hasWorklogToday && (
              <div className="glass-card rounded-lg p-5 border-l-4 border-[var(--fg)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-mono-label text-[10px] mb-1">REMINDER</p>
                    <p className="text-primary-ui font-semibold text-sm">Submit today's worklog</p>
                    <p className="text-[var(--text-muted)] text-xs mt-1">Don't forget to log your hours before EOD.</p>
                  </div>
                  <Link href="/freelancer/worklogs">
                    <button className="btn-primary text-xs px-4 py-2 rounded">LOG NOW</button>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Active Projects */}
          <div className="glass-card rounded-lg p-5">
            <h2 className="text-mono-label text-xs tracking-widest mb-4">ACTIVE PROJECTS</h2>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-[var(--input-bg)] rounded animate-pulse" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <p className="text-mono-label text-center py-6">NO ACTIVE PROJECTS</p>
            ) : (
              <ul className="space-y-4">
                {projects.filter(p => p.status !== 'completed').map((p) => (
                  <li key={p.id} className="pb-4 border-b border-[var(--input-bg)] last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-primary-ui text-sm font-semibold truncate max-w-[180px]">{p.title}</p>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="progress-bar mb-1">
                      <div className="progress-fill" style={{ width: `${p.progress}%` }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-mono-label text-[10px]">{p.progress}% complete</span>
                      <span className={`text-mono-label text-[10px] ${isOverdue(p.deadline) ? 'text-[var(--fg)]' : 'text-[var(--text-muted)]'}`}>
                        {isOverdue(p.deadline) && <AlertTriangle size={9} className="inline mr-1" />}
                        Due {fmtDate(p.deadline)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Recent Worklogs */}
        <div className="glass-card rounded-lg p-5">
          <h2 className="text-mono-label text-xs tracking-widest mb-4">RECENT WORKLOGS</h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-[var(--input-bg)] rounded animate-pulse" />
              ))}
            </div>
          ) : worklogs.length === 0 ? (
            <p className="text-mono-label text-center py-6">NO WORKLOGS YET</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Project</th>
                  <th>Hours</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {worklogs.slice(0, 5).map((w) => {
                  const proj = projects.find(p => p.id === w.projectId)
                  return (
                    <tr key={w.id}>
                      <td className="text-mono-label text-[11px]">{fmtDate(w.date)}</td>
                      <td className="text-primary-ui text-sm">{proj?.title ?? w.projectId}</td>
                      <td className="text-[var(--fg)] font-semibold">{w.hoursWorked}h</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="progress-bar flex-1 max-w-[80px]">
                            <div className="progress-fill" style={{ width: `${w.progress}%` }} />
                          </div>
                          <span className="text-mono-label text-[10px]">{w.progress}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        </>)}
      </div>
    </DashboardLayout>
  )
}
