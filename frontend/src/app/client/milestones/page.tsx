'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import ErrorBanner from '@/components/ui/ErrorBanner'
import { projectsApi, sprintsApi, tasksApi } from '@/lib/api'
import { Project, ProjectSprint, ProjectTask } from '@/lib/types'
import { apiError } from '@/lib/utils'
import { CheckCircle2, Clock, AlertTriangle, Check, ThumbsUp } from 'lucide-react'

interface Milestone {
  id: string
  name: string
  dueDate: string | null
  status: 'completed' | 'pending' | 'overdue'
  progress: number
  projectId: string
  description?: string
  approvedAt: string | null
}

// A sprint is a milestone: progress is its share of finished tasks
function toMilestone(sprint: ProjectSprint, tasks: ProjectTask[]): Milestone {
  const own = tasks.filter(t => t.sprintId === sprint.id)
  const done = own.filter(t => t.completed).length
  const complete = own.length > 0 && done === own.length
  const overdue = !complete && !!sprint.endDate && new Date(sprint.endDate) < new Date()
  return {
    id: sprint.id,
    name: sprint.name,
    dueDate: sprint.endDate,
    status: complete ? 'completed' : overdue ? 'overdue' : 'pending',
    progress: own.length ? Math.round(done / own.length * 100) : 0,
    projectId: sprint.projectId,
    description: `${done} of ${own.length} task${own.length === 1 ? '' : 's'} done`,
    approvedAt: sprint.approvedAt ?? null,
  }
}

