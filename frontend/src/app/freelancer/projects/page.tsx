'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { projectsApi } from '@/lib/api'
import { Project, ProjectStatus } from '@/lib/types'
import { AlertTriangle, X, Calendar, DollarSign, TrendingUp, User } from 'lucide-react'
import { useCurrencySymbol } from '@/lib/store'

const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    title: 'E-Commerce Platform Redesign',
    description: 'Full redesign of the client shopping experience including product listings, cart, checkout flow, and account management pages.',
    budget: 4500,
    deadline: new Date(Date.now() + 3 * 86400000).toISOString(),
    status: 'in_progress',
    priority: 'high',
    clientId: 'c1',
    client: { id: 'c1', name: 'Acme Corp', email: 'acme@example.com', role: 'client', createdAt: '' },
    progress: 65,
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Mobile App Backend API',
    description: 'REST API development for the iOS/Android app including authentication, push notifications, and data sync endpoints.',
    budget: 3200,
    deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
    status: 'assigned',
    priority: 'medium',
    clientId: 'c2',
    client: { id: 'c2', name: 'StartupXYZ', email: 'hello@startup.com', role: 'client', createdAt: '' },
    progress: 30,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Dashboard Analytics Module',
    description: 'Build analytics and reporting dashboard with charts, data export, and real-time KPI tracking.',
    budget: 2100,
    deadline: new Date(Date.now() - 2 * 86400000).toISOString(),
    status: 'delayed',
    priority: 'critical',
    clientId: 'c1',
    client: { id: 'c1', name: 'Acme Corp', email: 'acme@example.com', role: 'client', createdAt: '' },
    progress: 80,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    title: 'CMS Integration',
    description: 'Integrate headless CMS (Contentful) with the existing Next.js frontend.',
    budget: 1500,
    deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
    status: 'new',
    priority: 'low',
    clientId: 'c3',
    client: { id: 'c3', name: 'MediaGroup', email: 'media@example.com', role: 'client', createdAt: '' },
    progress: 0,
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '5',
    title: 'Payment Gateway Setup',
    description: 'Integrate Stripe payment gateway with subscription plans and webhook handling.',
    budget: 2800,
    deadline: new Date(Date.now() - 10 * 86400000).toISOString(),
    status: 'completed',
    priority: 'high',
    clientId: 'c2',
    client: { id: 'c2', name: 'StartupXYZ', email: 'hello@startup.com', role: 'client', createdAt: '' },
    progress: 100,
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const STATUS_FILTERS: { label: string; value: 'all' | ProjectStatus }[] = [
  { label: 'All', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Blocked', value: 'blocked' },
  { label: 'Pending', value: 'pending_approval' },
  { label: 'Completed', value: 'completed' },
  { label: 'Delayed', value: 'delayed' },
]

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

export default function FreelancerProjectsPage() {
  const curr = useCurrencySymbol()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | ProjectStatus>('all')
  const [modal, setModal] = useState<Project | null>(null)

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

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter)

  return (
    <DashboardLayout allowedRoles={['freelancer']}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-display text-3xl text-gradient">MY PROJECTS</h1>
          <p className="text-mono-label text-[11px] mt-1">{projects.length} TOTAL PROJECTS</p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-1.5 rounded text-mono-label text-[10px] tracking-widest border transition-all ${
                filter === f.value
                  ? 'bg-[#DC143C] border-[#DC143C] text-primary-ui'
                  : 'border-[rgba(220,20,60,0.2)] text-[var(--text-muted)] hover:border-[#DC143C] hover:text-primary-ui'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-card rounded-lg p-5 h-64 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card rounded-lg p-12 text-center">
            <p className="text-mono-label">NO PROJECTS FOUND</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5">
            {filtered.map((p) => {
              const days = daysUntil(p.deadline)
              const nearDeadline = days >= 0 && days <= 7
              const overdue = days < 0
              return (
                <div key={p.id} className="glass-card rounded-lg p-5 flex flex-col gap-3 hover:border-[#DC143C] transition-all">
                  {/* Title + status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-primary-ui font-bold text-base leading-tight truncate">{p.title}</h3>
                      <p className="text-mono-label text-[10px] mt-0.5 text-[var(--text-muted)] flex items-center gap-1">
                        <User size={10} />
                        {p.client?.name ?? 'Client'}
                      </p>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>

                  {/* Description */}
                  <p className="text-[var(--track-bg)] text-sm line-clamp-2 leading-relaxed">{p.description}</p>

                  {/* Deadline */}
                  <div className={`flex items-center gap-1.5 text-mono-label text-[10px] ${overdue ? 'text-[#DC143C]' : nearDeadline ? 'text-amber-400' : 'text-[var(--text-muted)]'}`}>
                    {(overdue || nearDeadline) && <AlertTriangle size={11} />}
                    <Calendar size={10} />
                    {overdue
                      ? `OVERDUE BY ${Math.abs(days)} DAYS`
                      : nearDeadline
                      ? `DUE IN ${days} DAY${days === 1 ? '' : 'S'}`
                      : `DUE ${fmtDate(p.deadline)}`}
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-mono-label text-[10px]">PROGRESS</span>
                      <span className="text-mono-label text-[10px] text-[#DC143C]">{p.progress}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${p.progress}%` }} />
                    </div>
                  </div>

                  {/* Budget */}
                  <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-mono-label text-[10px]">
                    <DollarSign size={11} />
                    BUDGET: <span className="text-primary-ui font-semibold">{curr}{p.budget.toLocaleString()}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1 mt-auto">
                    <Link href="/freelancer/worklogs" className="flex-1">
                      <button className="btn-primary w-full text-xs py-2 px-3 rounded">Log Work</button>
                    </Link>
                    <button
                      onClick={() => setModal(p)}
                      className="btn-ghost flex-1 text-xs py-2 px-3 rounded"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(3,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={() => setModal(null)}
        >
          <div
            className="glass-card rounded-xl p-6 max-w-lg w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-display text-xl text-primary-ui">{modal.title}</h2>
                <p className="text-mono-label text-[10px] mt-1">{modal.client?.name ?? 'CLIENT'}</p>
              </div>
              <button onClick={() => setModal(null)} className="text-[var(--text-muted)] hover:text-primary-ui transition-colors">
                <X size={20} />
              </button>
            </div>

            <p className="text-[var(--track-bg)] text-sm leading-relaxed">{modal.description}</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card-dark rounded p-3">
                <p className="text-mono-label text-[10px] mb-1">STATUS</p>
                <StatusBadge status={modal.status} />
              </div>
              <div className="glass-card-dark rounded p-3">
                <p className="text-mono-label text-[10px] mb-1">PRIORITY</p>
                <p className="text-primary-ui text-sm font-semibold uppercase">{modal.priority}</p>
              </div>
              <div className="glass-card-dark rounded p-3">
                <p className="text-mono-label text-[10px] mb-1">BUDGET</p>
                <p className="text-primary-ui font-semibold">{curr}{modal.budget.toLocaleString()}</p>
              </div>
              <div className="glass-card-dark rounded p-3">
                <p className="text-mono-label text-[10px] mb-1">DEADLINE</p>
                <p className={`text-sm font-semibold ${daysUntil(modal.deadline) < 0 ? 'text-[#DC143C]' : 'text-primary-ui'}`}>
                  {fmtDate(modal.deadline)}
                </p>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-mono-label text-[10px]">PROGRESS</span>
                <span className="text-mono-label text-[10px] text-[#DC143C]">{modal.progress}%</span>
              </div>
              <div className="progress-bar h-2">
                <div className="progress-fill" style={{ width: `${modal.progress}%` }} />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Link href="/freelancer/worklogs" className="flex-1">
                <button className="btn-primary w-full text-xs py-2.5 rounded">LOG WORK</button>
              </Link>
              <button onClick={() => setModal(null)} className="btn-ghost flex-1 text-xs py-2.5 rounded">CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
