'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthStore, useCurrencySymbol } from '@/lib/store'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { projectsApi, worklogsApi } from '@/lib/api'
import { Project, Worklog, ProjectStatus } from '@/lib/types'
import { Briefcase, Clock, DollarSign, CheckSquare, Square, AlertTriangle } from 'lucide-react'

const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    title: 'E-Commerce Platform Redesign',
    description: 'Full redesign of the client shopping experience.',
    budget: 4500,
    deadline: new Date(Date.now() + 3 * 86400000).toISOString(),
    status: 'in_progress',
    priority: 'high',
    clientId: 'c1',
    progress: 65,
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Mobile App Backend API',
    description: 'REST API development for the iOS/Android app.',
    budget: 3200,
    deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
    status: 'assigned',
    priority: 'medium',
    clientId: 'c2',
    progress: 30,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Dashboard Analytics Module',
    description: 'Build analytics and reporting dashboard.',
    budget: 2100,
    deadline: new Date(Date.now() - 2 * 86400000).toISOString(),
    status: 'delayed',
    priority: 'critical',
    clientId: 'c1',
    progress: 80,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const MOCK_WORKLOGS: Worklog[] = [
  {
    id: 'w1',
    projectId: '1',
    freelancerId: 'f1',
    date: new Date(Date.now() - 86400000).toISOString(),
    hoursWorked: 6.5,
    tasksCompleted: 'Implemented product listing page, fixed responsive issues.',
    progress: 65,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'w2',
    projectId: '2',
    freelancerId: 'f1',
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
    hoursWorked: 4,
    tasksCompleted: 'Set up database schema, created user auth endpoints.',
    progress: 30,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'w3',
    projectId: '3',
    freelancerId: 'f1',
    date: new Date(Date.now() - 3 * 86400000).toISOString(),
    hoursWorked: 7,
    tasksCompleted: 'Chart components, data aggregation layer.',
    progress: 80,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
]

const TASKS = [
  { id: 1, label: 'Review PR feedback on product listing', projectId: '1', done: true },
  { id: 2, label: 'Fix mobile nav overflow bug', projectId: '1', done: false },
  { id: 3, label: 'Write unit tests for auth endpoints', projectId: '2', done: false },
  { id: 4, label: 'Push chart hotfix to staging', projectId: '3', done: true },
  { id: 5, label: 'Update progress in Freelance Pro', projectId: '2', done: false },
]

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
  const [projects, setProjects] = useState<Project[]>([])
  const [worklogs, setWorklogs] = useState<Worklog[]>([])
  const [loading, setLoading] = useState(true)

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
        const [pRes, wRes] = await Promise.all([
          projectsApi.getAll(),
          worklogsApi.getAll(),
        ])
        setProjects(pRes.data?.data ?? pRes.data ?? MOCK_PROJECTS)
        setWorklogs(wRes.data?.data ?? wRes.data ?? MOCK_WORKLOGS)
      } catch {
        setProjects(MOCK_PROJECTS)
        setWorklogs(MOCK_WORKLOGS)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const todayStr = new Date().toISOString().split('T')[0]
  const todayHours = worklogs
    .filter(w => w.date.startsWith(todayStr))
    .reduce((s, w) => s + w.hoursWorked, 0)

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekHours = worklogs
    .filter(w => new Date(w.date) >= weekStart)
    .reduce((s, w) => s + w.hoursWorked, 0)

  const pendingEarnings = projects
    .filter(p => ['in_progress', 'assigned'].includes(p.status))
    .reduce((s, p) => s + (p.budget * p.progress) / 100, 0)

  const assignedCount = projects.filter(p => ['assigned', 'in_progress'].includes(p.status)).length

  const stats = [
    { label: 'Assigned Projects', value: assignedCount, icon: <Briefcase size={20} className="text-[#DC143C]" /> },
    { label: "Today's Hours", value: fmtHours(todayHours), icon: <Clock size={20} className="text-[#DC143C]" /> },
    { label: 'This Week Hours', value: fmtHours(weekHours), icon: <Clock size={20} className="text-[#DC143C]" /> },
    { label: 'Pending Earnings', value: `${curr}${pendingEarnings.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, icon: <DollarSign size={20} className="text-[#DC143C]" /> },
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
          <span className="text-mono-label text-xs text-[rgba(240,240,242,0.4)]">{today}</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass-card metric-card rounded-lg animate-pulse h-24" />
              ))
            : stats.map((s) => (
                <div key={s.label} className="glass-card metric-card rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-mono-label text-[10px]">{s.label}</span>
                    {s.icon}
                  </div>
                  <p className="text-white text-2xl font-bold text-display">{s.value}</p>
                </div>
              ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Today's Tasks */}
          <div className="space-y-4">
            <div className="glass-card rounded-lg p-5">
              <h2 className="text-mono-label text-xs tracking-widest mb-4">TODAY'S TASKS</h2>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-8 bg-[rgba(255,255,255,0.06)] rounded animate-pulse" />
                  ))}
                </div>
              ) : TASKS.length === 0 ? (
                <p className="text-mono-label text-center py-6">NO TASKS FOUND</p>
              ) : (
                <ul className="space-y-2">
                  {TASKS.map((task) => {
                    const proj = projects.find(p => p.id === task.projectId)
                    const overdue = proj ? isOverdue(proj.deadline) : false
                    return (
                      <li key={task.id} className="flex items-start gap-3 py-2 border-b border-[rgba(255,255,255,0.08)] last:border-0">
                        <span className={`mt-0.5 shrink-0 ${task.done ? 'text-[#DC143C]' : 'text-[rgba(240,240,242,0.4)]'}`}>
                          {task.done ? <CheckSquare size={15} /> : <Square size={15} />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${task.done ? 'line-through text-[rgba(240,240,242,0.4)]' : 'text-white'}`}>
                            {task.label}
                          </p>
                          {proj && (
                            <p className={`text-mono-label text-[10px] mt-0.5 ${overdue ? 'text-[#DC143C]' : 'text-[rgba(240,240,242,0.4)]'}`}>
                              {overdue && <AlertTriangle size={10} className="inline mr-1" />}
                              {proj.title} — Due {fmtDate(proj.deadline)}
                            </p>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Worklog Reminder */}
            {!hasWorklogToday && (
              <div className="glass-card rounded-lg p-5 border-l-4 border-[#DC143C]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-mono-label text-[10px] mb-1">REMINDER</p>
                    <p className="text-white font-semibold text-sm">Submit today's worklog</p>
                    <p className="text-[rgba(240,240,242,0.4)] text-xs mt-1">Don't forget to log your hours before EOD.</p>
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
                  <div key={i} className="h-16 bg-[rgba(255,255,255,0.06)] rounded animate-pulse" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <p className="text-mono-label text-center py-6">NO ACTIVE PROJECTS</p>
            ) : (
              <ul className="space-y-4">
                {projects.filter(p => p.status !== 'completed').map((p) => (
                  <li key={p.id} className="pb-4 border-b border-[rgba(255,255,255,0.08)] last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white text-sm font-semibold truncate max-w-[180px]">{p.title}</p>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="progress-bar mb-1">
                      <div className="progress-fill" style={{ width: `${p.progress}%` }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-mono-label text-[10px]">{p.progress}% complete</span>
                      <span className={`text-mono-label text-[10px] ${isOverdue(p.deadline) ? 'text-[#DC143C]' : 'text-[rgba(240,240,242,0.4)]'}`}>
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
                <div key={i} className="h-10 bg-[rgba(255,255,255,0.06)] rounded animate-pulse" />
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
                      <td className="text-white text-sm">{proj?.title ?? w.projectId}</td>
                      <td className="text-[#DC143C] font-semibold">{w.hoursWorked}h</td>
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
      </div>
    </DashboardLayout>
  )
}
