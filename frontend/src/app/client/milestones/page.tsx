'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { projectsApi } from '@/lib/api'
import { Project } from '@/lib/types'
import { CheckCircle2, Clock, AlertTriangle, Check, ThumbsUp } from 'lucide-react'

interface Milestone {
  id: string
  name: string
  dueDate: string
  status: 'completed' | 'pending' | 'overdue'
  progress: number
  projectId: string
  description?: string
}

const MOCK_PROJECTS: Project[] = [
  { id: '1', title: 'E-Commerce Platform Redesign', description: '', budget: 4500, deadline: '', status: 'in_progress', priority: 'high', clientId: 'c1', progress: 65, createdAt: '', updatedAt: '' },
  { id: '2', title: 'Mobile App Backend API', description: '', budget: 3200, deadline: '', status: 'pending_approval', priority: 'medium', clientId: 'c1', progress: 100, createdAt: '', updatedAt: '' },
]

const MOCK_MILESTONES: Milestone[] = [
  { id: 'm1', name: 'UI/UX Wireframes', dueDate: new Date(Date.now() - 10 * 86400000).toISOString(), status: 'completed', progress: 100, projectId: '1', description: 'Complete wireframes and design system setup.' },
  { id: 'm2', name: 'Component Library', dueDate: new Date(Date.now() - 3 * 86400000).toISOString(), status: 'completed', progress: 100, projectId: '1', description: 'Reusable React components with Storybook.' },
  { id: 'm3', name: 'Product Listing Pages', dueDate: new Date(Date.now() + 4 * 86400000).toISOString(), status: 'pending', progress: 70, projectId: '1', description: 'Listing, filters, search functionality.' },
  { id: 'm4', name: 'Cart & Checkout', dueDate: new Date(Date.now() + 11 * 86400000).toISOString(), status: 'pending', progress: 20, projectId: '1', description: 'Shopping cart, checkout, payment integration.' },
  { id: 'm5', name: 'Database Schema', dueDate: new Date(Date.now() - 15 * 86400000).toISOString(), status: 'completed', progress: 100, projectId: '2', description: 'PostgreSQL schema design and migrations.' },
  { id: 'm6', name: 'Auth & User Management', dueDate: new Date(Date.now() - 8 * 86400000).toISOString(), status: 'completed', progress: 100, projectId: '2', description: 'JWT auth, refresh tokens, roles.' },
  { id: 'm7', name: 'Core API Endpoints', dueDate: new Date(Date.now() - 2 * 86400000).toISOString(), status: 'overdue', progress: 85, projectId: '2', description: 'CRUD endpoints for all resources.' },
  { id: 'm8', name: 'Push Notifications', dueDate: new Date(Date.now() + 7 * 86400000).toISOString(), status: 'pending', progress: 0, projectId: '2', description: 'FCM/APNS integration for mobile push.' },
]

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

const statusIcons: Record<Milestone['status'], React.ReactNode> = {
  completed: <CheckCircle2 size={18} className="text-green-400" />,
  pending: <Clock size={18} className="text-amber-400" />,
  overdue: <AlertTriangle size={18} className="text-[#DC143C]" />,
}

const statusColors: Record<Milestone['status'], string> = {
  completed: '#4ade80',
  pending: '#fbbf24',
  overdue: '#DC143C',
}

