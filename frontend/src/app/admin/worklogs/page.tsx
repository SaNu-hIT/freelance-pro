'use client'

import { useEffect, useState } from 'react'
import {
  Search, AlertTriangle, Paperclip, X, ChevronDown, Eye,
  Clock, TrendingUp, ShieldAlert, Users, ArrowRight, CheckCircle2,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { worklogsApi, projectsApi, freelancersApi } from '@/lib/api'
import { Worklog, Project, FreelancerProfile } from '@/lib/types'

const today = new Date().toISOString().slice(0, 10)
const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10) })()
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10) }

const MOCK_WORKLOGS: Worklog[] = [
  {
    id: 'w1', projectId: '1', date: today, hoursWorked: 7,
    progress: 65,
    tasksCompleted: 'Completed Stripe checkout flow integration. Added webhook handler for payment_intent.succeeded events. Unit tests written for cart service.',
    blockers: undefined, nextSteps: 'Start order management admin panel.',
    fileUrls: ['checkout-flow.png', 'test-results.pdf'], freelancerId: 'f1',
    freelancer: { id: 'f1', userId: 'u1', skills: ['React', 'TypeScript', 'Node.js'], experience: 5, hourlyRate: 85, status: 'active', user: { id: 'u1', name: 'Alex Rivera', email: 'alex@freelancepro.dev', role: 'freelancer', createdAt: '' } },
    project: { id: '1', title: 'E-Commerce Platform Rebuild', description: '', budget: 14500, deadline: daysAgo(-42), status: 'in_progress', priority: 'high', clientId: 'c1', progress: 65, createdAt: '', updatedAt: '' },
    createdAt: `${today}T18:00:00Z`,
  },
  {
    id: 'w2', projectId: '2', date: today, hoursWorked: 6,
    progress: 38,
    tasksCompleted: 'Implemented D3 line charts for revenue and user growth metrics. Added 7/30/90-day toggle controls.',
    blockers: 'Waiting for client to grant read access to production data warehouse. Using mock data for now.',
    nextSteps: 'Build bar chart for channel attribution once DB access is granted.',
    fileUrls: [], freelancerId: 'f2',
    freelancer: { id: 'f2', userId: 'u2', skills: ['Python', 'FastAPI', 'AWS'], experience: 6, hourlyRate: 95, status: 'active', user: { id: 'u2', name: 'Priya Sharma', email: 'priya@freelancepro.dev', role: 'freelancer', createdAt: '' } },
    project: { id: '2', title: 'Analytics Dashboard', description: '', budget: 8500, deadline: daysAgo(-60), status: 'in_progress', priority: 'medium', clientId: 'c2', progress: 38, createdAt: '', updatedAt: '' },
    createdAt: `${today}T17:30:00Z`,
  },
  {
    id: 'w3', projectId: '3', date: today, hoursWorked: 8,
    progress: 45,
    tasksCompleted: 'Google Maps integration for real-time driver tracking. Implemented WebSocket-based location broadcasting from driver app.',
    blockers: undefined,
    nextSteps: 'Push notifications setup with FCM.',
    fileUrls: ['maps-demo.gif'], freelancerId: 'f3',
    freelancer: { id: 'f3', userId: 'u3', skills: ['Flutter', 'React Native', 'Firebase'], experience: 4, hourlyRate: 80, status: 'active', user: { id: 'u3', name: 'Marcus Chen', email: 'marcus@freelancepro.dev', role: 'freelancer', createdAt: '' } },
    project: { id: '3', title: 'Mobile App — iOS & Android', description: '', budget: 18000, deadline: daysAgo(-90), status: 'in_progress', priority: 'critical', clientId: 'c1', progress: 45, createdAt: '', updatedAt: '' },
    createdAt: `${today}T16:45:00Z`,
  },
  {
    id: 'w4', projectId: '4', date: today, hoursWorked: 5,
    progress: 88,
    tasksCompleted: 'Final review pass on Storybook documentation. Fixed 3 accessibility issues found in automated audit. Prepping npm publish script.',
    blockers: undefined,
    nextSteps: 'Publish npm package and submit for client approval.',
    fileUrls: ['storybook-preview.png'], freelancerId: 'f4',
    freelancer: { id: 'f4', userId: 'u4', skills: ['Figma', 'UI/UX Design', 'React'], experience: 7, hourlyRate: 90, status: 'active', user: { id: 'u4', name: 'Zara Ahmed', email: 'zara@freelancepro.dev', role: 'freelancer', createdAt: '' } },
    project: { id: '4', title: 'Brand Refresh & Design System', description: '', budget: 11000, deadline: daysAgo(-25), status: 'pending_approval', priority: 'high', clientId: 'c3', progress: 88, createdAt: '', updatedAt: '' },
    createdAt: `${today}T15:00:00Z`,
  },
  {
    id: 'w5', projectId: '5', date: today, hoursWorked: 9,
    progress: 20,
    tasksCompleted: 'Terraform modules for VPC and EKS cluster complete. CI pipeline builds Docker images and pushes to ECR. Deployed to staging successfully.',
    blockers: 'Client IT team has not yet provided IAM credentials with required policies for production account.',
    nextSteps: 'Configure Kubernetes namespaces and RBAC once access is granted.',
    fileUrls: ['terraform-plan.txt', 'ci-output.log'], freelancerId: 'f5',
    freelancer: { id: 'f5', userId: 'u5', skills: ['DevOps', 'Docker', 'Kubernetes', 'AWS'], experience: 8, hourlyRate: 110, status: 'active', user: { id: 'u5', name: 'Lucas Oliveira', email: 'lucas@freelancepro.dev', role: 'freelancer', createdAt: '' } },
    project: { id: '5', title: 'Cloud Migration & DevOps', description: '', budget: 22000, deadline: daysAgo(-75), status: 'assigned', priority: 'critical', clientId: 'c2', progress: 20, createdAt: '', updatedAt: '' },
    createdAt: `${today}T14:00:00Z`,
  },
  // Yesterday's logs
  {
    id: 'w6', projectId: '1', date: yesterday, hoursWorked: 6.5,
    progress: 60,
    tasksCompleted: 'Implemented product search with Postgres full-text search. Added category filters and price range slider component.',
    blockers: undefined, nextSteps: 'Integrate Stripe checkout.',
    fileUrls: [], freelancerId: 'f1',
    freelancer: { id: 'f1', userId: 'u1', skills: ['React', 'TypeScript'], experience: 5, hourlyRate: 85, status: 'active', user: { id: 'u1', name: 'Alex Rivera', email: 'alex@freelancepro.dev', role: 'freelancer', createdAt: '' } },
    project: { id: '1', title: 'E-Commerce Platform Rebuild', description: '', budget: 14500, deadline: daysAgo(-42), status: 'in_progress', priority: 'high', clientId: 'c1', progress: 60, createdAt: '', updatedAt: '' },
    createdAt: `${yesterday}T18:00:00Z`,
  },
  {
    id: 'w7', projectId: '6', date: yesterday, hoursWorked: 4,
    progress: 52,
    tasksCompleted: 'Investigated Salesforce API rate limiting issue. Implemented exponential backoff retry logic in sync service.',
    blockers: 'Salesforce sandbox environment is down for scheduled maintenance. Client needs to raise a ticket with SF support.',
    nextSteps: 'Resume bi-directional sync once sandbox is back online.',
    fileUrls: [], freelancerId: 'f1',
    freelancer: { id: 'f1', userId: 'u1', skills: ['React', 'Node.js'], experience: 5, hourlyRate: 85, status: 'active', user: { id: 'u1', name: 'Alex Rivera', email: 'alex@freelancepro.dev', role: 'freelancer', createdAt: '' } },
    project: { id: '6', title: 'CRM System Integration', description: '', budget: 9800, deadline: daysAgo(-15), status: 'blocked', priority: 'high', clientId: 'c1', progress: 52, createdAt: '', updatedAt: '' },
    createdAt: `${yesterday}T16:00:00Z`,
  },
  {
    id: 'w8', projectId: '3', date: daysAgo(2), hoursWorked: 7.5,
    progress: 38,
    tasksCompleted: 'Built customer app home and menu screens. Product cards with image lazy-loading. Cart state management with Riverpod.',
    blockers: undefined, nextSteps: 'Google Maps for delivery tracking.',
    fileUrls: ['app-screens.fig'], freelancerId: 'f3',
    freelancer: { id: 'f3', userId: 'u3', skills: ['Flutter'], experience: 4, hourlyRate: 80, status: 'active', user: { id: 'u3', name: 'Marcus Chen', email: 'marcus@freelancepro.dev', role: 'freelancer', createdAt: '' } },
    project: { id: '3', title: 'Mobile App — iOS & Android', description: '', budget: 18000, deadline: daysAgo(-90), status: 'in_progress', priority: 'critical', clientId: 'c1', progress: 38, createdAt: '', updatedAt: '' },
    createdAt: `${daysAgo(2)}T17:00:00Z`,
  },
]

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

