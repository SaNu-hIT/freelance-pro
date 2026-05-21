'use client'

import { useEffect, useState, KeyboardEvent } from 'react'
import {
  Plus, Pencil, Trash2, X, Search, ChevronDown, Eye,
  CheckSquare, Square, Clock, User, DollarSign,
  Calendar, ListChecks, Globe, FileSpreadsheet,
  ExternalLink, Timer, Layers, ChevronRight, ChevronDown as ChevDown, Code2, Users,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { projectsApi, freelancersApi, tasksApi, sprintsApi } from '@/lib/api'
import { Project, ProjectStatus, ProjectPriority, FreelancerProfile, ProjectTask, ProjectSprint } from '@/lib/types'
import { useCurrencySymbol } from '@/lib/store'

const ALL_STATUSES: ProjectStatus[] = ['new', 'assigned', 'in_progress', 'blocked', 'pending_approval', 'completed', 'delayed']
const ALL_PRIORITIES: ProjectPriority[] = ['low', 'medium', 'high', 'critical']

const PRIORITY_COLORS: Record<ProjectPriority, string> = {
  low: '#4ade80', medium: '#fbbf24', high: '#fb923c', critical: '#f87171',
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
  const color = overdue ? '#f87171' : urgent ? '#fb923c' : warning ? '#fbbf24' : '#4ade80'
  const bg = overdue ? 'rgba(248,113,113,0.1)' : urgent ? 'rgba(251,146,60,0.1)' : warning ? 'rgba(251,191,36,0.1)' : 'rgba(74,222,128,0.1)'
  const border = overdue ? 'rgba(248,113,113,0.3)' : urgent ? 'rgba(251,146,60,0.3)' : warning ? 'rgba(251,191,36,0.3)' : 'rgba(74,222,128,0.3)'
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
  const colors = ['#DC143C', '#60a5fa', '#4ade80', '#fbbf24', '#a78bfa', '#fb923c']
  const colorIdx = name.charCodeAt(0) % colors.length
  return (
    <div className="rounded-full flex items-center justify-center font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38, background: `${colors[colorIdx]}22`, border: `1.5px solid ${colors[colorIdx]}55`, color: colors[colorIdx] }}
      title={name}>
      {initials}
    </div>
  )
}

const MOCK_PROJECTS: Project[] = [
  { id: '1', title: 'E-Commerce Platform Rebuild', description: 'Full rebuild of legacy e-commerce stack.', budget: 14500, deadline: new Date(Date.now() + 42 * 86400000).toISOString().slice(0, 10), status: 'in_progress', priority: 'high', clientId: 'c1', client: { id: 'c1', name: 'Acme Corp', email: 'acme@corp.com', role: 'client', createdAt: '' }, progress: 65, repoUrl: 'https://github.com/acme-corp/ecommerce-rebuild', liveUrl: 'https://staging.acme-store.com', correctionSheetUrl: 'https://docs.google.com/spreadsheets/d/ecommerce', createdAt: '', updatedAt: '' },
  { id: '2', title: 'Analytics Dashboard', description: 'Real-time analytics with D3 charts.', budget: 8500, deadline: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10), status: 'in_progress', priority: 'medium', clientId: 'c2', client: { id: 'c2', name: 'Nexus Labs', email: 'nexus@labs.io', role: 'client', createdAt: '' }, progress: 38, repoUrl: 'https://github.com/nexus/analytics', correctionSheetUrl: 'https://docs.google.com/spreadsheets/d/analytics', createdAt: '', updatedAt: '' },
]

const EMPTY_FORM = {
  title: '', description: '', budget: '', deadline: '',
  status: 'new' as ProjectStatus, priority: 'medium' as ProjectPriority,
  teamMemberIds: [] as string[],
  repoUrl: '', liveUrl: '', correctionSheetUrl: '',
}

type PanelMode = 'view' | 'edit' | 'create' | null