export default function ClientMilestonesPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>(MOCK_MILESTONES)
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [approvedIds, setApprovedIds] = useState<string[]>([])

  useEffect(() => {
    async function load() {
      try {
        const res = await projectsApi.getAll()
        setProjects(res.data?.data ?? res.data ?? MOCK_PROJECTS)
      } catch {
        setProjects(MOCK_PROJECTS)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filteredMilestones = selectedProject === 'all'
    ? milestones
    : milestones.filter(m => m.projectId === selectedProject)

  const pendingReview = filteredMilestones.filter(m => m.status === 'completed' && !approvedIds.includes(m.id))

  function approve(id: string) {
    setApprovedIds(prev => [...prev, id])
  }

  return (
    <DashboardLayout allowedRoles={['client']}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-display text-3xl text-gradient">MILESTONES</h1>
          <p className="text-mono-label text-[11px] mt-1">TRACK PROJECT MILESTONES & DELIVERABLES</p>
        </div>

        {/* Project Selector Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedProject('all')}
            className={`px-4 py-1.5 rounded text-mono-label text-[10px] tracking-widest border transition-all ${
              selectedProject === 'all'
                ? 'bg-[#DC143C] border-[#DC143C] text-primary-ui'
                : 'border-[rgba(220,20,60,0.2)] text-[var(--text-muted)] hover:border-[#DC143C] hover:text-primary-ui'
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
                  ? 'bg-[#DC143C] border-[#DC143C] text-primary-ui'
                  : 'border-[rgba(220,20,60,0.2)] text-[var(--text-muted)] hover:border-[#DC143C] hover:text-primary-ui'
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
              <div className="absolute left-[22px] top-4 bottom-4 w-px bg-[rgba(220,20,60,0.2)]" />

              {filteredMilestones.map((m, idx) => {
                const proj = projects.find(p => p.id === m.projectId)
                const isApproved = approvedIds.includes(m.id)
                return (
                  <div key={m.id} className="relative pl-14 pb-6 last:pb-0 group">
                    {/* Timeline dot */}
                    <div
                      className="absolute left-3 top-1 w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#0a0a0c] transition-transform group-hover:scale-110"
                      style={{ background: isApproved ? '#4ade80' : statusColors[m.status] + '22', border: `2px solid ${isApproved ? '#4ade80' : statusColors[m.status]}` }}
                    >
                      {isApproved
                        ? <Check size={14} className="text-green-400" />
                        : statusIcons[m.status]}
                    </div>

                    {/* Content */}
                    <div className="glass-card-dark rounded-lg p-4 hover:border-[rgba(220,20,60,0.3)] transition-all">
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
                          <p className={`text-mono-label text-[10px] ${m.status === 'overdue' ? 'text-[#DC143C]' : 'text-[var(--text-muted)]'}`}>
                            {m.status === 'overdue' && <AlertTriangle size={10} className="inline mr-1" />}
                            {fmtDate(m.dueDate)}
                          </p>
                          <p className="text-mono-label text-[10px] mt-0.5 capitalize" style={{ color: isApproved ? '#4ade80' : statusColors[m.status] }}>
                            {isApproved ? 'APPROVED' : m.status.toUpperCase()}
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
                              background: `linear-gradient(to right, ${statusColors[m.status]}88, ${statusColors[m.status]})`
                            }}
                          />
                        </div>
                      </div>

                      {/* Approve button for completed milestones */}
                      {m.status === 'completed' && !isApproved && (
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={() => approve(m.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] text-green-400 rounded text-mono-label text-[10px] hover:bg-[rgba(34,197,94,0.2)] transition-colors"
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
          <div className="glass-card rounded-xl p-5 border-l-4 border-[#DC143C]">
            <h2 className="text-mono-label text-xs tracking-widest mb-4">PENDING YOUR REVIEW</h2>
            <div className="space-y-3">
              {pendingReview.map(m => {
                const proj = projects.find(p => p.id === m.projectId)
                return (
                  <div key={m.id} className="glass-card-dark rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <p className="text-primary-ui font-semibold text-sm">{m.name}</p>
                      <p className="text-mono-label text-[10px] mt-0.5">{proj?.title ?? 'Project'} — completed {fmtDate(m.dueDate)}</p>
                    </div>
                    <button
                      onClick={() => approve(m.id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] text-green-400 rounded text-mono-label text-[10px] hover:bg-[rgba(34,197,94,0.2)] transition-colors"
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
