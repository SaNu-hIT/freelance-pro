'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthStore, useCurrencySymbol } from '@/lib/store'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { projectsApi } from '@/lib/api'
import { Project } from '@/lib/types'
import { FolderKanban, CheckCircle2, Clock, Loader2, AlertTriangle, CheckCheck, X } from 'lucide-react'

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
    assignedFreelancer: { id: 'f1', userId: 'u1', user: { id: 'u1', name: 'Alex Johnson', email: '', role: 'freelancer', createdAt: '' }, skills: [], experience: 3, hourlyRate: 75, status: 'active' },
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
    status: 'pending_approval',
    priority: 'medium',
    clientId: 'c1',
    assignedFreelancer: { id: 'f2', userId: 'u2', user: { id: 'u2', name: 'Sam Rivera', email: '', role: 'freelancer', createdAt: '' }, skills: [], experience: 5, hourlyRate: 90, status: 'active' },
    progress: 100,
    createdAt: new Date(Date.now() - 35 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Dashboard Analytics Module',
    description: 'Build analytics and reporting dashboard.',
    budget: 2100,
    deadline: new Date(Date.now() - 10 * 86400000).toISOString(),
    status: 'completed',
    priority: 'high',
    clientId: 'c1',
    progress: 100,
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    title: 'CMS Integration',
    description: 'Integrate headless CMS with existing frontend.',
    budget: 1500,
    deadline: new Date(Date.now() + 20 * 86400000).toISOString(),
    status: 'new',
    priority: 'low',
    clientId: 'c1',
    progress: 0,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

function isOverdue(iso: string) {
  return new Date(iso) < new Date()
}

const activityColors: Record<string, string> = {
  progress: '#DC143C',
  approval: '#fbbf24',
  complete: '#4ade80',
  new: '#60a5fa',
  payment: '#c084fc',
}

export default function ClientDashboardPage() {
  const { user } = useAuthStore()
  const curr = useCurrencySymbol()

  const MOCK_ACTIVITY = [
    { id: 'a1', event: 'E-Commerce Platform reached 65% completion', time: '2 hours ago', type: 'progress' },
    { id: 'a2', event: 'Mobile App Backend submitted for approval', time: '1 day ago', type: 'approval' },
    { id: 'a3', event: 'Dashboard Analytics Module marked completed', time: '3 days ago', type: 'complete' },
    { id: 'a4', event: 'CMS Integration project submitted', time: '2 days ago', type: 'new' },
    { id: 'a5', event: `Payment of ${curr}2,520 processed for Payment Gateway`, time: '4 days ago', type: 'payment' },
  ]

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'GOOD MORNING,' : hour < 17 ? 'GOOD AFTERNOON,' : 'GOOD EVENING,'

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

  const totalProjects = projects.length
  const activeProjects = projects.filter(p => ['in_progress', 'assigned'].includes(p.status)).length
  const completedProjects = projects.filter(p => p.status === 'completed').length
  const pendingApproval = projects.filter(p => p.status === 'pending_approval').length

  const stats = [
    { label: 'Total Projects', value: totalProjects, icon: <FolderKanban size={20} className="text-[#DC143C]" /> },
    { label: 'Active', value: activeProjects, icon: <Loader2 size={20} className="text-blue-400" /> },
    { label: 'Completed', value: completedProjects, icon: <CheckCircle2 size={20} className="text-green-400" /> },
    { label: 'Pending Approval', value: pendingApproval, icon: <Clock size={20} className="text-amber-400" /> },
  ]

  function handleApprove(id: string) {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status: 'completed' as const } : p))
  }

  function handleRequestChanges(id: string) {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status: 'in_progress' as const } : p))
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
              <Link href="/client/projects" className="text-mono-label text-[10px] text-[#DC143C] hover:underline">VIEW ALL →</Link>
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
                        <Link href="/client/projects" className="text-mono-label text-[10px] text-[var(--text-muted)] hover:text-[#DC143C]">Details →</Link>
                      </div>
                    </div>
                    <div className="progress-bar mb-1">
                      <div className="progress-fill" style={{ width: `${p.progress}%` }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-mono-label text-[10px]">{p.progress}% complete</span>
                      <span className={`text-mono-label text-[10px] ${isOverdue(p.deadline) ? 'text-[#DC143C]' : 'text-[var(--text-muted)]'}`}>
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
            <ul className="relative space-y-0">
              <div className="absolute left-[7px] top-3 bottom-3 w-px bg-[rgba(220,20,60,0.2)]" />
              {MOCK_ACTIVITY.map((a, i) => (
                <li key={a.id} className="relative pl-6 pb-5 last:pb-0">
                  <span
                    className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full border-2 border-[#0a0a0c] shrink-0"
                    style={{ background: activityColors[a.type] ?? 'var(--text-muted)' }}
                  />
                  <p className="text-primary-ui text-xs leading-snug">{a.event}</p>
                  <p className="text-mono-label text-[10px] mt-0.5">{a.time}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Pending Approval */}
        {pendingProjects.length > 0 && (
          <div className="glass-card rounded-xl p-5 border-l-4 border-[#DC143C]">
            <h2 className="text-mono-label text-xs tracking-widest mb-4">PENDING YOUR APPROVAL</h2>
            <div className="space-y-4">
              {pendingProjects.map(p => (
                <div key={p.id} className="flex items-center justify-between glass-card-dark rounded-lg p-4">
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
                      className="flex items-center gap-1.5 px-3 py-2 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] text-green-400 rounded text-mono-label text-[10px] hover:bg-[rgba(34,197,94,0.2)] transition-colors"
                    >
                      <CheckCheck size={13} />
                      APPROVE
                    </button>
                    <button
                      onClick={() => handleRequestChanges(p.id)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-red-400 rounded text-mono-label text-[10px] hover:bg-[rgba(239,68,68,0.2)] transition-colors"
                    >
                      <X size={13} />
                      CHANGES
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
