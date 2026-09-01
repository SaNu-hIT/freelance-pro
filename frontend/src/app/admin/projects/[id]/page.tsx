'use client'

import { useEffect, useState, KeyboardEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, DollarSign, Calendar, AlertTriangle, CheckCircle2,
  Circle, ChevronRight, Activity, Clock, Users, ExternalLink,
  Globe, Code2, FileSpreadsheet, Pencil, Plus, Layers, X,
  ChevronDown,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { projectsApi, tasksApi, sprintsApi, worklogsApi } from '@/lib/api'
import { Project, ProjectTask, ProjectSprint, Worklog, ProjectStatus, ProjectPriority } from '@/lib/types'
import { useCurrencySymbol } from '@/lib/store'

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtShort(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function daysAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d === 0) return 'today'
  if (d === 1) return '1 day ago'
  return `${d} days ago`
}

function daysLeft(iso: string) {
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
  if (d < 0) return `${Math.abs(d)}d overdue`
  if (d === 0) return 'due today'
  return `${d}d left`
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const STATUS_META: Record<ProjectStatus, { label: string; color: string; bg: string; border: string }> = {
  new:              { label: 'New',            color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.25)'  },
  assigned:         { label: 'Assigned',       color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',  border: 'rgba(167,139,250,0.25)' },
  in_progress:      { label: 'In Progress',    color: '#4ade80', bg: 'rgba(74,222,128,0.1)',   border: 'rgba(74,222,128,0.25)'  },
  blocked:          { label: 'Blocked',        color: '#f87171', bg: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.25)' },
  pending_approval: { label: 'Pending Review', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.25)'  },
  completed:        { label: 'Completed',      color: '#4ade80', bg: 'rgba(74,222,128,0.1)',   border: 'rgba(74,222,128,0.25)'  },
  delayed:          { label: 'Delayed',        color: '#f87171', bg: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.25)' },
}

const PRIORITY_COLOR: Record<ProjectPriority, string> = {
  low: '#4ade80', medium: '#fbbf24', high: '#fb923c', critical: '#f87171',
}

function StatusPill({ status }: { status: ProjectStatus }) {
  const m = STATUS_META[status] ?? STATUS_META.new
  return (
    <span style={{ background: m.bg, color: m.color, border: `1px solid ${m.border}`, fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, padding: '3px 10px', borderRadius: 6, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      {m.label}
    </span>
  )
}

const card: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  padding: 20,
}

// ── TaskRow sub-component ──────────────────────────────────────────────────────

function TaskRow({ task, onToggle, onDelete }: {
  task: ProjectTask
  onToggle: (task: ProjectTask) => void
  onDelete: (id: string) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, background: task.completed ? 'var(--bg-elevated)' : 'transparent', transition: 'background 0.15s' }}
      onMouseEnter={e => { if (!task.completed) e.currentTarget.style.background = 'var(--bg-elevated)' }}
      onMouseLeave={e => { if (!task.completed) e.currentTarget.style.background = 'transparent' }}>
      <button onClick={() => onToggle(task)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0, color: task.completed ? '#4ade80' : 'var(--text-muted)' }}>
        {task.completed
          ? <CheckCircle2 size={15} style={{ color: '#4ade80' }} />
          : <Circle size={15} style={{ color: 'var(--text-muted)' }} />}
      </button>
      <span style={{ flex: 1, fontSize: 13, color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.completed ? 'line-through' : 'none', lineHeight: 1.4 }}>
        {task.title}
      </span>
      {task.completedAt && (
        <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {new Date(task.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      )}
      <button onClick={() => onDelete(task.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', color: 'var(--text-muted)', borderRadius: 4, flexShrink: 0 }}
        onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
        <X size={11} />
      </button>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const curr = useCurrencySymbol()

  const [project, setProject]   = useState<Project | null>(null)
  const [tasks, setTasks]       = useState<ProjectTask[]>([])
  const [sprints, setSprints]   = useState<ProjectSprint[]>([])
  const [worklogs, setWorklogs] = useState<Worklog[]>([])
  const [loading, setLoading]   = useState(true)

  // Sprint add state
  const [newSprintName, setNewSprintName]   = useState('')
  const [newSprintStart, setNewSprintStart] = useState('')
  const [newSprintEnd, setNewSprintEnd]     = useState('')
  const [addingSprint, setAddingSprint]     = useState(false)
  const [collapsedSprints, setCollapsedSprints] = useState<Set<string>>(new Set())

  // Task add state
  const [newTaskTitle, setNewTaskTitle]       = useState('')
  const [newTaskSprint, setNewTaskSprint]     = useState<string>('')
  const [addingTask, setAddingTask]           = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      projectsApi.getOne(id),
      tasksApi.getByProject(id),
      sprintsApi.getByProject(id),
      worklogsApi.getAll({ projectId: id, limit: 50 }),
    ]).then(([pRes, tRes, sRes, wRes]) => {
      setProject(pRes.data)
      const tData = tRes.data
      setTasks(Array.isArray(tData) ? tData : tData?.data ?? [])
      setSprints(Array.isArray(sRes.data) ? sRes.data : [])
      const wData = wRes.data?.data ?? wRes.data ?? []
      setWorklogs(Array.isArray(wData) ? wData : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  const handleAddSprint = async () => {
    if (!newSprintName.trim() || !id) return
    setAddingSprint(true)
    const payload = {
      projectId: id,
      name: newSprintName.trim(),
      order: sprints.length,
      ...(newSprintStart && { startDate: newSprintStart }),
      ...(newSprintEnd   && { endDate:   newSprintEnd }),
    }
    try {
      const res = await sprintsApi.create(payload)
      setSprints(prev => [...prev, res.data])
    } catch {
      const fake: ProjectSprint = {
        id: `tmp-${Date.now()}`, projectId: id, name: payload.name,
        order: payload.order, startDate: newSprintStart || null, endDate: newSprintEnd || null,
        createdAt: new Date().toISOString(),
      }
      setSprints(prev => [...prev, fake])
    }
    setNewSprintName(''); setNewSprintStart(''); setNewSprintEnd('')
    setAddingSprint(false)
  }

  const handleDeleteSprint = async (sprintId: string) => {
    setSprints(prev => prev.filter(s => s.id !== sprintId))
    setTasks(prev => prev.filter(t => t.sprintId !== sprintId))
    try { await sprintsApi.delete(sprintId) } catch {}
  }

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !id) return
    setAddingTask(true)
    const tempId = `tmp-${Date.now()}`
    const tempTask: ProjectTask = {
      id: tempId, projectId: id, sprintId: newTaskSprint || null,
      assignedFreelancerId: null,
      title: newTaskTitle.trim(), completed: false, order: tasks.length,
      completedAt: null, createdAt: new Date().toISOString(),
    }
    setTasks(prev => [...prev, tempTask])
    setNewTaskTitle('')
    try {
      const res = await tasksApi.create({
        projectId: id, title: tempTask.title, order: tempTask.order,
        sprintId: newTaskSprint || undefined,
      })
      setTasks(prev => prev.map(t => t.id === tempId ? res.data : t))
    } catch {}
    setAddingTask(false)
  }

  const handleToggleTask = async (task: ProjectTask) => {
    const updated = { ...task, completed: !task.completed }
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
    try { await tasksApi.update(task.id, { completed: !task.completed }) }
    catch { setTasks(prev => prev.map(t => t.id === task.id ? task : t)) }
  }

  const handleDeleteTask = async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    try { await tasksApi.delete(taskId) } catch {}
  }

  const toggleSprintCollapse = (sprintId: string) => {
    setCollapsedSprints(prev => {
      const next = new Set(prev)
      if (next.has(sprintId)) next.delete(sprintId); else next.add(sprintId)
      return next
    })
  }

  if (loading) return (
    <DashboardLayout allowedRoles={['admin']}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
        <div style={{ width: 28, height: 28, border: '3px solid rgba(220,20,60,0.2)', borderTopColor: '#DC143C', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-muted)' }}>LOADING PROJECT...</span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </DashboardLayout>
  )

  if (!project) return (
    <DashboardLayout allowedRoles={['admin']}>
      <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>Project not found.</div>
    </DashboardLayout>
  )

  // ── Derived ──────────────────────────────────────────────────────────────────

  const sm          = STATUS_META[project.status] ?? STATUS_META.new
  const overdue     = new Date(project.deadline) < new Date() && project.status !== 'completed'
  const totalHours  = worklogs.reduce((s, w) => s + Number(w.hoursWorked), 0)
  const blockerLogs = worklogs.filter(w => w.blockers?.trim())
  const openTasks   = tasks.filter(t => !t.completed)
  const doneTasks   = tasks.filter(t => t.completed)

  // Group tasks by sprint
  const sprintMap: Record<string, { name: string; startDate?: string | null; endDate?: string | null; tasks: ProjectTask[] }> = {}
  tasks.forEach(t => {
    const key = t.sprintId ?? '__backlog'
    if (!sprintMap[key]) sprintMap[key] = {
      name: t.sprint?.name ?? 'Backlog',
      startDate: t.sprint?.startDate,
      endDate: t.sprint?.endDate,
      tasks: [],
    }
    sprintMap[key].tasks.push(t)
  })

  // Team members (deduplicated)
  const teamMap: Record<string, { id: string; name: string; email: string; role?: string }> = {}
  if (project.assignedFreelancer?.user) {
    const u = project.assignedFreelancer.user
    teamMap[u.id] = { id: project.assignedFreelancer.id, name: u.name, email: u.email, role: 'Lead' }
  }
  project.teamMembers?.forEach(m => {
    if (m.user && !teamMap[m.user.id]) {
      teamMap[m.user.id] = { id: m.id, name: m.user.name, email: m.user.email }
    }
  })
  const team = Object.values(teamMap)

  const sortedLogs = [...worklogs].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <DashboardLayout allowedRoles={['admin']}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Back */}
      <button onClick={() => router.back()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', marginBottom: 20, padding: 0 }}>
        <ArrowLeft size={13} /> BACK
      </button>

      {/* ── TWO-COLUMN LAYOUT ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>

        {/* ═══════════════════════════════════════════
            LEFT — Project info + team + links
        ═══════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 24 }}>

          {/* Project identity card */}
          <div style={{ ...card, borderLeft: `4px solid ${sm.color}` }}>
            <div style={{ marginBottom: 14 }}>
              <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 10px' }}>{project.title}</h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                <StatusPill status={project.status} />
                {project.priority && (
                  <span style={{ background: `${PRIORITY_COLOR[project.priority]}15`, color: PRIORITY_COLOR[project.priority], border: `1px solid ${PRIORITY_COLOR[project.priority]}35`, fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, padding: '3px 10px', borderRadius: 6, letterSpacing: '0.08em' }}>
                    {project.priority.toUpperCase()}
                  </span>
                )}
              </div>
              {project.description && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>{project.description}</p>
              )}
            </div>

            {/* Progress */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Progress</span>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: '#DC143C' }}>{project.progress ?? 0}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 99, background: project.status === 'blocked' ? '#f87171' : project.status === 'completed' ? '#4ade80' : 'linear-gradient(to right,#8B0000,#DC143C)', width: `${project.progress ?? 0}%`, transition: 'width 0.4s' }} />
              </div>
            </div>

            {/* Key stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { icon: <DollarSign size={13} />, label: 'Budget',   value: `${curr}${Number(project.budget).toLocaleString()}`, color: '#DC143C' },
                { icon: <Calendar size={13} />,   label: 'Deadline', value: fmtDate(project.deadline), color: overdue ? '#f87171' : 'var(--text-primary)', extra: overdue ? ' ⚠' : '' },
                { icon: <Activity size={13} />,   label: 'Timeline', value: daysLeft(project.deadline), color: overdue ? '#f87171' : '#fbbf24' },
                { icon: <Clock size={13} />,       label: 'Hours Logged', value: `${totalHours}h`, color: '#60a5fa' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                  <span style={{ color: '#DC143C', flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', flex: 1, textTransform: 'uppercase' }}>{item.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: item.color, fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>{item.value}{item.extra}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Client card */}
          {project.client && (
            <div style={card}>
              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Client</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                  {getInitials(project.client.name)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{project.client.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{project.client.email}</div>
                </div>
              </div>
            </div>
          )}

          {/* Team card */}
          {team.length > 0 && (
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Users size={13} style={{ color: '#DC143C' }} />
                <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Team ({team.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {team.map(m => (
                  <Link key={m.id} href={`/admin/freelancers/${m.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 8, textDecoration: 'none', border: '1px solid transparent', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#DC143C')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#8B0000,#DC143C)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                      {getInitials(m.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {m.name}
                        {m.role && <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: '#DC143C', background: 'rgba(220,20,60,0.1)', padding: '1px 6px', borderRadius: 4 }}>{m.role.toUpperCase()}</span>}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
                    </div>
                    <ChevronRight size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Links card */}
          {(project.repoUrl || project.liveUrl || project.correctionSheetUrl) && (
            <div style={card}>
              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Links</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {project.repoUrl && (
                  <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 8, textDecoration: 'none', color: '#60a5fa', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>
                    <Code2 size={13} /> Repository <ExternalLink size={11} style={{ marginLeft: 'auto' }} />
                  </a>
                )}
                {project.liveUrl && (
                  <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 8, textDecoration: 'none', color: '#4ade80', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>
                    <Globe size={13} /> Live URL <ExternalLink size={11} style={{ marginLeft: 'auto' }} />
                  </a>
                )}
                {project.correctionSheetUrl && (
                  <a href={project.correctionSheetUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 8, textDecoration: 'none', color: '#fbbf24', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>
                    <FileSpreadsheet size={13} /> Correction Sheet <ExternalLink size={11} style={{ marginLeft: 'auto' }} />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Edit button */}
          <Link href={`/admin/projects?edit=${project.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 10, border: '1px solid rgba(220,20,60,0.3)', background: 'rgba(220,20,60,0.06)', color: '#DC143C', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', textDecoration: 'none', letterSpacing: '0.08em' }}>
            <Pencil size={13} /> EDIT IN PROJECT MANAGER
          </Link>
        </div>

        {/* ═══════════════════════════════════════════
            RIGHT — Stats + Tasks + Worklogs
        ═══════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Activity summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { label: 'Total Tasks',  value: tasks.length,          color: '#60a5fa',  sub: 'assigned' },
              { label: 'Completed',    value: doneTasks.length,       color: '#4ade80',  sub: `${tasks.length ? Math.round(doneTasks.length / tasks.length * 100) : 0}% done` },
              { label: 'Open',         value: openTasks.length,       color: '#fbbf24',  sub: 'remaining' },
              { label: 'Blockers',     value: blockerLogs.length,     color: blockerLogs.length > 0 ? '#f87171' : '#4ade80', sub: blockerLogs.length > 0 ? 'needs attention' : 'all clear' },
            ].map(item => (
              <div key={item.label} style={{ ...card, padding: '14px 16px' }}>
                <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: item.color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{item.value}</div>
                <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', marginTop: 4 }}>{item.sub}</div>
              </div>
            ))}
          </div>

          {/* Blockers */}
          {blockerLogs.length > 0 && (
            <div style={{ ...card, borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <AlertTriangle size={14} style={{ color: '#f87171' }} />
                <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#f87171', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Blockers & Escalations ({blockerLogs.length})
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {blockerLogs.map(w => {
                  const member = team.find(m => {
                    const fl = project.teamMembers?.find(tm => tm.id === w.freelancerId)
                    return fl?.user?.id === m.id || m.id === w.freelancerId
                  })
                  return (
                    <div key={w.id} style={{ display: 'flex', gap: 14, padding: '12px 14px', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.18)', borderRadius: 10 }}>
                      <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 52 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#f87171', fontFamily: 'JetBrains Mono, monospace' }}>{fmtShort(w.date)}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>{daysAgo(w.date)}</div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#DC143C', fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>{w.hoursWorked}h</div>
                      </div>
                      <div style={{ width: 1, background: 'rgba(248,113,113,0.2)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {w.freelancer?.user && (
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{w.freelancer.user.name}</div>
                        )}
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>{w.blockers}</p>
                        {w.nextSteps && (
                          <p style={{ fontSize: 11, color: '#4ade80', margin: '6px 0 0', fontFamily: 'JetBrains Mono, monospace' }}>→ {w.nextSteps}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tasks by sprint — with full add capability */}
          <div style={card}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Activity size={14} style={{ color: '#DC143C' }} />
              <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Sprints & Tasks ({tasks.length})
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#4ade80' }}>{doneTasks.length} done</span>
              <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>·</span>
              <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#fbbf24' }}>{openTasks.length} open</span>
            </div>

            {/* Sprint list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {sprints.map(sprint => {
                const sprintTasks = tasks.filter(t => t.sprintId === sprint.id)
                const sprintDone = sprintTasks.filter(t => t.completed).length
                const pct = sprintTasks.length ? Math.round(sprintDone / sprintTasks.length * 100) : 0
                const isCollapsed = collapsedSprints.has(sprint.id)
                return (
                  <div key={sprint.id} style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    {/* Sprint header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-elevated)', cursor: 'pointer' }}
                      onClick={() => toggleSprintCollapse(sprint.id)}>
                      <span style={{ transition: 'transform 0.15s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', display: 'inline-flex' }}>
                        <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />
                      </span>
                      <Layers size={12} style={{ color: '#DC143C', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>{sprint.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 48, height: 3, borderRadius: 99, overflow: 'hidden', background: 'var(--border)' }}>
                          <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: '#DC143C' }} />
                        </div>
                        <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>{sprintDone}/{sprintTasks.length}</span>
                      </div>
                      {sprint.endDate && (
                        <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>ends {fmtShort(sprint.endDate)}</span>
                      )}
                      <button onClick={e => { e.stopPropagation(); handleDeleteSprint(sprint.id) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex', borderRadius: 4 }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                        <X size={11} />
                      </button>
                    </div>
                    {!isCollapsed && (
                      <div style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {sprintTasks.map(task => (
                          <TaskRow key={task.id} task={task} onToggle={handleToggleTask} onDelete={handleDeleteTask} />
                        ))}
                        {sprintTasks.length === 0 && (
                          <p style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>No tasks — add one below</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Backlog (unassigned to any sprint) */}
              {(() => {
                const backlog = tasks.filter(t => !t.sprintId)
                if (backlog.length === 0 && sprints.length > 0) return null
                return (
                  <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-elevated)' }}>
                      <ChevronRight size={13} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>Backlog / Unassigned</span>
                      <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>
                        {backlog.filter(t => t.completed).length}/{backlog.length}
                      </span>
                    </div>
                    <div style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {backlog.map(task => (
                        <TaskRow key={task.id} task={task} onToggle={handleToggleTask} onDelete={handleDeleteTask} />
                      ))}
                      {backlog.length === 0 && (
                        <p style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>No backlog tasks</p>
                      )}
                    </div>
                  </div>
                )
              })()}

              {tasks.length === 0 && sprints.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px 0', border: '1px dashed var(--border)', borderRadius: 10 }}>
                  <Activity size={22} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
                  <p style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>No sprints yet — create one below</p>
                </div>
              )}
            </div>

            {/* ── Add Task row ── */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={newTaskSprint} onChange={e => setNewTaskSprint(e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', width: 140, flexShrink: 0 }}>
                  <option value="">Backlog</option>
                  {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <input
                  style={{ flex: 1, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 13 }}
                  placeholder="Add a task… (Enter)"
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleAddTask() }}
                  disabled={addingTask}
                />
                <button onClick={handleAddTask} disabled={!newTaskTitle.trim() || addingTask}
                  style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(220,20,60,0.3)', background: 'rgba(220,20,60,0.1)', color: '#DC143C', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: !newTaskTitle.trim() ? 0.4 : 1 }}>
                  <Plus size={15} />
                </button>
              </div>

              {/* ── Add Sprint box ── */}
              <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid rgba(220,20,60,0.15)' }}>
                <p style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', letterSpacing: '0.18em', marginBottom: 8 }}>NEW SPRINT</p>
                <input
                  style={{ width: '100%', padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(220,20,60,0.2)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }}
                  placeholder="Sprint name… (e.g. Sprint 3 — Checkout)"
                  value={newSprintName}
                  onChange={e => setNewSprintName(e.target.value)}
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleAddSprint() }}
                  disabled={addingSprint}
                />
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 4 }}>START DATE</p>
                    <input type="date" value={newSprintStart} onChange={e => setNewSprintStart(e.target.value)} disabled={addingSprint}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 12, boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 4 }}>END DATE</p>
                    <input type="date" value={newSprintEnd} min={newSprintStart || undefined} onChange={e => setNewSprintEnd(e.target.value)} disabled={addingSprint}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 12, boxSizing: 'border-box' }} />
                  </div>
                  <button onClick={handleAddSprint} disabled={!newSprintName.trim() || addingSprint}
                    style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid rgba(220,20,60,0.3)', background: 'rgba(220,20,60,0.1)', color: '#DC143C', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', opacity: !newSprintName.trim() ? 0.4 : 1 }}>
                    <Layers size={13} /> Add Sprint
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Work Logs */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Clock size={14} style={{ color: '#60a5fa' }} />
              <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Work Logs ({worklogs.length} · {totalHours}h total)
              </span>
            </div>
            {sortedLogs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>No worklogs yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {sortedLogs.slice(0, 10).map((w, i) => {
                  const hasBlocker = !!w.blockers?.trim()
                  const freelancerName = w.freelancer?.user?.name
                  return (
                    <div key={w.id} style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: i < Math.min(sortedLogs.length, 10) - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ flexShrink: 0, width: 74, textAlign: 'right' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>{fmtShort(w.date)}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: '#DC143C' }}>{w.hoursWorked}h</div>
                      </div>
                      <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          {freelancerName && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{freelancerName}</span>}
                          {hasBlocker && <span style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, padding: '1px 6px', borderRadius: 4 }}>BLOCKER</span>}
                          <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', marginLeft: 'auto' }}>Progress: {w.progress}%</span>
                        </div>
                        {w.tasksCompleted && <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{w.tasksCompleted}</p>}
                        {hasBlocker && <p style={{ fontSize: 11, color: '#f87171', margin: '4px 0 0', lineHeight: 1.4, fontStyle: 'italic' }}>⚠ {w.blockers}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
        {/* end right column */}
      </div>
    </DashboardLayout>
  )
}