export default function AdminProjectsPage() {
  const curr = useCurrencySymbol()
  const [projects, setProjects] = useState<Project[]>([])
  const [freelancers, setFreelancers] = useState<FreelancerProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<ProjectPriority | 'all'>('all')
  const [panelMode, setPanelMode] = useState<PanelMode>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Sprints + Tasks state
  const [sprints, setSprints] = useState<ProjectSprint[]>([])
  const [tasks, setTasks] = useState<ProjectTask[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [collapsedSprints, setCollapsedSprints] = useState<Set<string>>(new Set())
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskSprint, setNewTaskSprint] = useState<string>('')
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>('')
  const [addingTask, setAddingTask] = useState(false)
  const [newSprintName, setNewSprintName] = useState('')
  const [addingSprint, setAddingSprint] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, fRes] = await Promise.allSettled([projectsApi.getAll(), freelancersApi.getAll()])
        setProjects(pRes.status === 'fulfilled' ? (pRes.value.data?.data ?? pRes.value.data) : MOCK_PROJECTS)
        setFreelancers(fRes.status === 'fulfilled' ? (fRes.value.data?.data ?? fRes.value.data) : [])
      } catch { setProjects(MOCK_PROJECTS) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const loadProjectData = async (projectId: string) => {
    setTasksLoading(true)
    setSprints([])
    setTasks([])
    try {
      const [sRes, tRes] = await Promise.allSettled([
        sprintsApi.getByProject(projectId),
        tasksApi.getByProject(projectId),
      ])
      setSprints(sRes.status === 'fulfilled' ? sRes.value.data : [])
      setTasks(tRes.status === 'fulfilled' ? tRes.value.data : [])
    } catch {}
    finally { setTasksLoading(false) }
  }

  const openView = (p: Project) => {
    setSelectedProject(p)
    setPanelMode('view')
    setNewTaskTitle('')
    setNewSprintName('')
    setNewTaskAssignee('')
    loadProjectData(p.id)
  }

  const openCreate = () => { setForm(EMPTY_FORM); setSelectedProject(null); setPanelMode('create') }

  const openEdit = (p: Project) => {
    setSelectedProject(p)
    setForm({
      title: p.title, description: p.description, budget: String(p.budget),
      deadline: p.deadline?.slice(0, 10) ?? '', status: p.status, priority: p.priority,
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
    setSaving(true)
    try {
      const payload = { ...form, budget: parseFloat(form.budget) || 0 }
      if (panelMode === 'create') {
        const res = await projectsApi.create(payload)
        setProjects(prev => [res.data, ...prev])
      } else if (selectedProject) {
        const res = await projectsApi.update(selectedProject.id, payload)
        setProjects(prev => prev.map(p => p.id === selectedProject.id ? res.data : p))
      }
    } catch {
      if (panelMode === 'create') {
        const newP: Project = { id: Date.now().toString(), ...form, budget: parseFloat(form.budget) || 0, progress: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        setProjects(prev => [newP, ...prev])
      } else if (selectedProject) {
        setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, ...form, budget: parseFloat(form.budget) || 0 } : p))
      }
    } finally { setSaving(false); setPanelMode(null) }
  }

  const handleDelete = async (id: string) => {
    try { await projectsApi.delete(id) } catch {}
    setProjects(prev => prev.filter(p => p.id !== id))
    setDeleteId(null)
  }

  // Task handlers
  const handleToggleTask = async (task: ProjectTask) => {
    const updated = { ...task, completed: !task.completed }
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
    try { await tasksApi.update(task.id, { completed: !task.completed }) }
    catch { setTasks(prev => prev.map(t => t.id === task.id ? task : t)) }
  }

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !selectedProject) return
    setAddingTask(true)
    const tempId = `tmp-${Date.now()}`
    const tempTask: ProjectTask = {
      id: tempId, projectId: selectedProject.id, sprintId: newTaskSprint || null,
      assignedFreelancerId: newTaskAssignee || null,
      title: newTaskTitle.trim(), completed: false, order: tasks.length,
      completedAt: null, createdAt: new Date().toISOString(),
    }
    setTasks(prev => [...prev, tempTask])
    setNewTaskTitle('')
    try {
      const res = await tasksApi.create({
        projectId: selectedProject.id, title: tempTask.title, order: tempTask.order,
        sprintId: newTaskSprint || undefined,
        assignedFreelancerId: newTaskAssignee || undefined,
      })
      setTasks(prev => prev.map(t => t.id === tempId ? res.data : t))
    } catch {}
    setAddingTask(false)
  }

  const handleDeleteTask = async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    try { await tasksApi.delete(taskId) } catch {}
  }

  const handleAddSprint = async () => {
    if (!newSprintName.trim() || !selectedProject) return
    setAddingSprint(true)
    try {
      const res = await sprintsApi.create({ projectId: selectedProject.id, name: newSprintName.trim(), order: sprints.length })
      setSprints(prev => [...prev, res.data])
    } catch {
      const fake: ProjectSprint = { id: `tmp-${Date.now()}`, projectId: selectedProject.id, name: newSprintName.trim(), order: sprints.length, startDate: null, endDate: null, createdAt: new Date().toISOString() }
      setSprints(prev => [...prev, fake])
    }
    setNewSprintName('')
    setAddingSprint(false)
  }

  const handleDeleteSprint = async (sprintId: string) => {
    setSprints(prev => prev.filter(s => s.id !== sprintId))
    setTasks(prev => prev.filter(t => t.sprintId !== sprintId))
    try { await sprintsApi.delete(sprintId) } catch {}
  }

  const toggleSprintCollapse = (sprintId: string) => {
    setCollapsedSprints(prev => {
      const next = new Set(prev)
      if (next.has(sprintId)) next.delete(sprintId); else next.add(sprintId)
      return next
    })
  }

  const filtered = projects.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.client?.name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    const matchPriority = priorityFilter === 'all' || p.priority === priorityFilter
    return matchSearch && matchStatus && matchPriority
  })

  // Group tasks by sprint for the view drawer
  const tasksBySprint = (sprintId: string | null) => tasks.filter(t => t.sprintId === sprintId)
  const unassignedTasks = tasks.filter(t => !t.sprintId)
  const completedCount = tasks.filter(t => t.completed).length

  // Team members for current view project
  const viewTeam = selectedProject?.teamMembers ?? []

  return (
    <DashboardLayout allowedRoles={['admin']}>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-mono-label mb-1">MANAGEMENT</p>
          <h1 className="text-display text-4xl text-white">PROJECTS</h1>
          <p className="text-mono-label mt-1" style={{ color: 'rgba(240,240,242,0.35)' }}>{projects.length} total projects</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 rounded text-sm"><Plus size={16} /> New Project</button>
      </div>

      {/* Filters */}
      <div className="glass-card-dark rounded-xl p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(240,240,242,0.35)' }} />
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
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(240,240,242,0.35)' }} />
        </div>
      </div>

      {/* Projects Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="animate-pulse flex gap-4"><div className="h-4 rounded flex-1" style={{ background: 'rgba(220,20,60,0.1)' }} /></div>)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16"><p className="text-mono-label text-lg" style={{ color: 'rgba(240,240,242,0.35)' }}>NO PROJECTS FOUND</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Title</th><th>Client</th><th>Budget</th><th>Deadline</th><th>Progress</th><th>Priority</th><th>Status</th><th>Team</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td><p className="font-semibold text-white text-sm max-w-[200px] truncate">{p.title}</p></td>
                    <td><span style={{ color: '#d1d5db', fontSize: '13px' }}>{p.client?.name ?? '—'}</span></td>
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
                      <span className="text-mono-label px-2 py-1 rounded" style={{ fontSize: '10px', color: PRIORITY_COLORS[p.priority], background: `${PRIORITY_COLORS[p.priority]}18`, border: `1px solid ${PRIORITY_COLORS[p.priority]}40` }}>
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
                            <div className="rounded-full flex items-center justify-center text-xs font-bold" style={{ width: 22, height: 22, background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)', color: 'rgba(240,240,242,0.5)' }}>
                              +{p.teamMembers.length - 4}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '13px' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openView(p)} className="p-1.5 rounded glass-card-dark hover:border-[#60a5fa] transition-colors" title="View details"><Eye size={13} style={{ color: '#60a5fa' }} /></button>
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded glass-card-dark hover:border-[#DC143C] transition-colors" title="Edit"><Pencil size={13} style={{ color: '#DC143C' }} /></button>
                        <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded glass-card-dark hover:border-[#f87171] transition-colors" title="Delete"><Trash2 size={13} style={{ color: '#f87171' }} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Side Panel ── */}
      {panelMode && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setPanelMode(null)} />
          <div className="glass-card h-full overflow-y-auto flex flex-col" style={{ width: panelMode === 'view' ? 620 : 520, borderLeft: '1px solid rgba(220,20,60,0.3)' }}>

            {/* Panel Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[rgba(255,255,255,0.08)] shrink-0">
              <div className="flex-1 min-w-0 mr-4">
                <p className="text-mono-label mb-0.5 text-xs" style={{ color: 'rgba(240,240,242,0.4)' }}>
                  {panelMode === 'create' ? 'NEW PROJECT' : panelMode === 'edit' ? 'EDIT PROJECT' : 'PROJECT DETAIL'}
                </p>
                <h2 className="text-white font-bold text-lg leading-tight truncate">{panelMode === 'create' ? 'Create Project' : selectedProject?.title}</h2>
              </div>
              <button onClick={() => setPanelMode(null)} className="p-2 rounded glass-card-dark hover:border-[#DC143C] transition-colors shrink-0"><X size={16} style={{ color: 'rgba(240,240,242,0.35)' }} /></button>
            </div>

            {/* ── VIEW ── */}
            {panelMode === 'view' && selectedProject && (
              <div className="flex-1 overflow-y-auto">

                {/* Days remaining + priority banner */}
                <div className="px-6 pt-5 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DaysChip deadline={selectedProject.deadline} />
                    <span className="text-mono-label px-2.5 py-1 rounded-lg text-xs" style={{ color: PRIORITY_COLORS[selectedProject.priority], background: `${PRIORITY_COLORS[selectedProject.priority]}15`, border: `1px solid ${PRIORITY_COLORS[selectedProject.priority]}35` }}>
                      {selectedProject.priority.toUpperCase()} PRIORITY
                    </span>
                  </div>
                  <StatusBadge status={selectedProject.status} />
                </div>

                {/* Team members */}
                {viewTeam.length > 0 && (
                  <div className="px-6 mb-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Users size={11} style={{ color: 'rgba(240,240,242,0.4)' }} />
                      <p className="text-mono-label" style={{ fontSize: '10px', color: 'rgba(240,240,242,0.4)' }}>TEAM</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {viewTeam.map(m => (
                        <div key={m.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
                          <MemberAvatar name={m.user?.name ?? '?'} size={20} />
                          <div>
                            <p className="text-xs font-medium" style={{ color: 'rgba(240,240,242,0.85)' }}>{m.user?.name}</p>
                            {m.skills?.length > 0 && (
                              <p className="text-mono-label" style={{ fontSize: '10px', color: 'rgba(240,240,242,0.4)' }}>{m.skills.slice(0, 2).join(', ')}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meta grid */}
                <div className="grid grid-cols-2 gap-px mx-6 mb-4 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  {[
                    { icon: <DollarSign size={12} />, label: 'BUDGET', value: `${curr}${Number(selectedProject.budget).toLocaleString()}`, color: '#DC143C' },
                    { icon: <Calendar size={12} />, label: 'END DATE', value: new Date(selectedProject.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), color: '#fbbf24' },
                    { icon: <User size={12} />, label: 'MEMBERS', value: viewTeam.length > 0 ? `${viewTeam.length} person${viewTeam.length > 1 ? 's' : ''}` : 'Unassigned', color: '#60a5fa' },
                    { icon: <Clock size={12} />, label: 'PROGRESS', value: `${selectedProject.progress ?? 0}%`, color: '#4ade80' },
                  ].map(({ icon, label, value, color }) => (
                    <div key={label} className="px-4 py-3" style={{ background: '#0d0d0f' }}>
                      <div className="flex items-center gap-1.5 mb-1" style={{ color: 'rgba(240,240,242,0.4)' }}>{icon}<span className="text-mono-label" style={{ fontSize: '10px' }}>{label}</span></div>
                      <p className="font-bold text-sm" style={{ color }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="px-6 mb-4">
                  <div className="progress-bar" style={{ height: 5 }}>
                    <div className="progress-fill" style={{ width: `${selectedProject.progress ?? 0}%` }} />
                  </div>
                </div>

                {/* Links */}
                {(selectedProject.repoUrl || selectedProject.liveUrl || selectedProject.correctionSheetUrl) && (
                  <div className="px-6 mb-4">
                    <p className="text-mono-label mb-2" style={{ fontSize: '10px', color: 'rgba(240,240,242,0.4)' }}>LINKS</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedProject.repoUrl && (
                        <a href={selectedProject.repoUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all hover:border-[rgba(220,20,60,0.5)]"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(240,240,242,0.7)' }}>
                          <Code2 size={12} style={{ color: '#DC143C' }} /> Repository <ExternalLink size={10} style={{ color: 'rgba(240,240,242,0.3)' }} />
                        </a>
                      )}
                      {selectedProject.liveUrl && (
                        <a href={selectedProject.liveUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all hover:border-[rgba(74,222,128,0.4)]"
                          style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }}>
                          <Globe size={12} /> Live / Staging <ExternalLink size={10} style={{ color: 'rgba(74,222,128,0.5)' }} />
                        </a>
                      )}
                      {selectedProject.correctionSheetUrl && (
                        <a href={selectedProject.correctionSheetUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all hover:border-[rgba(251,191,36,0.4)]"
                          style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}>
                          <FileSpreadsheet size={12} /> Correction Sheet <ExternalLink size={10} style={{ color: 'rgba(251,191,36,0.5)' }} />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Description */}
                {selectedProject.description && (
                  <div className="px-6 mb-4 pb-4 border-b border-[rgba(255,255,255,0.06)]">
                    <p className="text-mono-label mb-1.5" style={{ fontSize: '10px', color: 'rgba(240,240,242,0.4)' }}>DESCRIPTION</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(240,240,242,0.7)' }}>{selectedProject.description}</p>
                  </div>
                )}

                {/* Sprint Checklist */}
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <ListChecks size={14} style={{ color: '#DC143C' }} />
                      <span className="text-mono-label font-bold" style={{ fontSize: '11px', color: 'rgba(240,240,242,0.6)' }}>SPRINTS & TASKS</span>
                    </div>
                    {tasks.length > 0 && (
                      <span className="text-mono-label px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(220,20,60,0.1)', border: '1px solid rgba(220,20,60,0.25)', color: '#f87171' }}>
                        {completedCount}/{tasks.length} done
                      </span>
                    )}
                  </div>

                  {tasksLoading ? (
                    <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="animate-pulse h-10 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />)}</div>
                  ) : (
                    <div className="space-y-3">
                      {/* Sprint groups */}
                      {sprints.map(sprint => {
                        const sprintTasks = tasksBySprint(sprint.id)
                        const sprintDone = sprintTasks.filter(t => t.completed).length
                        const isCollapsed = collapsedSprints.has(sprint.id)
                        return (
                          <div key={sprint.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                            {/* Sprint header */}
                            <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none" style={{ background: 'rgba(255,255,255,0.04)' }}
                              onClick={() => toggleSprintCollapse(sprint.id)}>
                              <button className="shrink-0 transition-transform" style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                                <ChevDown size={13} style={{ color: 'rgba(240,240,242,0.4)' }} />
                              </button>
                              <Layers size={12} style={{ color: '#DC143C' }} />
                              <span className="flex-1 text-xs font-semibold" style={{ color: 'rgba(240,240,242,0.85)' }}>{sprint.name}</span>
                              <span className="text-mono-label text-xs" style={{ color: 'rgba(240,240,242,0.35)' }}>{sprintDone}/{sprintTasks.length}</span>
                              {sprint.endDate && (
                                <span className="text-mono-label text-xs ml-2" style={{ color: 'rgba(240,240,242,0.3)', fontSize: '10px' }}>
                                  ends {new Date(sprint.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteSprint(sprint.id) }}
                                className="ml-2 p-0.5 rounded hover:text-[#f87171] transition-colors"
                                style={{ color: 'rgba(240,240,242,0.2)' }}>
                                <X size={11} />
                              </button>
                            </div>
                            {/* Sprint tasks */}
                            {!isCollapsed && (
                              <div className="px-2 pb-2 pt-1 space-y-1">
                                {sprintTasks.map(task => (
                                  <TaskRow key={task.id} task={task} teamMembers={viewTeam} onToggle={handleToggleTask} onDelete={handleDeleteTask} />
                                ))}
                                {sprintTasks.length === 0 && (
                                  <p className="text-center py-2 text-mono-label" style={{ fontSize: '10px', color: 'rgba(240,240,242,0.25)' }}>No tasks — add one below</p>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {/* Unassigned tasks */}
                      {unassignedTasks.length > 0 && (
                        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                          <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <ChevronRight size={13} style={{ color: 'rgba(240,240,242,0.3)' }} />
                            <span className="text-xs font-medium" style={{ color: 'rgba(240,240,242,0.5)' }}>Backlog / Unassigned</span>
                            <span className="text-mono-label text-xs ml-auto" style={{ color: 'rgba(240,240,242,0.3)' }}>{unassignedTasks.filter(t => t.completed).length}/{unassignedTasks.length}</span>
                          </div>
                          <div className="px-2 pb-2 pt-1 space-y-1">
                            {unassignedTasks.map(task => <TaskRow key={task.id} task={task} teamMembers={viewTeam} onToggle={handleToggleTask} onDelete={handleDeleteTask} />)}
                          </div>
                        </div>
                      )}

                      {tasks.length === 0 && sprints.length === 0 && (
                        <p className="text-center py-6 text-mono-label" style={{ fontSize: '11px', color: 'rgba(240,240,242,0.3)' }}>No sprints yet — create one below</p>
                      )}
                    </div>
                  )}

                  {/* Add task */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <select value={newTaskSprint} onChange={e => setNewTaskSprint(e.target.value)}
                        className="input-field py-2 text-xs appearance-none" style={{ width: 140, flexShrink: 0 }}>
                        <option value="">Backlog</option>
                        {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <select value={newTaskAssignee} onChange={e => setNewTaskAssignee(e.target.value)}
                        className="input-field py-2 text-xs appearance-none" style={{ width: 130, flexShrink: 0 }}>
                        <option value="">No assignee</option>
                        {viewTeam.map(m => <option key={m.id} value={m.id}>{m.user?.name?.split(' ')[0]}</option>)}
                      </select>
                      <input
                        className="input-field flex-1 py-2 text-sm"
                        placeholder="Add a task… (Enter)"
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleAddTask() }}
                        disabled={addingTask}
                      />
                      <button onClick={handleAddTask} disabled={!newTaskTitle.trim() || addingTask}
                        className="p-2 rounded transition-colors disabled:opacity-40 shrink-0"
                        style={{ background: 'rgba(220,20,60,0.15)', border: '1px solid rgba(220,20,60,0.3)', color: '#DC143C' }}>
                        <Plus size={15} />
                      </button>
                    </div>

                    {/* Add sprint */}
                    <div className="flex items-center gap-2">
                      <input
                        className="input-field flex-1 py-2 text-sm"
                        placeholder="New sprint name… (e.g. Sprint 4 — Payments)"
                        value={newSprintName}
                        onChange={e => setNewSprintName(e.target.value)}
                        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleAddSprint() }}
                        disabled={addingSprint}
                        style={{ borderColor: 'rgba(220,20,60,0.2)' }}
                      />
                      <button onClick={handleAddSprint} disabled={!newSprintName.trim() || addingSprint}
                        className="flex items-center gap-1.5 px-3 py-2 rounded text-xs transition-colors disabled:opacity-40 shrink-0"
                        style={{ background: 'rgba(220,20,60,0.1)', border: '1px solid rgba(220,20,60,0.25)', color: '#DC143C' }}>
                        <Layers size={12} /> Sprint
                      </button>
                    </div>
                  </div>
                </div>

                {/* Edit button */}
                <div className="px-6 pb-6 pt-2">
                  <button onClick={() => openEdit(selectedProject)} className="w-full btn-ghost rounded text-sm py-2.5 flex items-center justify-center gap-2">
                    <Pencil size={13} /> Edit Project Details
                  </button>
                </div>
              </div>
            )}

            {/* ── CREATE / EDIT ── */}
            {(panelMode === 'create' || panelMode === 'edit') && (
              <>
                <div className="flex-1 px-6 py-5 space-y-5 overflow-y-auto">
                  <div><label className="label-field">Project Title</label><input className="input-field" placeholder="Enter project title..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
                  <div><label className="label-field">Description</label><textarea className="input-field resize-none" rows={3} placeholder="Project description..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="label-field">Budget ({curr})</label><input type="number" className="input-field" placeholder="0" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} /></div>
                    <div><label className="label-field">End Date</label><input type="date" className="input-field" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label-field">Status</label>
                      <div className="relative">
                        <select className="input-field appearance-none pr-8" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ProjectStatus }))}>
                          {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                        </select>
                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(240,240,242,0.35)' }} />
                      </div>
                    </div>
                    <div>
                      <label className="label-field">Priority</label>
                      <div className="relative">
                        <select className="input-field appearance-none pr-8" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as ProjectPriority }))}>
                          {ALL_PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                        </select>
                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(240,240,242,0.35)' }} />
                      </div>
                    </div>
                  </div>

                  {/* Team member multi-select */}
                  <div>
                    <label className="label-field flex items-center gap-1.5"><Users size={11} style={{ color: '#60a5fa' }} /> Team Members</label>
                    {freelancers.length === 0 ? (
                      <p className="text-mono-label text-xs mt-1.5" style={{ color: 'rgba(240,240,242,0.35)' }}>No freelancers available</p>
                    ) : (
                      <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {freelancers.map(fl => {
                          const selected = form.teamMemberIds.includes(fl.id)
                          return (
                            <label key={fl.id} className="flex items-center gap-2.5 px-2 py-2 rounded-lg cursor-pointer transition-all select-none"
                              style={{ background: selected ? 'rgba(96,165,250,0.08)' : 'transparent', border: `1px solid ${selected ? 'rgba(96,165,250,0.25)' : 'transparent'}` }}>
                              <input type="checkbox" checked={selected} onChange={() => toggleTeamMember(fl.id)} className="hidden" />
                              <div className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all"
                                style={{ background: selected ? '#60a5fa' : 'rgba(255,255,255,0.08)', border: `1.5px solid ${selected ? '#60a5fa' : 'rgba(255,255,255,0.2)'}` }}>
                                {selected && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="#0a0a0c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                              </div>
                              <MemberAvatar name={fl.user?.name ?? '?'} size={22} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium leading-tight" style={{ color: selected ? '#e2e8f0' : 'rgba(240,240,242,0.7)' }}>{fl.user?.name}</p>
                                {fl.skills?.length > 0 && <p className="text-mono-label truncate" style={{ fontSize: '10px', color: 'rgba(240,240,242,0.35)' }}>{fl.skills.slice(0, 3).join(' · ')}</p>}
                              </div>
                              <span className="text-mono-label shrink-0" style={{ fontSize: '10px', color: 'rgba(240,240,242,0.3)' }}>{curr}{fl.hourlyRate}/hr</span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                    {form.teamMemberIds.length > 0 && (
                      <p className="text-mono-label mt-1.5 text-xs" style={{ color: '#60a5fa' }}>{form.teamMemberIds.length} member{form.teamMemberIds.length > 1 ? 's' : ''} selected</p>
                    )}
                  </div>

                  {/* Links */}
                  <div className="pt-2 border-t border-[rgba(255,255,255,0.07)]">
                    <p className="text-mono-label mb-3" style={{ fontSize: '11px', color: 'rgba(240,240,242,0.5)' }}>PROJECT LINKS</p>
                    <div className="space-y-3">
                      <div>
                        <label className="label-field flex items-center gap-1.5"><Code2 size={11} style={{ color: '#DC143C' }} /> Repository URL</label>
                        <input className="input-field" placeholder="https://github.com/org/repo" value={form.repoUrl} onChange={e => setForm(f => ({ ...f, repoUrl: e.target.value }))} />
                      </div>
                      <div>
                        <label className="label-field flex items-center gap-1.5"><Globe size={11} style={{ color: '#4ade80' }} /> Live / Staging URL</label>
                        <input className="input-field" placeholder="https://staging.yoursite.com" value={form.liveUrl} onChange={e => setForm(f => ({ ...f, liveUrl: e.target.value }))} />
                      </div>
                      <div>
                        <label className="label-field flex items-center gap-1.5"><FileSpreadsheet size={11} style={{ color: '#fbbf24' }} /> Correction Sheet URL</label>
                        <input className="input-field" placeholder="https://docs.google.com/spreadsheets/..." value={form.correctionSheetUrl} onChange={e => setForm(f => ({ ...f, correctionSheetUrl: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-5 border-t border-[rgba(255,255,255,0.08)] flex gap-3 shrink-0">
                  <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 rounded text-sm py-3">{saving ? 'Saving...' : panelMode === 'create' ? 'Create Project' : 'Save Changes'}</button>
                  <button onClick={() => setPanelMode(null)} className="btn-ghost rounded text-sm py-3 px-6">Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="glass-card rounded-xl p-8 relative z-10 w-full max-w-md text-center" style={{ borderColor: 'rgba(220,20,60,0.5)' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(220,20,60,0.1)' }}><Trash2 size={20} style={{ color: '#f87171' }} /></div>
            <h3 className="text-white font-bold text-lg mb-2">Delete Project</h3>
            <p className="text-mono-label mb-6" style={{ color: '#9ca3af' }}>This action cannot be undone. The project and all associated data will be permanently removed.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => handleDelete(deleteId)} className="btn-primary rounded px-6" style={{ background: '#f87171' }}>Delete</button>
              <button onClick={() => setDeleteId(null)} className="btn-ghost rounded px-6">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

function TaskRow({ task, teamMembers, onToggle, onDelete }: {
  task: ProjectTask
  teamMembers: FreelancerProfile[]
  onToggle: (t: ProjectTask) => void
  onDelete: (id: string) => void
}) {
  const assignee = task.assignedFreelancerId
    ? (task.assignedFreelancer ?? teamMembers.find(m => m.id === task.assignedFreelancerId))
    : null

  return (
    <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg group transition-all"
      style={{ background: task.completed ? 'rgba(74,222,128,0.03)' : 'transparent', border: `1px solid ${task.completed ? 'rgba(74,222,128,0.12)' : 'transparent'}` }}>
      <button onClick={() => onToggle(task)} className="shrink-0">
        {task.completed ? <CheckSquare size={15} style={{ color: '#4ade80' }} /> : <Square size={15} style={{ color: 'rgba(240,240,242,0.25)' }} />}
      </button>
      <span className="flex-1 text-sm" style={{ color: task.completed ? 'rgba(240,240,242,0.35)' : 'rgba(240,240,242,0.8)', textDecoration: task.completed ? 'line-through' : 'none' }}>
        {task.title}
      </span>
      {task.completed && task.completedAt && (
        <span style={{ fontSize: 10, color: 'rgba(74,222,128,0.4)', fontFamily: 'JetBrains Mono, monospace' }}>
          {new Date(task.completedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
          {' '}
          {new Date(task.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      )}
      {assignee && (
        <MemberAvatar name={assignee.user?.name ?? '?'} size={18} />
      )}
      <button onClick={() => onDelete(task.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded" style={{ color: 'rgba(240,240,242,0.3)' }}>
        <X size={11} />
      </button>
    </div>
  )
}
