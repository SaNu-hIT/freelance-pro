'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { StatusBadge } from '@/components/ui/StatusBadge'
import ErrorBanner from '@/components/ui/ErrorBanner'
import { projectsApi, worklogsApi, projectRequestsApi, documentsApi } from '@/lib/api'
import { Project, Worklog, ProjectRequest, ProjectDocument } from '@/lib/types'
import { apiError } from '@/lib/utils'
import { FolderKanban, CheckCircle2, Clock, Loader2, AlertTriangle, CheckCheck, X } from 'lucide-react'

interface Activity { id: string; event: string; at: string; type: string }

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

function isOverdue(iso: string) {
  return new Date(iso) < new Date()
}

const activityColors: Record<string, string> = {
  progress: 'var(--fg)',
  request: 'var(--fg)',
  document: 'var(--fg)',
}

export default function ClientDashboardPage() {
  const { user } = useAuthStore()

  const [projects, setProjects] = useState<Project[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activityError, setActivityError] = useState('')
  const [actionError, setActionError] = useState('')
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [changesFor, setChangesFor] = useState<string | null>(null)
  const [changesMsg, setChangesMsg] = useState('')

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'GOOD MORNING,' : hour < 17 ? 'GOOD AFTERNOON,' : 'GOOD EVENING,'

  const loadProjects = () => projectsApi.getAll()
    .then(res => { setProjects(res.data?.data ?? res.data ?? []); setError('') })
    .catch(err => setError(apiError(err, 'Could not load your projects.')))

  // Merge the latest worklogs, requests and documents into one feed
  const loadActivity = () => Promise.all([
    worklogsApi.getAll(), projectRequestsApi.list(), documentsApi.list(),
  ])
    .then(([wl, req, docs]) => {
      const worklogs: Worklog[] = wl.data?.data ?? wl.data ?? []
      const requests: ProjectRequest[] = req.data ?? []
      const documents: ProjectDocument[] = docs.data ?? []
      const items: Activity[] = [
        ...worklogs.map(w => ({
          id: `w-${w.id}`, type: 'progress', at: w.createdAt,
          event: `${w.freelancer?.user?.name ?? 'Your team'} logged ${w.hoursWorked}h on ${w.project?.title ?? 'a project'} (${w.progress}%)`,
        })),
        ...requests.map(r => ({
          id: `r-${r.id}`, type: 'request', at: r.createdAt,
          event: `${r.fromUser?.name ?? 'Someone'} opened a ${r.kind} request on ${r.project?.title ?? 'a project'}: ${r.subject}`,
        })),
        ...documents.map(d => ({
          id: `d-${d.id}`, type: 'document', at: d.createdAt,
          event: `${d.uploadedBy?.name ?? 'Someone'} uploaded ${d.name} to ${d.project?.title ?? 'a project'}`,
        })),
      ]
      items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      setActivity(items.slice(0, 8))
      setActivityError('')
    })
    .catch(err => setActivityError(apiError(err, 'Could not load recent activity.')))

  useEffect(() => {
    Promise.all([loadProjects(), loadActivity()]).finally(() => setLoading(false))
  }, []) // eslint-disable-line

  const totalProjects = projects.length
  const activeProjects = projects.filter(p => ['in_progress', 'assigned'].includes(p.status)).length
  const completedProjects = projects.filter(p => p.status === 'completed').length
  const pendingApproval = projects.filter(p => p.status === 'pending_approval').length

  const stats = [
    { label: 'Total Projects', value: totalProjects, icon: <FolderKanban size={20} className="text-[var(--fg)]" /> },
    { label: 'Active', value: activeProjects, icon: <Loader2 size={20} className="text-[var(--fg)]" /> },
    { label: 'Completed', value: completedProjects, icon: <CheckCircle2 size={20} className="text-[var(--fg)]" /> },
    { label: 'Pending Approval', value: pendingApproval, icon: <Clock size={20} className="text-[var(--fg)]" /> },
  ]

  async function handleApprove(id: string) {
    setApprovingId(id); setActionError('')
    try {
      await projectsApi.approve(id)
      await Promise.all([loadProjects(), loadActivity()])
    } catch (err) {
      setActionError(apiError(err, 'Could not approve the project.'))
    } finally {
      setApprovingId(null)
    }
  }

  async function handleRequestChanges(id: string) {
    if (!changesMsg.trim()) return
    setApprovingId(id); setActionError('')
    try {
      await projectsApi.requestChanges(id, changesMsg.trim())
      setChangesFor(null); setChangesMsg('')
      await Promise.all([loadProjects(), loadActivity()])
    } catch (err) {
      setActionError(apiError(err, 'Could not send the change request.'))
    } finally {
      setApprovingId(null)
    }
  }

  const pendingProjects = projects.filter(p => p.status === 'pending_approval')
  const activeList = projects.filter(p => ['in_progress', 'assigned', 'blocked', 'delayed'].includes(p.status))

  return (
    <DashboardLayout allowedRoles={['client']}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <p className="text-mono-label text-xs tracking-widest mb-1">{greeting}</p>
          <h1 className="text-display text-4xl text-gradient">{user?.name?.toUpperCase() ?? 'CLIENT'}</h1>
          <p className="text-mono-label text-[11px] mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: '2-digit', year: 'numeric' }).toUpperCase()}
          </p>
        </div>

        <ErrorBanner title="Could not load projects" message={error} />

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass-card metric-card rounded-lg h-24 animate-pulse" />
              ))
            : stats.map(s => (
                <div key={s.label} className="glass-card metric-card rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-mono-label text-[10px]">{s.label}</span>
                    {s.icon}
                  </div>
                  <p className="text-primary-ui text-3xl font-black text-display">{s.value}</p>
                </div>
              ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Active Projects */}
          <div className="col-span-2 glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-mono-label text-xs tracking-widest">MY ACTIVE PROJECTS</h2>
              <Link href="/client/projects" className="text-mono-label text-[10px] text-[var(--fg)] hover:underline">VIEW ALL →</Link>
            </div>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-[var(--input-bg)] rounded animate-pulse" />
                ))}
              </div>
            ) : activeList.length === 0 ? (
              <p className="text-mono-label text-center py-6">NO ACTIVE PROJECTS</p>
            ) : (
              <ul className="space-y-4">
                {activeList.map(p => (
                  <li key={p.id} className="pb-4 border-b border-[var(--input-bg)] last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-primary-ui font-semibold text-sm">{p.title}</p>
                        {p.assignedFreelancer && (
                          <p className="text-mono-label text-[10px]">
                            Assigned to {p.assignedFreelancer.user.name}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={p.status} />
                        <Link href="/client/projects" className="text-mono-label text-[10px] text-[var(--text-muted)] hover:text-[var(--fg)]">Details →</Link>
                      </div>
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

          {/* Recent Activity */}
          <div className="glass-card rounded-xl p-5">
            <h2 className="text-mono-label text-xs tracking-widest mb-4">RECENT ACTIVITY</h2>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-8 bg-[var(--input-bg)] rounded animate-pulse" />
                ))}
              </div>
            ) : activityError ? (
              <ErrorBanner title="Could not load activity" message={activityError} />
            ) : activity.length === 0 ? (
              <p className="text-mono-label text-center py-6">NO RECENT ACTIVITY</p>
            ) : (
              <ul className="relative space-y-0">
                <div className="absolute left-[7px] top-3 bottom-3 w-px bg-[rgb(var(--fg-rgb)/0.2)]" />
                {activity.map(a => (
                  <li key={a.id} className="relative pl-6 pb-5 last:pb-0">
                    <span
                      className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full border-2 border-[var(--surface)] shrink-0"
                      style={{ background: activityColors[a.type] ?? 'var(--text-muted)' }}
                    />
                    <p className="text-primary-ui text-xs leading-snug">{a.event}</p>
                    <p className="text-mono-label text-[10px] mt-0.5">{timeAgo(a.at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Pending Approval */}
        {pendingProjects.length > 0 && (
          <div className="glass-card rounded-xl p-5 border-l-4 border-[var(--fg)]">
            <h2 className="text-mono-label text-xs tracking-widest mb-4">PENDING YOUR APPROVAL</h2>
            {actionError && (
              <div className="mb-4">
                <ErrorBanner message={actionError} onClose={() => setActionError('')} />
              </div>
            )}
            <div className="space-y-4">
              {pendingProjects.map(p => (
                <div key={p.id} className="glass-card-dark rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-primary-ui font-semibold">{p.title}</p>
                    <p className="text-mono-label text-[10px] mt-0.5">
                      {p.assignedFreelancer?.user.name ?? 'Freelancer'} — submitted for review
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="progress-bar w-24">
                        <div className="progress-fill" style={{ width: `${p.progress}%` }} />
                      </div>
                      <span className="text-mono-label text-[10px]">{p.progress}% complete</span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleApprove(p.id)}
                      disabled={approvingId === p.id}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[rgb(var(--fg-rgb)/0.1)] border border-[rgb(var(--fg-rgb)/0.3)] text-[var(--fg)] rounded text-mono-label text-[10px] hover:bg-[rgb(var(--fg-rgb)/0.2)] transition-colors disabled:opacity-50"
                    >
                      <CheckCheck size={13} />
                      APPROVE
                    </button>
                    <button
                      onClick={() => { setChangesFor(changesFor === p.id ? null : p.id); setChangesMsg('') }}
                      disabled={approvingId === p.id}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[rgb(var(--fg-rgb)/0.1)] border border-[rgb(var(--fg-rgb)/0.3)] text-[var(--fg)] rounded text-mono-label text-[10px] hover:bg-[rgb(var(--fg-rgb)/0.2)] transition-colors disabled:opacity-50"
                    >
                      <X size={13} />
                      CHANGES
                    </button>
                  </div>
                </div>
                {changesFor === p.id && (
                  <div className="flex items-center gap-2 mt-3">
                    <input
                      className="input-field flex-1 py-2 text-sm"
                      placeholder="What needs to change?"
                      value={changesMsg}
                      onChange={e => setChangesMsg(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRequestChanges(p.id) }}
                    />
                    <button
                      onClick={() => handleRequestChanges(p.id)}
                      disabled={!changesMsg.trim() || approvingId === p.id}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[rgb(var(--fg-rgb)/0.1)] border border-[rgb(var(--fg-rgb)/0.3)] text-[var(--fg)] rounded text-mono-label text-[10px] hover:bg-[rgb(var(--fg-rgb)/0.2)] transition-colors disabled:opacity-50"
                    >
                      {approvingId === p.id ? 'SENDING…' : 'SEND REQUEST'}
                    </button>
                  </div>
                )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