function fmtDate(iso: string | null) {
  if (!iso) return 'No due date'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

const statusIcons: Record<Milestone['status'], React.ReactNode> = {
  completed: <CheckCircle2 size={18} className="text-[var(--fg)]" />,
  pending: <Clock size={18} className="text-[var(--fg)]" />,
  overdue: <AlertTriangle size={18} className="text-[var(--fg)]" />,
}

const statusColors: Record<Milestone['status'], string> = {
  completed: 'var(--fg)',
  pending: 'var(--fg)',
  overdue: 'var(--fg)',
}

export default function ClientMilestonesPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<string>('all')

  useEffect(() => {
    async function load() {
      try {
        const res = await projectsApi.getAll()
        const list: Project[] = res.data?.data ?? res.data ?? []
        setProjects(list)
        const perProject = await Promise.all(list.map(async p => {
          const [sr, tr] = await Promise.all([sprintsApi.getByProject(p.id), tasksApi.getByProject(p.id)])
          const sprints: ProjectSprint[] = sr.data ?? []
          const tasks: ProjectTask[] = tr.data ?? []
          return sprints.map(s => toMilestone(s, tasks))
        }))
        setMilestones(perProject.flat())
      } catch (err) {
        setError(apiError(err, 'Could not load milestones.'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filteredMilestones = selectedProject === 'all'
    ? milestones
    : milestones.filter(m => m.projectId === selectedProject)

  const pendingReview = filteredMilestones.filter(m => m.status === 'completed' && !m.approvedAt)

  async function approve(id: string) {
    setApprovingId(id); setActionError('')
    try {
      const res = await sprintsApi.approve(id)
      const approvedAt: string | null = res.data?.approvedAt ?? null
      setMilestones(prev => prev.map(m => m.id === id ? { ...m, approvedAt } : m))
    } catch (err) {
      setActionError(apiError(err, 'Could not approve the milestone.'))
    } finally {
      setApprovingId(null)
    }
  }

  return (
    <DashboardLayout allowedRoles={['client']}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-display text-3xl text-gradient">MILESTONES</h1>
          <p className="text-mono-label text-[11px] mt-1">TRACK PROJECT MILESTONES & DELIVERABLES</p>
        </div>

        <ErrorBanner title="Could not load milestones" message={error} />
        {actionError && <ErrorBanner message={actionError} onClose={() => setActionError('')} />}

        {/* Project Selector Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedProject('all')}
            className={`px-4 py-1.5 rounded text-mono-label text-[10px] tracking-widest border transition-all ${
              selectedProject === 'all'
                ? 'bg-[var(--fg)] border-[var(--fg)] text-[var(--bg)]'
                : 'border-[rgb(var(--fg-rgb)/0.2)] text-[var(--text-muted)] hover:border-[var(--fg)] hover:text-primary-ui'
            }`}
          >
            All Projects
          </button>
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedProject(p.id)}
              className={`px-4 py-1.5 rounded text-mono-label text-[10px] tracking-widest border transition-all ${
                selectedProject === p.id
                  ? 'bg-[var(--fg)] border-[var(--fg)] text-[var(--bg)]'
                  : 'border-[rgb(var(--fg-rgb)/0.2)] text-[var(--text-muted)] hover:border-[var(--fg)] hover:text-primary-ui'
              }`}
            >
              {p.title}
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-mono-label text-xs tracking-widest mb-6">MILESTONE TIMELINE</h2>

          {loading ? (
            <div className="space-y-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-[var(--input-bg)] rounded animate-pulse" />
              ))}
            </div>
          ) : filteredMilestones.length === 0 ? (
            <p className="text-mono-label text-center py-10">NO MILESTONES FOUND</p>
          ) : (
            <div className="relative space-y-0">
              {/* Timeline line */}
              <div className="absolute left-[22px] top-4 bottom-4 w-px bg-[rgb(var(--fg-rgb)/0.2)]" />

              {filteredMilestones.map((m, idx) => {
                const proj = projects.find(p => p.id === m.projectId)
                const isApproved = !!m.approvedAt
                return (
                  <div key={m.id} className="relative pl-14 pb-6 last:pb-0 group">
                    {/* Timeline dot */}
                    <div
                      className="absolute left-3 top-1 w-8 h-8 rounded-full flex items-center justify-center border-2 border-[var(--surface)] transition-transform group-hover:scale-110"
                      style={{ background: isApproved ? 'var(--fg)' : `color-mix(in srgb, ${statusColors[m.status]} 13%, transparent)`, border: `2px solid ${isApproved ? 'var(--fg)' : statusColors[m.status]}` }}
                    >
                      {isApproved
                        ? <Check size={14} className="text-[var(--fg)]" />
                        : statusIcons[m.status]}
                    </div>

                    {/* Content */}
                    <div className="glass-card-dark rounded-lg p-4 hover:border-[rgb(var(--fg-rgb)/0.3)] transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-primary-ui font-semibold text-sm">{m.name}</h3>
                            {isApproved && (
                              <span className="status-badge status-completed text-[10px]">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
                                Approved
                              </span>
                            )}
                          </div>
                          {proj && (
                            <p className="text-mono-label text-[10px] mt-0.5">{proj.title}</p>
                          )}
                          {m.description && (
                            <p className="text-[var(--track-bg)] text-sm mt-1">{m.description}</p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <p className={`text-mono-label text-[10px] ${m.status === 'overdue' ? 'text-[var(--fg)]' : 'text-[var(--text-muted)]'}`}>
                            {m.status === 'overdue' && <AlertTriangle size={10} className="inline mr-1" />}
                            {fmtDate(m.dueDate)}
                          </p>
                          <p className="text-mono-label text-[10px] mt-0.5 capitalize" style={{ color: isApproved ? 'var(--fg)' : statusColors[m.status] }}>
                            {isApproved ? `APPROVED ${fmtDate(m.approvedAt)}` : m.status.toUpperCase()}
                          </p>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="mt-3">
                        <div className="flex justify-between mb-1">
                          <span className="text-mono-label text-[10px]">PROGRESS</span>
                          <span className="text-mono-label text-[10px]" style={{ color: statusColors[m.status] }}>{m.progress}%</span>
                        </div>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${m.progress}%`,
                              background: `linear-gradient(to right, color-mix(in srgb, ${statusColors[m.status]} 53%, transparent), ${statusColors[m.status]})`
                            }}
                          />
                        </div>
                      </div>

                      {/* Approve button for completed milestones */}
                      {m.status === 'completed' && !isApproved && (
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={() => approve(m.id)}
                            disabled={approvingId === m.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[rgb(var(--fg-rgb)/0.1)] border border-[rgb(var(--fg-rgb)/0.3)] text-[var(--fg)] rounded text-mono-label text-[10px] hover:bg-[rgb(var(--fg-rgb)/0.2)] transition-colors disabled:opacity-50"
                          >
                            <ThumbsUp size={12} />
                            APPROVE MILESTONE
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pending Your Review */}
        {pendingReview.length > 0 && (
          <div className="glass-card rounded-xl p-5 border-l-4 border-[var(--fg)]">
            <h2 className="text-mono-label text-xs tracking-widest mb-4">PENDING YOUR REVIEW</h2>
            <div className="space-y-3">
              {pendingReview.map(m => {
                const proj = projects.find(p => p.id === m.projectId)
                return (
                  <div key={m.id} className="glass-card-dark rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <p className="text-primary-ui font-semibold text-sm">{m.name}</p>
                      <p className="text-mono-label text-[10px] mt-0.5">{proj?.title ?? 'Project'} — all tasks done · due {fmtDate(m.dueDate)}</p>
                    </div>
                    <button
                      onClick={() => approve(m.id)}
                      disabled={approvingId === m.id}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[rgb(var(--fg-rgb)/0.1)] border border-[rgb(var(--fg-rgb)/0.3)] text-[var(--fg)] rounded text-mono-label text-[10px] hover:bg-[rgb(var(--fg-rgb)/0.2)] transition-colors disabled:opacity-50"
                    >
                      <ThumbsUp size={13} />
                      APPROVE
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