const PRIORITY_COLORS: Record<string, string> = { low: '#4ade80', medium: '#fbbf24', high: '#fb923c', critical: '#f87171' }

function StandupCard({ w, onView }: { w: Worklog; onView: () => void }) {
  const hasBlocker = !!w.blockers
  return (
    <div className="glass-card rounded-xl overflow-hidden transition-all hover:border-[rgba(220,20,60,0.3)]"
      style={{ borderColor: hasBlocker ? 'rgba(251,191,36,0.3)' : 'var(--input-bg)' }}>
      {/* Card header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
            style={{ background: 'rgba(220,20,60,0.15)', color: '#DC143C', border: '1px solid rgba(220,20,60,0.3)' }}>
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
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: 'rgba(220,20,60,0.08)', border: '1px solid rgba(220,20,60,0.2)' }}>
            <Clock size={11} style={{ color: '#DC143C' }} />
            <span className="font-bold text-xs" style={{ color: '#DC143C' }}>{w.hoursWorked}h</span>
          </div>
          {w.project?.priority && (
            <span className="text-mono-label px-2 py-0.5 rounded text-xs" style={{
              color: PRIORITY_COLORS[w.project.priority] ?? '#9ca3af',
              background: `${PRIORITY_COLORS[w.project.priority] ?? '#9ca3af'}18`,
              border: `1px solid ${PRIORITY_COLORS[w.project.priority] ?? '#9ca3af'}40`,
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
          <span className="text-xs font-bold" style={{ color: '#DC143C' }}>{w.progress}%</span>
        </div>
        <div className="progress-bar" style={{ height: 3 }}>
          <div className="progress-fill" style={{ width: `${w.progress}%` }} />
        </div>
      </div>

      <div className="px-5 pb-4 space-y-3 border-t border-[var(--input-bg)] pt-3">
        {/* Tasks */}
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle2 size={11} style={{ color: '#4ade80' }} />
            <span className="text-mono-label" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>TODAY'S WORK</span>
          </div>
          <p className="text-sm leading-relaxed line-clamp-3" style={{ color: 'var(--text-primary)' }}>
            {w.tasksCompleted}
          </p>
        </div>

        {/* Blockers */}
        {w.blockers && (
          <div className="rounded-lg px-3 py-2.5" style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.25)' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle size={11} style={{ color: '#fbbf24' }} />
              <span className="text-mono-label" style={{ fontSize: '10px', color: '#fbbf24' }}>BLOCKER</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: '#fbbf24' }}>{w.blockers}</p>
          </div>
        )}

        {/* Next steps */}
        {w.nextSteps && (
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowRight size={11} style={{ color: '#60a5fa' }} />
              <span className="text-mono-label" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>NEXT</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{w.nextSteps}</p>
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--input-bg)]" style={{ background: 'rgba(0,0,0,0.2)' }}>
        <span className="text-mono-label" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          {new Date(w.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
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
          worklogsApi.getAll(),
          projectsApi.getAll(),
          freelancersApi.getAll(),
        ])
        setWorklogs(wRes.status === 'fulfilled' ? (wRes.value.data?.data ?? wRes.value.data) : MOCK_WORKLOGS)
        setProjects(pRes.status === 'fulfilled' ? (pRes.value.data?.data ?? pRes.value.data) : [])
        setFreelancers(fRes.status === 'fulfilled' ? (fRes.value.data?.data ?? fRes.value.data) : [])
      } catch {
        setWorklogs(MOCK_WORKLOGS)
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
          { icon: <Clock size={16} />, label: "HOURS TODAY", value: `${totalHoursToday}h`, color: '#DC143C' },
          { icon: <Users size={16} />, label: "ACTIVE TODAY", value: activeFreelancersToday, color: '#60a5fa' },
          { icon: <ShieldAlert size={16} />, label: "BLOCKERS", value: blockersToday, color: blockersToday > 0 ? '#fbbf24' : '#4ade80' },
        ].map(({ icon, label, value, color }) => (
          <div key={label} className="glass-card-dark rounded-xl px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
              {icon}
            </div>
            <div>
              <p className="text-mono-label mb-0.5" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{label}</p>
              <p className="font-bold text-xl text-primary-ui">{value}</p>
            </div>
          </div>
        ))}
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
                <div className="w-9 h-9 rounded-full" style={{ background: 'rgba(220,20,60,0.1)' }} />
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
                        <div className="w-2 h-2 rounded-full" style={{ background: isToday ? '#DC143C' : 'var(--track-bg)' }} />
                        <span className="font-bold text-sm" style={{ color: isToday ? '#DC143C' : 'var(--text-secondary)' }}>
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
                    <td><span className="text-crimson font-bold text-sm">{w.hoursWorked}h</span></td>
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
                        ? <div className="flex items-center gap-1.5"><AlertTriangle size={13} style={{ color: '#fbbf24' }} /><span className="text-xs" style={{ color: '#fbbf24' }}>Blocked</span></div>
                        : <span className="text-mono-label" style={{ fontSize: '10px', color: '#4ade80' }}>Clear</span>
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
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDetailLog(null)} />
          <div className="glass-card rounded-xl relative z-10 w-full max-w-2xl overflow-hidden" style={{ borderColor: 'rgba(220,20,60,0.4)' }}>
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

              <div>
                <p className="label-field">Tasks Completed</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{detailLog.tasksCompleted}</p>
              </div>

              {detailLog.blockers && (
                <div className="rounded-lg p-4" style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.3)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} style={{ color: '#fbbf24' }} />
                    <p className="label-field" style={{ color: '#fbbf24', marginBottom: 0 }}>Blocker</p>
                  </div>
                  <p className="text-sm" style={{ color: '#fbbf24' }}>{detailLog.blockers}</p>
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
                        <Paperclip size={14} style={{ color: '#DC143C' }} />
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
