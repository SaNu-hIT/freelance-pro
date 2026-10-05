'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Plus, Pencil, Trash2, X, Search, ChevronDown, Eye,
  CheckSquare, Clock, User, DollarSign,
  Calendar, Globe, FileSpreadsheet,
  ExternalLink, Timer, Code2, Users,
  Activity, TrendingUp, Mail, Zap, LayoutGrid, List, UserPlus,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { projectsApi, freelancersApi, tasksApi, sprintsApi, usersApi } from '@/lib/api'
import { Project, ProjectStatus, ProjectPriority, FreelancerProfile, ProjectTask, ProjectSprint, User as AppUser } from '@/lib/types'
import { useCurrencySymbol } from '@/lib/store'
import { apiError } from '@/lib/utils'
import ErrorBanner from '@/components/ui/ErrorBanner'
import NewClientForm, { FieldError, FieldErrors, invalidStyle } from '@/components/admin/NewClientForm'
import { useViewMode } from '@/lib/useViewMode'
import { SprintTaskBoard } from '@/components/admin/SprintTaskBoard'

const VIEW_MODES = ['table', 'grid'] as const

const ALL_STATUSES: ProjectStatus[] = ['new', 'assigned', 'in_progress', 'blocked', 'pending_approval', 'completed', 'delayed']
const ALL_PRIORITIES: ProjectPriority[] = ['low', 'medium', 'high', 'critical']

const PRIORITY_COLORS: Record<ProjectPriority, string> = {
  low: 'var(--fg)', medium: 'var(--fg)', high: 'var(--fg)', critical: 'var(--fg)',
}

function daysRemaining(deadline: string): number {
  const diff = new Date(deadline).getTime() - new Date().setHours(0, 0, 0, 0)
  return Math.ceil(diff / 86400000)
}

function DaysChip({ deadline }: { deadline: string }) {
  const days = daysRemaining(deadline)
  const overdue = days < 0
  const urgent = days >= 0 && days <= 7
  const warning = days > 7 && days <= 14
  const color = overdue ? 'var(--fg)' : urgent ? 'var(--fg)' : warning ? 'var(--fg)' : 'var(--fg)'
  const bg = overdue ? 'rgb(var(--fg-rgb) / 0.1)' : urgent ? 'rgb(var(--fg-rgb) / 0.1)' : warning ? 'rgb(var(--fg-rgb) / 0.1)' : 'rgb(var(--fg-rgb) / 0.1)'
  const border = overdue ? 'rgb(var(--fg-rgb) / 0.3)' : urgent ? 'rgb(var(--fg-rgb) / 0.3)' : warning ? 'rgb(var(--fg-rgb) / 0.3)' : 'rgb(var(--fg-rgb) / 0.3)'
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: bg, border: `1px solid ${border}` }}>
      <Timer size={11} style={{ color }} />
      <span className="font-bold text-xs" style={{ color }}>
        {overdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
      </span>
    </div>
  )
}

function MemberAvatar({ name, size = 24 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const colors = ['var(--fg)', 'var(--fg)', 'var(--fg)', 'var(--fg)', 'var(--fg)', 'var(--fg)']
  const colorIdx = name.charCodeAt(0) % colors.length
  return (
    <div className="rounded-full flex items-center justify-center font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38, background: `color-mix(in srgb, ${colors[colorIdx]} 13%, transparent)`, border: `1.5px solid color-mix(in srgb, ${colors[colorIdx]} 33%, transparent)`, color: colors[colorIdx] }}
      title={name}>
      {initials}
    </div>
  )
}

const EMPTY_FORM = {
  title: '', description: '', budget: '', deadline: '', clientId: '',
  status: 'new' as ProjectStatus, priority: 'medium' as ProjectPriority,
  teamMemberIds: [] as string[],
  repoUrl: '', liveUrl: '', correctionSheetUrl: '',
}

type ProjectForm = typeof EMPTY_FORM

const isHttpUrl = (v: string) => {
  try { return ['http:', 'https:'].includes(new URL(v).protocol) } catch { return false }
}

// Mirrors the backend CreateProjectDto rules so the admin sees every problem at once
function validateProject(f: ProjectForm, creating: boolean): FieldErrors {
  const e: FieldErrors = {}
  if (!f.title.trim()) e.title = 'Title is required.'
  if (creating && !f.clientId) e.clientId = 'Choose the client this project is for, or add a new one.'
  if (!f.description.trim()) e.description = 'Description is required.'
  if (f.budget.trim() === '') e.budget = 'Budget is required.'
  else if (!Number.isFinite(Number(f.budget)) || Number(f.budget) < 0) e.budget = 'Budget must be 0 or more.'
  if (!f.deadline) e.deadline = 'End date is required.'
  else if (creating && f.deadline < new Date().toLocaleDateString('en-CA')) e.deadline = 'End date cannot be in the past.'
  for (const [key, label] of [['repoUrl', 'Repository URL'], ['liveUrl', 'Live URL'], ['correctionSheetUrl', 'Correction sheet URL']] as const) {
    if (f[key].trim() && !isHttpUrl(f[key].trim())) e[key] = `${label} must start with http:// or https://`
  }
  return e
}

type PanelMode = 'view' | 'edit' | 'create' | null

export default function AdminProjectsPage() {
  return (
    <Suspense fallback={null}>
      <AdminProjectsPageInner />
    </Suspense>
  )
}

function AdminProjectsPageInner() {
  const curr = useCurrencySymbol()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [projects, setProjects] = useState<Project[]>([])
  const [freelancers, setFreelancers] = useState<FreelancerProfile[]>([])
  const [clients, setClients] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<ProjectPriority | 'all'>('all')
  const [panelMode, setPanelMode] = useState<PanelMode>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [viewMode, setViewMode] = useViewMode('admin-projects-view', VIEW_MODES, 'table')

  // Sprints + Tasks state
  const [sprints, setSprints] = useState<ProjectSprint[]>([])
  const [tasks, setTasks] = useState<ProjectTask[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)

  // Errors: page load, create/edit modal, delete dialog, view drawer (sprints & tasks)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  // Inline "new client" form inside the project modal
  const [showNewClient, setShowNewClient] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [drawerError, setDrawerError] = useState('')

  useEffect(() => {
    const load = async () => {
      const [pRes, fRes, cRes] = await Promise.allSettled([projectsApi.getAll(), freelancersApi.getAll(), usersApi.list('client')])
      const errors: string[] = []
      if (pRes.status === 'fulfilled') setProjects(pRes.value.data?.data ?? pRes.value.data)
      else errors.push(apiError(pRes.reason, 'Could not load projects.'))
      if (fRes.status === 'fulfilled') setFreelancers(fRes.value.data?.data ?? fRes.value.data)
      else errors.push(apiError(fRes.reason, 'Could not load team members.'))
      if (cRes.status === 'fulfilled') setClients(cRes.value.data ?? [])
      else errors.push(apiError(cRes.reason, 'Could not load clients.'))
      setLoadError(errors.join(' '))
      setLoading(false)
    }
    load()
  }, [])

  const loadProjectData = async (projectId: string) => {
    setTasksLoading(true)
    setDrawerError('')
    setSprints([])
    setTasks([])
    const [sRes, tRes] = await Promise.allSettled([
      sprintsApi.getByProject(projectId),
      tasksApi.getByProject(projectId),
    ])
    const errors: string[] = []
    if (sRes.status === 'fulfilled') setSprints(sRes.value.data)
    else errors.push(apiError(sRes.reason, 'Could not load sprints.'))
    if (tRes.status === 'fulfilled') setTasks(tRes.value.data)
    else errors.push(apiError(tRes.reason, 'Could not load tasks.'))
    setDrawerError(errors.join(' '))
    setTasksLoading(false)
  }

  // Auto-open edit panel when ?edit=<id> query param is present
  useEffect(() => {
    const editId = searchParams.get('edit')
    if (!editId || projects.length === 0) return
    const target = projects.find(p => p.id === editId)
    if (target) {
      openEdit(target)
      // Clean URL without re-render
      router.replace('/admin/projects', { scroll: false })
    }
  }, [searchParams, projects]) // eslint-disable-line

  const openView = (p: Project) => {
    setSelectedProject(p)
    setPanelMode('view')
    loadProjectData(p.id)
  }

  const resetFormExtras = () => {
    setSaveError(''); setFieldErrors({})
    setShowNewClient(false)
  }

  const openCreate = () => { setForm(EMPTY_FORM); setSelectedProject(null); resetFormExtras(); setPanelMode('create') }

  // Set one field and clear its error so the message goes away as soon as it is fixed
  const setField = <K extends keyof ProjectForm>(key: K, value: ProjectForm[K]) => {
    setForm(f => ({ ...f, [key]: value }))
    setFieldErrors(e => (e[key] ? { ...e, [key]: undefined } : e))
  }

  const openEdit = (p: Project) => {
    setSelectedProject(p)
    resetFormExtras()
    setForm({
      title: p.title, description: p.description, budget: String(p.budget),
      deadline: p.deadline?.slice(0, 10) ?? '', clientId: p.clientId ?? p.client?.id ?? '',
      status: p.status, priority: p.priority,
      teamMemberIds: p.teamMembers?.map(m => m.id) ?? [],
      repoUrl: p.repoUrl ?? '', liveUrl: p.liveUrl ?? '', correctionSheetUrl: p.correctionSheetUrl ?? '',
    })
    setPanelMode('edit')
  }

  const toggleTeamMember = (id: string) => {
    setForm(f => ({
      ...f,
      teamMemberIds: f.teamMemberIds.includes(id)
        ? f.teamMemberIds.filter(x => x !== id)
        : [...f.teamMemberIds, id],
    }))
  }

  const handleSave = async () => {
    const errors = validateProject(form, panelMode === 'create')
    setFieldErrors(errors)
    if (Object.keys(errors).length) {
      setSaveError('Fix the highlighted fields and try again.')
      return
    }
    setSaving(true)
    setSaveError('')
    // Older projects may have no client account yet; leave clientId out rather than send ''
    const { clientId, ...rest } = form
    const payload = {
      ...rest,
      title: form.title.trim(),
      description: form.description.trim(),
      repoUrl: form.repoUrl.trim(),
      liveUrl: form.liveUrl.trim(),
      correctionSheetUrl: form.correctionSheetUrl.trim(),
      budget: Number(form.budget),
      ...(clientId ? { clientId } : {}),
    }
    if (panelMode === 'create') {
      let created: Project
      try {
        created = (await projectsApi.create(payload)).data
      } catch (err) {
        setSaveError(apiError(err, 'Could not create the project.'))
        setSaving(false)
        return
      }
      // Create ignores status and team; set them with a follow-up update
      if (form.teamMemberIds.length > 0 || form.status !== created.status) {
        try {
          created = (await projectsApi.update(created.id, { status: form.status, teamMemberIds: form.teamMemberIds })).data
        } catch (err) {
          setProjects(prev => [created, ...prev])
          setSelectedProject(created)
          setPanelMode('edit')
          setSaveError(`Project created, but its status and team were not saved: ${apiError(err, 'update failed.')}`)
          setSaving(false)
          return
        }
      }
      setProjects(prev => [created, ...prev])
    } else if (selectedProject) {
      try {
        const res = await projectsApi.update(selectedProject.id, payload)
        setProjects(prev => prev.map(p => p.id === selectedProject.id ? res.data : p))
      } catch (err) {
        setSaveError(apiError(err, 'Could not save the project.'))
        setSaving(false)
        return
      }
    }
    setSaving(false)
    setPanelMode(null)
  }

  const handleDelete = async (id: string) => {
    setDeleteError('')
    try {
      await projectsApi.delete(id)
    } catch (err) {
      setDeleteError(apiError(err, 'Could not delete the project.'))
      return
    }
    setProjects(prev => prev.filter(p => p.id !== id))
    setDeleteId(null)
  }

  const filtered = projects.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.client?.name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    const matchPriority = priorityFilter === 'all' || p.priority === priorityFilter
    return matchSearch && matchStatus && matchPriority
  })

  // Team members for current view project
  const viewTeam = selectedProject?.teamMembers ?? []
  const completedCount = tasks.filter(t => t.completed).length
  const boardTeam = viewTeam.map(m => ({ id: m.id, name: m.user?.name ?? 'Unnamed' }))

  return (
    <DashboardLayout allowedRoles={['admin']}>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-mono-label mb-1">MANAGEMENT</p>
          <h1 className="text-display text-4xl text-primary-ui">PROJECTS</h1>
          <p className="text-mono-label mt-1" style={{ color: 'var(--text-muted)' }}>{projects.length} total projects</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 rounded text-sm"><Plus size={16} /> New Project</button>
      </div>

      {loadError && <div className="mb-6"><ErrorBanner title="Could not load data" message={loadError} onClose={() => setLoadError('')} /></div>}

      {/* Filters */}
      <div className="glass-card-dark rounded-xl p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search projects or clients..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9 py-2.5 text-sm" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setStatusFilter('all')} className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${statusFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}>ALL</button>
          {ALL_STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s === statusFilter ? 'all' : s)} className={`px-3 py-1.5 rounded text-xs transition-all ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}>
              {s.replace(/_/g, ' ').toUpperCase()}
            </button>
          ))}
        </div>
        <div className="relative">
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as ProjectPriority | 'all')} className="input-field py-2.5 text-sm pr-8 appearance-none cursor-pointer" style={{ width: 150 }}>
            <option value="all">All Priorities</option>
            {ALL_PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
        </div>
        {/* View toggle */}
        <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <button onClick={() => setViewMode('table')} className="p-1.5 rounded transition-all" style={{ background: viewMode === 'table' ? 'rgb(var(--fg-rgb) / 0.15)' : 'transparent', color: viewMode === 'table' ? 'var(--fg)' : 'var(--text-muted)' }} title="Table view"><List size={14} /></button>
          <button onClick={() => setViewMode('grid')} className="p-1.5 rounded transition-all" style={{ background: viewMode === 'grid' ? 'rgb(var(--fg-rgb) / 0.15)' : 'transparent', color: viewMode === 'grid' ? 'var(--fg)' : 'var(--text-muted)' }} title="Grid view"><LayoutGrid size={14} /></button>
        </div>
      </div>

      {/* Projects — Table / Grid */}
      {loading ? (
        <div className="glass-card rounded-xl p-6 space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="animate-pulse flex gap-4"><div className="h-4 rounded flex-1" style={{ background: 'rgb(var(--fg-rgb) / 0.1)' }} /></div>)}</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-xl text-center py-16"><p className="text-mono-label text-lg" style={{ color: 'var(--text-muted)' }}>NO PROJECTS FOUND</p></div>
      ) : viewMode === 'table' ? (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Title</th><th>Client</th><th>Budget</th><th>Deadline</th><th>Progress</th><th>Priority</th><th>Status</th><th>Team</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="cursor-pointer hover:bg-[var(--row-hover-bg)] transition-colors"
                    onClick={() => router.push(`/admin/projects/${p.id}`)}>
                    <td>
                      <Link href={`/admin/projects/${p.id}`} className="font-semibold text-primary-ui text-sm max-w-[200px] truncate block hover:text-[var(--fg)] transition-colors">{p.title}</Link>
                    </td>
                    <td><span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{p.client?.name ?? '—'}</span></td>
                    <td><span className="text-crimson font-bold">{curr}{Number(p.budget).toLocaleString()}</span></td>
                    <td>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-mono-label" style={{ fontSize: '11px' }}>{new Date(p.deadline).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: '2-digit' })}</span>
                        <DaysChip deadline={p.deadline} />
                      </div>
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <div className="flex items-center gap-2">
                        <div className="progress-bar flex-1"><div className="progress-fill" style={{ width: `${p.progress ?? 0}%` }} /></div>
                        <span className="text-crimson text-xs">{p.progress ?? 0}%</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-mono-label px-2 py-1 rounded" style={{ fontSize: '10px', color: PRIORITY_COLORS[p.priority], background: `color-mix(in srgb, ${PRIORITY_COLORS[p.priority]} 9%, transparent)`, border: `1px solid color-mix(in srgb, ${PRIORITY_COLORS[p.priority]} 25%, transparent)` }}>
                        {p.priority.toUpperCase()}
                      </span>
                    </td>
                    <td><StatusBadge status={p.status} /></td>
                    <td>
                      {p.teamMembers && p.teamMembers.length > 0 ? (
                        <div className="flex items-center -space-x-1.5">
                          {p.teamMembers.slice(0, 4).map(m => (
                            <MemberAvatar key={m.id} name={m.user?.name ?? '?'} size={22} />
                          ))}
                          {p.teamMembers.length > 4 && (
                            <div className="rounded-full flex items-center justify-center text-xs font-bold" style={{ width: 22, height: 22, background: 'var(--input-bg)', border: '1.5px solid var(--track-bg)', color: 'var(--text-secondary)' }}>
                              +{p.teamMembers.length - 4}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>—</span>
                      )}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openView(p)} className="p-1.5 rounded glass-card-dark hover:border-[var(--fg)] transition-colors" title="View details"><Eye size={13} style={{ color: 'var(--fg)' }} /></button>
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded glass-card-dark hover:border-[var(--fg)] transition-colors" title="Edit"><Pencil size={13} style={{ color: 'var(--fg)' }} /></button>
                        <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded glass-card-dark hover:border-[var(--fg)] transition-colors" title="Delete"><Trash2 size={13} style={{ color: 'var(--fg)' }} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid view */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => (
            <div
              key={p.id}
              className="rounded-xl overflow-hidden cursor-pointer group transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--fg)]"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              onClick={() => router.push(`/admin/projects/${p.id}`)}
            >
              <div className="h-0.5" style={{ background: `linear-gradient(to right, ${PRIORITY_COLORS[p.priority]}, transparent)` }} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base leading-tight text-primary-ui truncate">{p.title}</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{p.client?.name ?? 'No client'}</p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                {/* Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-mono-label text-[10px]" style={{ color: 'var(--text-muted)' }}>PROGRESS</span>
                    <span className="font-bold text-xs" style={{ color: 'var(--fg)' }}>{p.progress ?? 0}%</span>
                  </div>
                  <div className="rounded-full overflow-hidden" style={{ height: 5, background: 'var(--track-bg)' }}>
                    <div className="h-full rounded-full" style={{ width: `${p.progress ?? 0}%`, background: 'var(--fg)' }} />
                  </div>
                </div>
                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="rounded-lg px-2.5 py-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <p className="text-mono-label text-[9px] mb-0.5" style={{ color: 'var(--text-muted)' }}>BUDGET</p>
                    <p className="font-bold text-sm text-crimson">{curr}{Number(p.budget).toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg px-2.5 py-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <p className="text-mono-label text-[9px] mb-0.5" style={{ color: 'var(--text-muted)' }}>DEADLINE</p>
                    <DaysChip deadline={p.deadline} />
                  </div>
                </div>
                {/* Footer */}
                <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                  {p.teamMembers && p.teamMembers.length > 0 ? (
                    <div className="flex items-center -space-x-1.5">
                      {p.teamMembers.slice(0, 4).map(m => <MemberAvatar key={m.id} name={m.user?.name ?? '?'} size={20} />)}
                      {p.teamMembers.length > 4 && <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>+{p.teamMembers.length - 4}</span>}
                    </div>
                  ) : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>No team</span>}
                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded glass-card-dark hover:border-[var(--fg)] transition-colors"><Pencil size={12} style={{ color: 'var(--fg)' }} /></button>
                    <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded glass-card-dark hover:border-[var(--fg)] transition-colors"><Trash2 size={12} style={{ color: 'var(--fg)' }} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Full-screen View Modal ── */}
      {panelMode === 'view' && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-stretch">
          <div className="absolute inset-0 bg-[rgb(var(--bg-rgb)/.92)]" onClick={() => setPanelMode(null)} />
          <div className="relative z-10 m-4 flex-1 rounded-2xl overflow-hidden flex flex-col"
            style={{ background: 'var(--bg-surface)', border: '1px solid rgb(var(--fg-rgb) / 0.25)', maxHeight: 'calc(100vh - 32px)' }}>

            {/* ── Modal Header ── */}
            <div className="flex items-center gap-4 px-8 py-5 shrink-0 border-b border-theme"
              style={{ background: 'var(--bg-sidebar)' }}>
              {/* left: title block */}
              <div className="flex-1 min-w-0">
                <p className="text-mono-label mb-0.5" style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.2em' }}>PROJECT DETAIL</p>
                <h2 className="text-primary-ui font-bold text-xl leading-tight truncate">{selectedProject.title}</h2>
                {selectedProject.client?.name && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Client: <span style={{ color: 'var(--text-secondary)' }}>{selectedProject.client.name}</span></p>
                )}
              </div>
              {/* centre: chips */}
              <div className="hidden md:flex items-center gap-2 shrink-0">
                <DaysChip deadline={selectedProject.deadline} />
                <span className="text-mono-label px-2.5 py-1 rounded-lg text-[10px]"
                  style={{ color: PRIORITY_COLORS[selectedProject.priority], background: `color-mix(in srgb, ${PRIORITY_COLORS[selectedProject.priority]} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${PRIORITY_COLORS[selectedProject.priority]} 21%, transparent)` }}>
                  {selectedProject.priority.toUpperCase()} PRIORITY
                </span>
                <StatusBadge status={selectedProject.status} />
              </div>
              {/* right: actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => openEdit(selectedProject)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all"
                  style={{ background: 'var(--crimson-dim)', border: '1px solid var(--border-crimson)', color: 'var(--fg)' }}>
                  <Pencil size={12} /> Edit
                </button>
                <button onClick={() => setPanelMode(null)}
                  className="p-2 rounded transition-colors"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* ── Two-column body ── */}
            <div className="flex-1 overflow-hidden flex min-h-0">

              {/* LEFT COLUMN — project info */}
              <div className="w-[42%] shrink-0 overflow-y-auto border-r border-theme px-8 py-6 space-y-7">

                {/* Stat cards */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: <DollarSign size={14} />, label: 'BUDGET',   value: `${curr}${Number(selectedProject.budget).toLocaleString()}`, color: 'var(--fg)', bg: 'rgb(var(--fg-rgb) / 0.08)', border: 'rgb(var(--fg-rgb) / 0.2)' },
                    { icon: <Calendar size={14} />,   label: 'DEADLINE', value: new Date(selectedProject.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), color: 'var(--fg)', bg: 'rgb(var(--fg-rgb) / 0.08)', border: 'rgb(var(--fg-rgb) / 0.2)' },
                    { icon: <Users size={14} />,      label: 'TEAM SIZE',value: `${viewTeam.length} member${viewTeam.length !== 1 ? 's' : ''}`, color: 'var(--fg)', bg: 'rgb(var(--fg-rgb) / 0.08)', border: 'rgb(var(--fg-rgb) / 0.2)' },
                    { icon: <CheckSquare size={14} />,label: 'TASKS DONE',value: `${completedCount} / ${tasks.length}`, color: 'var(--fg)', bg: 'rgb(var(--fg-rgb) / 0.08)', border: 'rgb(var(--fg-rgb) / 0.2)' },
                  ].map(({ icon, label, value, color, bg, border }) => (
                    <div key={label} className="rounded-xl px-4 py-3.5" style={{ background: bg, border: `1px solid ${border}` }}>
                      <div className="flex items-center gap-1.5 mb-2" style={{ color }}>
                        {icon}
                        <span className="text-mono-label" style={{ fontSize: '10px', letterSpacing: '0.15em' }}>{label}</span>
                      </div>
                      <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-mono-label" style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.15em' }}>OVERALL PROGRESS</span>
                    <span className="font-bold text-sm" style={{ color: 'var(--fg)' }}>{selectedProject.progress ?? 0}%</span>
                  </div>
                  <div className="rounded-full overflow-hidden" style={{ height: 8, background: 'var(--track-bg)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${selectedProject.progress ?? 0}%`, background: 'var(--fg)' }} />
                  </div>
                </div>

                {/* Links */}
                {(selectedProject.repoUrl || selectedProject.liveUrl || selectedProject.correctionSheetUrl) && (
                  <div>
                    <p className="text-mono-label mb-3" style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.15em' }}>PROJECT LINKS</p>
                    <div className="space-y-2">
                      {selectedProject.repoUrl && (
                        <a href={selectedProject.repoUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-medium transition-all group"
                          style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                          <Code2 size={14} style={{ color: 'var(--fg)' }} />
                          <span className="flex-1">Repository</span>
                          <ExternalLink size={11} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                        </a>
                      )}
                      {selectedProject.liveUrl && (
                        <a href={selectedProject.liveUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-medium transition-all group"
                          style={{ background: 'rgb(var(--fg-rgb) / 0.05)', border: '1px solid rgb(var(--fg-rgb) / 0.2)', color: 'var(--fg)' }}>
                          <Globe size={14} />
                          <span className="flex-1">Live / Staging</span>
                          <ExternalLink size={11} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                        </a>
                      )}
                      {selectedProject.correctionSheetUrl && (
                        <a href={selectedProject.correctionSheetUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-medium transition-all group"
                          style={{ background: 'rgb(var(--fg-rgb) / 0.05)', border: '1px solid rgb(var(--fg-rgb) / 0.2)', color: 'var(--fg)' }}>
                          <FileSpreadsheet size={14} />
                          <span className="flex-1">Correction Sheet</span>
                          <ExternalLink size={11} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Description */}
                {selectedProject.description && (
                  <div>
                    <p className="text-mono-label mb-2" style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.15em' }}>DESCRIPTION</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{selectedProject.description}</p>
                  </div>
                )}

                {/* ── Team Members ── */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Users size={13} style={{ color: 'var(--fg)' }} />
                      <p className="text-mono-label font-bold" style={{ fontSize: '10px', color: 'var(--text-secondary)', letterSpacing: '0.15em' }}>ASSIGNED EMPLOYEES</p>
                    </div>
                    <span className="text-mono-label px-2 py-0.5 rounded-full text-[10px]"
                      style={{ background: 'rgb(var(--fg-rgb) / 0.1)', border: '1px solid rgb(var(--fg-rgb) / 0.25)', color: 'var(--fg)' }}>
                      {viewTeam.length} total
                    </span>
                  </div>

                  {viewTeam.length === 0 ? (
                    <div className="rounded-xl px-4 py-6 text-center" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
                      <Users size={20} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No team members assigned</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {viewTeam.map((m, idx) => {
                        const palette = ['var(--fg)', 'var(--fg)', 'var(--fg)', 'var(--fg)', 'var(--fg)', 'var(--fg)']
                        const accent  = palette[(m.user?.name?.charCodeAt(0) ?? idx) % palette.length]
                        const memberTasks   = tasks.filter(t => t.assignedFreelancerId === m.id)
                        const memberDone    = memberTasks.filter(t => t.completed).length
                        const memberPending = memberTasks.filter(t => !t.completed).length
                        const pct = memberTasks.length ? Math.round((memberDone / memberTasks.length) * 100) : 0
                        const initials = (m.user?.name ?? '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                        const isIntern = m.track === 'intern'
                        const estCost  = m.hourlyRate ? `${curr}${(m.hourlyRate * 8).toLocaleString()}` : null

                        return (
                          <div key={m.id} className="rounded-xl overflow-hidden"
                            style={{ background: 'var(--bg-elevated)', border: `1px solid color-mix(in srgb, ${accent} 13%, transparent)` }}>

                            {/* colour accent bar */}
                            <div className="h-0.5 w-full" style={{ background: `linear-gradient(to right, ${accent}, transparent)` }} />

                            <div className="p-4">
                              {/* ── Row 1: avatar + name + rate ── */}
                              <div className="flex items-start gap-3 mb-3">
                                {/* avatar */}
                                <div className="relative shrink-0">
                                  <div className="rounded-2xl flex items-center justify-center font-bold text-base"
                                    style={{ width: 48, height: 48, background: `color-mix(in srgb, ${accent} 9%, transparent)`, border: `2px solid color-mix(in srgb, ${accent} 25%, transparent)`, color: accent }}>
                                    {initials}
                                  </div>
                                  {/* online dot */}
                                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                                    style={{ background: 'var(--fg)', borderColor: 'var(--bg-elevated)' }} />
                                </div>

                                {/* name block */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                    <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{m.user?.name ?? 'Unknown'}</p>
                                    <span className="text-mono-label px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                                      style={{ background: isIntern ? 'rgb(var(--fg-rgb) / 0.12)' : `color-mix(in srgb, ${accent} 7%, transparent)`, border: `1px solid ${isIntern ? 'rgb(var(--fg-rgb) / 0.3)' : `color-mix(in srgb, ${accent} 19%, transparent)`}`, color: isIntern ? 'var(--fg)' : accent }}>
                                      {isIntern ? '⚡ INTERN' : '✦ PRO'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <Mail size={10} style={{ color: 'var(--text-muted)' }} />
                                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{m.user?.email ?? '—'}</p>
                                  </div>
                                </div>

                                {/* rate */}
                                {m.hourlyRate && (
                                  <div className="shrink-0 text-right">
                                    <div className="flex items-center gap-1 justify-end mb-0.5">
                                      <Zap size={10} style={{ color: 'var(--fg)' }} />
                                      <p className="font-bold text-base" style={{ color: 'var(--fg)' }}>{curr}{m.hourlyRate}<span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/hr</span></p>
                                    </div>
                                    {estCost && <p className="text-mono-label text-[9px]" style={{ color: 'var(--text-muted)' }}>~{estCost}/day</p>}
                                  </div>
                                )}
                              </div>

                              {/* ── Row 2: skills ── */}
                              {m.skills?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                  {m.skills.slice(0, 6).map((sk: string) => (
                                    <span key={sk} className="text-mono-label px-2 py-0.5 rounded-full text-[9px]"
                                      style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                                      {sk}
                                    </span>
                                  ))}
                                  {m.skills.length > 6 && (
                                    <span className="text-mono-label text-[9px]" style={{ color: 'var(--text-muted)' }}>+{m.skills.length - 6} more</span>
                                  )}
                                </div>
                              )}

                              {/* ── Row 3: task stats + progress ── */}
                              <div className="rounded-lg px-3 py-2.5" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1">
                                      <Activity size={11} style={{ color: accent }} />
                                      <span className="text-mono-label text-[10px]" style={{ color: 'var(--text-muted)' }}>TASKS</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: 'var(--fg)' }}>
                                        <CheckSquare size={10} /> {memberDone} done
                                      </span>
                                      {memberPending > 0 && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: 'var(--fg)' }}>
                                          <Clock size={10} /> {memberPending} open
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <TrendingUp size={10} style={{ color: pct >= 50 ? 'var(--fg)' : 'var(--fg)' }} />
                                    <span className="font-bold text-[10px]" style={{ color: pct >= 50 ? 'var(--fg)' : 'var(--fg)' }}>{pct}%</span>
                                  </div>
                                </div>
                                {memberTasks.length > 0 ? (
                                  <div className="rounded-full overflow-hidden" style={{ height: 5, background: 'var(--track-bg)' }}>
                                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: `linear-gradient(to right, color-mix(in srgb, ${accent} 60%, transparent), ${accent})` }} />
                                  </div>
                                ) : (
                                  <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>No tasks assigned yet</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN — sprints & tasks */}
              <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-4">

                {drawerError && <ErrorBanner message={drawerError} onClose={() => setDrawerError('')} />}
                {tasksLoading ? (
                  <div className="space-y-3">{[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse h-12 rounded-xl" style={{ background: 'var(--input-bg)' }} />
                  ))}</div>
                ) : selectedProject && (
                  <SprintTaskBoard projectId={selectedProject.id} team={boardTeam}
                    tasks={tasks} setTasks={setTasks} sprints={sprints} setSprints={setSprints} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit — full-width modal ── */}
      {(panelMode === 'create' || panelMode === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-stretch">
          <div className="absolute inset-0 bg-[rgb(var(--bg-rgb)/.92)]" onClick={() => setPanelMode(null)} />
          <div className="relative z-10 m-4 flex-1 rounded-2xl overflow-hidden flex flex-col"
            style={{ background: 'var(--bg-surface)', border: '1px solid rgb(var(--fg-rgb) / 0.25)', maxHeight: 'calc(100vh - 32px)' }}>

            {/* Header */}
            <div className="flex items-center gap-4 px-8 py-5 shrink-0 border-b border-theme"
              style={{ background: 'var(--bg-sidebar)' }}>
              <div className="flex-1 min-w-0">
                <p className="text-mono-label mb-0.5" style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.2em' }}>
                  {panelMode === 'create' ? 'NEW PROJECT' : 'EDIT PROJECT'}
                </p>
                <h2 className="text-primary-ui font-bold text-xl leading-tight truncate">
                  {panelMode === 'create' ? 'Create a New Project' : selectedProject?.title}
                </h2>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={handleSave} disabled={saving}
                  className="btn-primary flex items-center gap-2 px-5 py-2 rounded text-sm disabled:opacity-50">
                  {saving ? <><Clock size={13} className="animate-spin" /> Saving…</> : panelMode === 'create' ? <><Plus size={13} /> Create Project</> : <><Pencil size={13} /> Save Changes</>}
                </button>
                <button onClick={() => setPanelMode(null)}
                  className="p-2 rounded transition-colors"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Two-column body */}
            <div className="flex-1 overflow-hidden flex min-h-0">

              {/* LEFT — core project details */}
              <div className="w-[55%] shrink-0 border-r border-theme overflow-y-auto px-8 py-7 space-y-6">
                {saveError && <ErrorBanner title="Not saved" message={saveError} onClose={() => setSaveError('')} />}
                <p className="text-mono-label" style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.15em' }}>PROJECT DETAILS</p>

                {/* Title */}
                <div>
                  <label htmlFor="project-title" className="label-field">Project Title *</label>
                  <input id="project-title" className="input-field text-base" placeholder="Enter project title…"
                    aria-invalid={!!fieldErrors.title} aria-describedby="project-title-error" style={invalidStyle(fieldErrors.title)}
                    value={form.title} onChange={e => setField('title', e.target.value)} />
                  <FieldError id="project-title-error" message={fieldErrors.title} />
                </div>

                {/* Client */}
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="project-client" className="label-field">Client{panelMode === 'create' ? ' *' : ''}</label>
                    {!showNewClient && (
                      <button type="button" onClick={() => setShowNewClient(true)}
                        className="flex items-center gap-1 text-xs font-semibold mb-1.5" style={{ color: 'var(--fg)' }}>
                        <UserPlus size={12} /> New client
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <select id="project-client" className="input-field appearance-none pr-8" value={form.clientId}
                      aria-invalid={!!fieldErrors.clientId} aria-describedby="project-client-error" style={invalidStyle(fieldErrors.clientId)}
                      onChange={e => setField('clientId', e.target.value)}>
                      <option value="" disabled>{clients.length ? 'Select a client…' : 'No client accounts yet. Add one with "New client"'}</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.company ? `${c.name} (${c.company})` : c.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <FieldError id="project-client-error" message={fieldErrors.clientId} />

                  {showNewClient && (
                    <div className="mt-3 rounded-xl p-4 space-y-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <div className="flex items-center justify-between">
                        <p className="text-mono-label" style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.15em' }}>NEW CLIENT ACCOUNT</p>
                        <button type="button" aria-label="Cancel new client" onClick={() => setShowNewClient(false)}
                          style={{ color: 'var(--text-muted)' }}>
                          <X size={14} />
                        </button>
                      </div>
                      <NewClientForm onCreated={c => {
                        setClients(prev => [c, ...prev])
                        setField('clientId', c.id)
                        setShowNewClient(false)
                      }} />
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="project-description" className="label-field">Description *</label>
                  <textarea id="project-description" className="input-field resize-none" rows={4} placeholder="Describe the project scope, goals, and deliverables…"
                    aria-invalid={!!fieldErrors.description} aria-describedby="project-description-error" style={invalidStyle(fieldErrors.description)}
                    value={form.description} onChange={e => setField('description', e.target.value)} />
                  <FieldError id="project-description-error" message={fieldErrors.description} />
                </div>

                {/* Budget + Deadline */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="project-budget" className="label-field flex items-center gap-1.5">
                      <DollarSign size={11} style={{ color: 'var(--fg)' }} /> Budget ({curr}) *
                    </label>
                    <input id="project-budget" type="number" min={0} step="any" className="input-field" placeholder="0"
                      aria-invalid={!!fieldErrors.budget} aria-describedby="project-budget-error" style={invalidStyle(fieldErrors.budget)}
                      value={form.budget} onChange={e => setField('budget', e.target.value)} />
                    <FieldError id="project-budget-error" message={fieldErrors.budget} />
                  </div>
                  <div>
                    <label htmlFor="project-deadline" className="label-field flex items-center gap-1.5">
                      <Calendar size={11} style={{ color: 'var(--fg)' }} /> End Date *
                    </label>
                    <input id="project-deadline" type="date" className="input-field"
                      aria-invalid={!!fieldErrors.deadline} aria-describedby="project-deadline-error" style={invalidStyle(fieldErrors.deadline)}
                      value={form.deadline} onChange={e => setField('deadline', e.target.value)} />
                    <FieldError id="project-deadline-error" message={fieldErrors.deadline} />
                  </div>
                </div>

                {/* Status + Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-field">Status</label>
                    <div className="relative">
                      <select className="input-field appearance-none pr-8" value={form.status}
                        onChange={e => setField('status', e.target.value as ProjectStatus)}>
                        {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                      </select>
                      <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                  <div>
                    <label className="label-field">Priority</label>
                    <div className="relative">
                      <select className="input-field appearance-none pr-8" value={form.priority}
                        onChange={e => setField('priority', e.target.value as ProjectPriority)}>
                        {ALL_PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                      </select>
                      <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                </div>

                {/* Links */}
                <div className="pt-2 border-t border-theme">
                  <p className="text-mono-label mb-4" style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.15em' }}>PROJECT LINKS</p>
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="project-repo" className="label-field flex items-center gap-1.5"><Code2 size={11} style={{ color: 'var(--fg)' }} /> Repository URL</label>
                      <input id="project-repo" className="input-field" placeholder="https://github.com/org/repo"
                        aria-invalid={!!fieldErrors.repoUrl} aria-describedby="project-repo-error" style={invalidStyle(fieldErrors.repoUrl)}
                        value={form.repoUrl} onChange={e => setField('repoUrl', e.target.value)} />
                      <FieldError id="project-repo-error" message={fieldErrors.repoUrl} />
                    </div>
                    <div>
                      <label htmlFor="project-live" className="label-field flex items-center gap-1.5"><Globe size={11} style={{ color: 'var(--fg)' }} /> Live / Staging URL</label>
                      <input id="project-live" className="input-field" placeholder="https://staging.yoursite.com"
                        aria-invalid={!!fieldErrors.liveUrl} aria-describedby="project-live-error" style={invalidStyle(fieldErrors.liveUrl)}
                        value={form.liveUrl} onChange={e => setField('liveUrl', e.target.value)} />
                      <FieldError id="project-live-error" message={fieldErrors.liveUrl} />
                    </div>
                    <div>
                      <label htmlFor="project-sheet" className="label-field flex items-center gap-1.5"><FileSpreadsheet size={11} style={{ color: 'var(--fg)' }} /> Correction Sheet URL</label>
                      <input id="project-sheet" className="input-field" placeholder="https://docs.google.com/spreadsheets/…"
                        aria-invalid={!!fieldErrors.correctionSheetUrl} aria-describedby="project-sheet-error" style={invalidStyle(fieldErrors.correctionSheetUrl)}
                        value={form.correctionSheetUrl} onChange={e => setField('correctionSheetUrl', e.target.value)} />
                      <FieldError id="project-sheet-error" message={fieldErrors.correctionSheetUrl} />
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT — team members */}
              <div className="flex-1 overflow-y-auto px-8 py-7">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-mono-label mb-0.5" style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.15em' }}>ASSIGN EMPLOYEES</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Select team members to add to this project</p>
                  </div>
                  {form.teamMemberIds.length > 0 && (
                    <span className="text-mono-label px-2.5 py-1 rounded-full text-[10px] font-bold"
                      style={{ background: 'rgb(var(--fg-rgb) / 0.1)', border: '1px solid rgb(var(--fg-rgb) / 0.3)', color: 'var(--fg)' }}>
                      {form.teamMemberIds.length} selected
                    </span>
                  )}
                </div>

                {freelancers.length === 0 ? (
                  <div className="rounded-xl px-4 py-10 text-center" style={{ background: 'var(--input-bg)', border: '1px dashed var(--border)' }}>
                    <Users size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No team members available yet</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {freelancers.map(fl => {
                      const selected = form.teamMemberIds.includes(fl.id)
                      const palette = ['var(--fg)', 'var(--fg)', 'var(--fg)', 'var(--fg)', 'var(--fg)', 'var(--fg)']
                      const accent  = palette[(fl.user?.name?.charCodeAt(0) ?? 0) % palette.length]
                      const initials = (fl.user?.name ?? '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                      return (
                        <label key={fl.id} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all select-none"
                          style={{
                            background: selected ? 'rgb(var(--fg-rgb) / 0.07)' : 'var(--bg-elevated)',
                            border: `1px solid ${selected ? 'rgb(var(--fg-rgb) / 0.35)' : 'var(--border)'}`,
                          }}>
                          <input type="checkbox" checked={selected} onChange={() => toggleTeamMember(fl.id)} className="hidden" />

                          {/* custom checkbox */}
                          <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all"
                            style={{ background: selected ? 'var(--fg)' : 'var(--input-bg)', border: `1.5px solid ${selected ? 'var(--fg)' : 'var(--border)'}` }}>
                            {selected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                          </div>

                          {/* avatar */}
                          <div className="rounded-xl flex items-center justify-center font-bold text-xs shrink-0"
                            style={{ width: 38, height: 38, background: `color-mix(in srgb, ${accent} 9%, transparent)`, border: `1.5px solid color-mix(in srgb, ${accent} 25%, transparent)`, color: accent }}>
                            {initials}
                          </div>

                          {/* info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-sm font-semibold truncate" style={{ color: selected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{fl.user?.name}</p>
                              {fl.track === 'intern' && (
                                <span className="text-mono-label px-1.5 py-0.5 rounded text-[9px]"
                                  style={{ background: 'rgb(var(--fg-rgb) / 0.12)', border: '1px solid rgb(var(--fg-rgb) / 0.3)', color: 'var(--fg)' }}>INTERN</span>
                              )}
                            </div>
                            {fl.skills?.length > 0 && (
                              <p className="text-mono-label truncate" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                {fl.skills.slice(0, 4).join(' · ')}
                              </p>
                            )}
                          </div>

                          {/* rate */}
                          {fl.hourlyRate && (
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold" style={{ color: 'var(--fg)' }}>{curr}{fl.hourlyRate}</p>
                              <p className="text-mono-label" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>/ hr</p>
                            </div>
                          )}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-4 border-t border-theme flex items-center justify-between shrink-0"
              style={{ background: 'var(--bg-sidebar)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {panelMode === 'edit' ? 'Changes will be saved immediately.' : 'Project will be created and visible in the dashboard.'}
              </p>
              <div className="flex items-center gap-3">
                <button onClick={() => setPanelMode(null)} className="btn-ghost rounded text-sm py-2 px-5">Cancel</button>
                <button onClick={handleSave} disabled={saving}
                  className="btn-primary flex items-center gap-2 rounded text-sm py-2 px-6 disabled:opacity-50">
                  {saving ? <><Clock size={13} className="animate-spin" /> Saving…</> : panelMode === 'create' ? <><Plus size={13} /> Create Project</> : <><Pencil size={13} /> Save Changes</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-[rgb(var(--bg-rgb)/.92)]" onClick={() => { setDeleteId(null); setDeleteError('') }} />
          <div className="glass-card rounded-xl p-8 relative z-10 w-full max-w-md text-center" style={{ borderColor: 'rgb(var(--fg-rgb) / 0.5)' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgb(var(--fg-rgb) / 0.1)' }}><Trash2 size={20} style={{ color: 'var(--fg)' }} /></div>
            <h3 className="text-primary-ui font-bold text-lg mb-2">Delete Project</h3>
            <p className="text-mono-label mb-6" style={{ color: 'var(--text-muted)' }}>This action cannot be undone. The project and all associated data will be permanently removed.</p>
            {deleteError && <div className="mb-6 text-left"><ErrorBanner title="Not deleted" message={deleteError} /></div>}
            <div className="flex gap-3 justify-center">
              <button onClick={() => handleDelete(deleteId)} className="btn-primary rounded px-6" style={{ background: 'var(--fg)' }}>Delete</button>
              <button onClick={() => { setDeleteId(null); setDeleteError('') }} className="btn-ghost rounded px-6">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
