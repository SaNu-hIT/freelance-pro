'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Play, Square, Clock, CheckSquare, Square as SquareIcon,
  ChevronDown, CheckCircle, Eye, X, Layers, AlertTriangle,
  Timer, LogIn, AlertCircle,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { projectsApi, worklogsApi, tasksApi, sprintsApi } from '@/lib/api'
import { Project, Worklog, ProjectTask, ProjectSprint } from '@/lib/types'

const LS_START   = 'worklog_start_time'
const LS_PROJECT = 'worklog_project_id'
const LS_TASK    = 'worklog_active_task'
const MAX_SECS   = 8 * 3600

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

function fmtDuration(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function fmtMini(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function secsToHours(s: number) {
  return Math.max(0.25, Math.round((s / 3600) * 4) / 4)
}

export default function FreelancerWorklogsPage() {
  const [projects, setProjects]         = useState<Project[]>([])
  const [worklogs, setWorklogs]         = useState<Worklog[]>([])
  const [tasks, setTasks]               = useState<ProjectTask[]>([])
  const [sprints, setSprints]           = useState<ProjectSprint[]>([])
  const [loading, setLoading]           = useState(true)
  const [tasksLoading, setTasksLoading] = useState(false)

  // ── Timer ──────────────────────────────────────────────────
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerSecs, setTimerSecs]       = useState(0)
  const [startISO, setStartISO]         = useState<string | null>(null)
  const [endISO, setEndISO]             = useState<string | null>(null)
  const [autoPaused, setAutoPaused]     = useState(false)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)  // which task is being timed
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Checklist ─────────────────────────────────────────────
  const [workedTasks, setWorkedTasks]   = useState<Set<string>>(new Set())
  const [markDoneIds, setMarkDoneIds]   = useState<Set<string>>(new Set())
  const [collapsedSprints, setCollapsedSprints] = useState<Set<string>>(new Set())

  // ── Form ──────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0]
  const [selectedProject, setSelectedProject] = useState('')
  const [hoursWorked, setHoursWorked]   = useState<number | ''>('')
  const [blockers, setBlockers]         = useState('')
  const [nextSteps, setNextSteps]       = useState('')

  // ── History ───────────────────────────────────────────────
  const [filterProject, setFilterProject] = useState('')
  const [viewLog, setViewLog]           = useState<Worklog | null>(null)
  const [submitting, setSubmitting]     = useState(false)
  const [success, setSuccess]           = useState(false)
  const [submitError, setSubmitError]   = useState('')

  // ── Tick (computed from real clock — no drift on reload) ───
  function tick(iso: string) {
    const elapsed = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (elapsed >= MAX_SECS) {
      clearInterval(timerRef.current!)
      setTimerSecs(MAX_SECS)
      setHoursWorked(8)
      setEndISO(new Date(new Date(iso).getTime() + MAX_SECS * 1000).toISOString())
      setTimerRunning(false)
      setAutoPaused(true)
      localStorage.removeItem(LS_START)
      localStorage.removeItem(LS_PROJECT)
      localStorage.removeItem(LS_TASK)
    } else {
      setTimerSecs(elapsed)
    }
  }

  function startInterval(iso: string) {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => tick(iso), 1000)
  }

  // ── Restore persisted timer on mount ──────────────────────
  useEffect(() => {
    const storedISO     = localStorage.getItem(LS_START)
    const storedProject = localStorage.getItem(LS_PROJECT)
    const storedTask    = localStorage.getItem(LS_TASK)

    if (storedISO) {
      const elapsed = Math.floor((Date.now() - new Date(storedISO).getTime()) / 1000)
      if (storedProject) setSelectedProject(storedProject)
      if (storedTask)    setActiveTaskId(storedTask)
      if (storedTask) setWorkedTasks(new Set([storedTask]))

      if (elapsed >= MAX_SECS) {
        setTimerSecs(MAX_SECS)
        setHoursWorked(8)
        setStartISO(storedISO)
        setEndISO(new Date(new Date(storedISO).getTime() + MAX_SECS * 1000).toISOString())
        setAutoPaused(true)
        localStorage.removeItem(LS_START)
        localStorage.removeItem(LS_PROJECT)
        localStorage.removeItem(LS_TASK)
      } else {
        setStartISO(storedISO)
        setTimerSecs(elapsed)
        setTimerRunning(true)
        startInterval(storedISO)
      }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Load projects + worklogs ───────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [pRes, wRes] = await Promise.all([projectsApi.getAll(), worklogsApi.getAll()])
        const pData = pRes.data?.data ?? pRes.data ?? []
        const wData = wRes.data?.data ?? wRes.data ?? []
        setProjects(pData)
        setWorklogs(wData)
        if (pData.length > 0 && !localStorage.getItem(LS_PROJECT)) {
          setSelectedProject(pData[0].id)
        }
      } catch {
        setProjects([])
        setWorklogs([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Load tasks + sprints when project changes ──────────────
  useEffect(() => {
    if (!selectedProject) return
    setTasksLoading(true)
    setTasks([])
    setSprints([])
    Promise.allSettled([
      tasksApi.getByProject(selectedProject),
      sprintsApi.getByProject(selectedProject),
    ]).then(([tRes, sRes]) => {
      setTasks(tRes.status === 'fulfilled' ? tRes.value.data : [])
      setSprints(sRes.status === 'fulfilled' ? sRes.value.data : [])
    }).finally(() => setTasksLoading(false))
  }, [selectedProject])

  // ── Timer controls ─────────────────────────────────────────
  function startTimerForTask(taskId: string) {
    if (!selectedProject) return
    const iso = new Date().toISOString()
    // Stop previous interval if switching tasks
    if (timerRef.current) clearInterval(timerRef.current)
    setStartISO(iso)
    setEndISO(null)
    setAutoPaused(false)
    setTimerSecs(0)
    setHoursWorked('')
    setTimerRunning(true)
    setActiveTaskId(taskId)
    // Mark the task as worked on
    setWorkedTasks(prev => { const n = new Set(prev); n.add(taskId); return n })
    localStorage.setItem(LS_START, iso)
    localStorage.setItem(LS_PROJECT, selectedProject)
    localStorage.setItem(LS_TASK, taskId)
    startInterval(iso)
  }

  function stopTimer() {
    if (!timerRunning) return
    clearInterval(timerRef.current!)
    const now = new Date().toISOString()
    setEndISO(now)
    setTimerRunning(false)
    setActiveTaskId(null)
    setHoursWorked(secsToHours(timerSecs))
    localStorage.removeItem(LS_START)
    localStorage.removeItem(LS_PROJECT)
    localStorage.removeItem(LS_TASK)
  }

  function resetTimer() {
    clearInterval(timerRef.current!)
    setTimerRunning(false)
    setTimerSecs(0)
    setHoursWorked('')
    setStartISO(null)
    setEndISO(null)
    setAutoPaused(false)
    setActiveTaskId(null)
    localStorage.removeItem(LS_START)
    localStorage.removeItem(LS_PROJECT)
    localStorage.removeItem(LS_TASK)
  }

  // ── Checklist helpers ─────────────────────────────────────
  const toggleWorked = (id: string) => setWorkedTasks(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })
  const toggleMarkDone = (id: string) => setMarkDoneIds(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })
  const toggleSprintCollapse = (sid: string) => setCollapsedSprints(prev => {
    const n = new Set(prev); n.has(sid) ? n.delete(sid) : n.add(sid); return n
  })

  const tasksCompleted = tasks
    .filter(t => workedTasks.has(t.id))
    .map(t => t.title)
    .join('. ')

  // Auto-calculated progress from tasks (includes about-to-be-marked-done)
  const alreadyDone  = tasks.filter(t => t.completed).length
  const newlyDone    = [...markDoneIds].filter(id => !tasks.find(t => t.id === id)?.completed).length
  const totalTasks   = tasks.length
  const progress     = totalTasks > 0 ? Math.round(((alreadyDone + newlyDone) / totalTasks) * 100) : 0

  // ── Submit ────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProject || !hoursWorked) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const payload = {
        projectId: selectedProject,
        date: today,
        hoursWorked: Number(hoursWorked),
        tasksCompleted: tasksCompleted || 'General work session',
        progress,
        blockers: blockers || undefined,
        nextSteps: nextSteps || undefined,
      }
      await worklogsApi.create(payload as unknown as Record<string, unknown>)
      // Re-fetch so the list always shows exactly what the server has (avoids shape mismatch from optimistic update)
      await Promise.allSettled([...markDoneIds].map(id => tasksApi.update(id, { completed: true })))
      const freshLogsRes = await worklogsApi.getAll()
      const freshData = freshLogsRes.data?.data ?? freshLogsRes.data ?? []
      setWorklogs(freshData)
      setTasks(prev => prev.map(t => markDoneIds.has(t.id) ? { ...t, completed: true } : t))
      setSuccess(true)
      resetTimer()
      setWorkedTasks(new Set())
      setMarkDoneIds(new Set())
      setBlockers('')
      setNextSteps('')
      setTimeout(() => setSuccess(false), 4000)
    } catch (err: unknown) {
      const apiMsg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
      const msg = Array.isArray(apiMsg) ? apiMsg.join(', ') : apiMsg
      setSubmitError(msg || 'Failed to submit worklog. Please try again.')
      console.error('Failed to submit worklog:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredLogs  = worklogs.filter(w => !filterProject || w.projectId === filterProject)
  const tasksBySprint = (sid: string | null) => tasks.filter(t => t.sprintId === sid)
  const backlogTasks  = tasks.filter(t => !t.sprintId)
  const workedCount   = workedTasks.size
  const pct           = timerSecs / MAX_SECS
  const timerColor    = autoPaused ? '#f87171' : pct > 0.875 ? '#fb923c' : pct > 0.75 ? '#fbbf24' : '#DC143C'

  const activeTask    = tasks.find(t => t.id === activeTaskId)

  return (
    <DashboardLayout allowedRoles={['freelancer']}>
      <div className="flex gap-6 h-full overflow-hidden">

        {/* ── LEFT: Session + Tasks ── */}
        <div className="w-[44%] flex flex-col gap-4 overflow-y-auto">

          {/* Auto-pause banner */}
          {autoPaused && (
            <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl"
              style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.35)' }}>
              <AlertCircle size={15} className="mt-0.5 shrink-0" style={{ color: '#fb923c' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: '#fb923c' }}>Session auto-paused at 8 hours</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Sessions are capped at 8 hours. Review your hours and submit.
                </p>
              </div>
            </div>
          )}

          {/* ── Session Clock Card ── */}
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>TODAY'S SESSION</p>
              {timerRunning && (
                <button onClick={stopTimer}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.4)', color: '#f87171' }}>
                  <Square size={11} fill="currentColor" /> Stop Work
                </button>
              )}
              {timerSecs > 0 && !timerRunning && (
                <button onClick={resetTimer} className="p-1.5 rounded-lg transition-all"
                  style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                  title="Reset timer">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Project selector */}
            <div className="relative mb-4">
              <select
                className="input-field appearance-none pr-8 font-medium text-sm"
                value={selectedProject}
                onChange={e => setSelectedProject(e.target.value)}
                disabled={timerRunning}
                style={{ opacity: timerRunning ? 0.6 : 1, cursor: timerRunning ? 'not-allowed' : 'default' }}
              >
                <option value="" disabled>Select project…</option>
                {projects.map(p => <option key={p.id} value={p.id} style={{ background: 'var(--bg-surface)' }}>{p.title}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--text-muted)' }} />
              {timerRunning && (
                <span className="absolute -top-2 right-6 text-xs px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(220,20,60,0.12)', border: '1px solid rgba(220,20,60,0.25)', color: '#DC143C', fontSize: 9, letterSpacing: '0.08em' }}>
                  LOCKED
                </span>
              )}
            </div>

            {/* Clock + progress */}
            <div className="px-4 py-3.5 rounded-xl"
              style={{ background: 'var(--row-hover-bg)', border: `1px solid ${timerRunning ? `${timerColor}40` : autoPaused ? 'rgba(251,146,60,0.3)' : 'var(--input-bg)'}`, transition: 'border-color 0.4s' }}>

              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2.5">
                  <Clock size={14} style={{ color: timerRunning ? timerColor : 'var(--text-muted)' }} />
                  <span className="font-mono text-2xl font-bold tracking-widest"
                    style={{ color: timerRunning ? '#fff' : timerSecs > 0 ? 'var(--text-secondary)' : 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {fmtDuration(timerSecs)}
                  </span>
                  {timerRunning && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: timerColor }} />}
                </div>
                {hoursWorked !== '' && !timerRunning && (
                  <span className="text-sm font-bold px-2.5 py-1 rounded-lg"
                    style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80' }}>
                    {hoursWorked}h logged
                  </span>
                )}
              </div>

              {/* 8h progress bar */}
              <div className="w-full rounded-full mb-2.5" style={{ height: 3, background: 'var(--input-bg)' }}>
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, pct * 100)}%`, background: timerColor }} />
              </div>

              {/* Start time row */}
              <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                <div className="flex items-center gap-1.5">
                  <LogIn size={11} />
                  {startISO
                    ? <span>Started <strong style={{ color: 'var(--text-secondary)' }}>{fmtTime(startISO)}</strong></span>
                    : <span>Not started — tap ▶ on a task below</span>}
                </div>
                {endISO && !timerRunning && (
                  <span>Ended <strong style={{ color: 'var(--text-secondary)' }}>{fmtTime(endISO)}</strong></span>
                )}
              </div>

              {/* Active task indicator */}
              {timerRunning && activeTask && (
                <div className="mt-2.5 flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                  style={{ background: `${timerColor}10`, border: `1px solid ${timerColor}30` }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ background: timerColor }} />
                  <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {activeTask.title}
                  </span>
                </div>
              )}
            </div>

            {/* 8h warnings */}
            {timerRunning && pct > 0.75 && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: pct > 0.875 ? 'rgba(251,146,60,0.08)' : 'rgba(251,191,36,0.06)', border: `1px solid ${pct > 0.875 ? 'rgba(251,146,60,0.3)' : 'rgba(251,191,36,0.2)'}` }}>
                <AlertTriangle size={12} style={{ color: pct > 0.875 ? '#fb923c' : '#fbbf24' }} />
                <p className="text-xs" style={{ color: pct > 0.875 ? '#fb923c' : '#fbbf24' }}>
                  {pct > 0.875
                    ? `Auto-pause in ~${Math.ceil((MAX_SECS - timerSecs) / 60)} min`
                    : 'Session will auto-pause at 8 hours'}
                </p>
              </div>
            )}

            {/* Manual hours override */}
            <div className="flex items-center gap-3 mt-4">
              <label className="label-field shrink-0">Hours logged</label>
              <input
                type="number" min={0.25} max={8} step={0.25}
                className="input-field py-1.5 text-sm flex-1"
                placeholder="e.g. 2.5"
                value={hoursWorked}
                onChange={e => setHoursWorked(e.target.value === '' ? '' : parseFloat(e.target.value))}
              />
              <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>manual</span>
            </div>
          </div>

          {/* ── Task Checklist ── */}
          <div className="glass-card rounded-xl p-5 flex-1">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <CheckSquare size={13} style={{ color: '#DC143C' }} />
                <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>TASKS</p>
              </div>
              {workedCount > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded"
                  style={{ background: 'rgba(220,20,60,0.12)', border: '1px solid rgba(220,20,60,0.3)', color: '#f87171' }}>
                  {workedCount} worked
                </span>
              )}
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              Press ▶ on a task to start the timer for it. Tap ✓ to mark it complete on submit.
            </p>

            {tasksLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'var(--input-bg)' }} />
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Layers size={24} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No tasks for this project</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {sprints.map(sprint => {
                  const sprintTasks = tasksBySprint(sprint.id)
                  if (sprintTasks.length === 0) return null
                  const isCollapsed = collapsedSprints.has(sprint.id)
                  return (
                    <div key={sprint.id} className="rounded-xl overflow-hidden"
                      style={{ border: '1px solid var(--border)' }}>
                      {/* Sprint header */}
                      <button
                        className="w-full flex items-center gap-2 px-3 py-2.5 transition-colors"
                        style={{ background: 'var(--row-hover-bg)' }}
                        onClick={() => toggleSprintCollapse(sprint.id)}>
                        <Layers size={11} style={{ color: '#DC143C' }} />
                        <span className="flex-1 text-left text-xs font-semibold"
                          style={{ color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
                          {sprint.name}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--input-bg)', color: 'var(--text-muted)' }}>
                          {sprintTasks.length}
                        </span>
                        {/* Sprint mini progress */}
                        {(() => {
                          const done = sprintTasks.filter(t => t.completed).length
                          const pct  = sprintTasks.length > 0 ? Math.round((done / sprintTasks.length) * 100) : 0
                          return (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <div className="w-12 rounded-full overflow-hidden" style={{ height: 3, background: 'var(--input-bg)' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#4ade80' : '#DC143C', borderRadius: 99 }} />
                              </div>
                              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{pct}%</span>
                            </div>
                          )
                        })()}
                        <ChevronDown size={12} style={{ color: 'var(--text-muted)', transform: isCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.15s' }} />
                      </button>

                      {!isCollapsed && (
                        <div className="p-2 space-y-1.5">
                          {sprintTasks.map(task => (
                            <TaskRow key={task.id} task={task}
                              worked={workedTasks.has(task.id)}
                              markDone={markDoneIds.has(task.id)}
                              isActive={activeTaskId === task.id}
                              timerRunning={timerRunning}
                              timerSecs={activeTaskId === task.id ? timerSecs : 0}
                              onToggleWorked={toggleWorked}
                              onToggleMarkDone={toggleMarkDone}
                              onStart={() => startTimerForTask(task.id)}
                              onStop={stopTimer}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Backlog */}
                {backlogTasks.length > 0 && (
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2 px-3 py-2.5"
                      style={{ background: 'var(--row-hover-bg)' }}>
                      <Layers size={11} style={{ color: 'var(--text-muted)' }} />
                      <span className="flex-1 text-xs font-semibold"
                        style={{ color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                        BACKLOG
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--input-bg)', color: 'var(--text-muted)' }}>
                        {backlogTasks.length}
                      </span>
                    </div>
                    <div className="p-2 space-y-1.5">
                      {backlogTasks.map(task => (
                        <TaskRow key={task.id} task={task}
                          worked={workedTasks.has(task.id)}
                          markDone={markDoneIds.has(task.id)}
                          isActive={activeTaskId === task.id}
                          timerRunning={timerRunning}
                          timerSecs={activeTaskId === task.id ? timerSecs : 0}
                          onToggleWorked={toggleWorked}
                          onToggleMarkDone={toggleMarkDone}
                          onStart={() => startTimerForTask(task.id)}
                          onStop={stopTimer}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Auto-summary */}
            {tasksCompleted && (
              <div className="mt-4 px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.18)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(74,222,128,0.6)', letterSpacing: '0.08em' }}>
                  AUTO SUMMARY
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{tasksCompleted}</p>
              </div>
            )}
          </div>

          {/* ── Progress + Notes + Submit ── */}
          <form onSubmit={handleSubmit} className="glass-card rounded-xl p-5 space-y-4">
            {success && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)' }}>
                <CheckCircle size={14} style={{ color: '#4ade80' }} />
                <span className="text-sm font-semibold" style={{ color: '#4ade80' }}>Worklog submitted!</span>
              </div>
            )}

            {submitError && (
              <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)' }}>
                <AlertCircle size={14} className="shrink-0 mt-0.5" style={{ color: '#f87171' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#f87171' }}>Submission failed</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{submitError}</p>
                </div>
                <button onClick={() => setSubmitError('')} className="ml-auto shrink-0" style={{ color: 'var(--text-muted)' }}>
                  <X size={13} />
                </button>
              </div>
            )}

            {/* Auto-calculated progress */}
            <div className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background: 'var(--row-hover-bg)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <CheckCircle size={13} style={{ color: '#4ade80' }} />
                <span className="text-sm font-medium text-primary-ui">Project Progress</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 rounded-full overflow-hidden" style={{ height: 4, background: 'var(--input-bg)' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: progress === 100 ? '#4ade80' : '#DC143C', borderRadius: 99, transition: 'width 0.3s' }} />
                </div>
                <span className="text-sm font-bold" style={{ color: progress === 100 ? '#4ade80' : '#DC143C' }}>{progress}%</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {alreadyDone + newlyDone}/{totalTasks} tasks
                </span>
              </div>
            </div>

            <div>
              <label className="label-field flex items-center gap-1.5">
                <AlertTriangle size={10} style={{ color: '#fb923c' }} />
                Blockers <span style={{ color: 'var(--text-muted)' }}>optional</span>
              </label>
              <textarea className="input-field resize-none text-sm" rows={2}
                placeholder="Any blockers preventing progress?"
                value={blockers} onChange={e => setBlockers(e.target.value)} />
            </div>

            <div>
              <label className="label-field">
                Next Steps <span style={{ color: 'var(--text-muted)' }}>optional</span>
              </label>
              <textarea className="input-field resize-none text-sm" rows={2}
                placeholder="What's planned for next session?"
                value={nextSteps} onChange={e => setNextSteps(e.target.value)} />
            </div>

            <button
              type="submit"
              disabled={submitting || !selectedProject || !hoursWorked || timerRunning}
              className="btn-primary w-full rounded-xl py-3 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'SUBMITTING…'
                : timerRunning ? 'STOP WORK FIRST'
                : `SUBMIT WORKLOG${hoursWorked ? ` · ${hoursWorked}h` : ''}`}
            </button>
            <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              {timerRunning ? 'Stop the timer on the task to enable submit'
                : !hoursWorked ? 'Start a task or enter hours manually to submit'
                : ''}
            </p>
          </form>
        </div>

        {/* ── RIGHT: History ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="glass-card rounded-xl flex flex-col overflow-hidden h-full">
            <div className="px-5 py-4 border-b border-[var(--input-bg)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Timer size={14} style={{ color: '#DC143C' }} />
                <h2 className="text-primary-ui font-bold text-base">My Worklogs</h2>
              </div>
              <div className="flex items-center gap-2">
                <select className="input-field text-xs py-1.5 appearance-none"
                  value={filterProject} onChange={e => setFilterProject(e.target.value)} style={{ width: 160 }}>
                  <option value="" style={{ background: 'var(--bg-surface)' }}>All Projects</option>
                  {projects.map(p => <option key={p.id} value={p.id} style={{ background: 'var(--bg-surface)' }}>{p.title}</option>)}
                </select>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{filteredLogs.length} logs</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-5 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 rounded animate-pulse" style={{ background: 'var(--input-bg)' }} />
                  ))}
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16">
                  <Clock size={32} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>No worklogs yet</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Start a task and submit your first log</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--input-bg)]">
                  {filteredLogs.map(w => {
                    const p = projects.find(x => x.id === w.projectId)
                    return (
                      <div key={w.id}
                        className="px-5 py-3.5 flex items-center gap-4 hover:bg-[var(--row-hover-bg)] transition-colors group">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm"
                          style={{ background: 'rgba(220,20,60,0.12)', border: '1px solid rgba(220,20,60,0.25)', color: '#DC143C' }}>
                          {w.hoursWorked}h
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-semibold text-primary-ui truncate">{p?.title ?? 'Project'}</p>
                            {w.blockers && <AlertTriangle size={11} style={{ color: '#fb923c' }} />}
                          </div>
                          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{w.tasksCompleted}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{fmtDate(w.date)}</p>
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 rounded-full overflow-hidden" style={{ height: 3, background: 'var(--input-bg)' }}>
                              <div style={{ width: `${w.progress}%`, height: '100%', background: '#DC143C', borderRadius: 99 }} />
                            </div>
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{w.progress}%</span>
                          </div>
                        </div>
                        <button onClick={() => setViewLog(w)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded"
                          style={{ color: 'var(--text-muted)' }}>
                          <Eye size={14} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* View Log Modal */}
      {viewLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(3,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={() => setViewLog(null)}>
          <div className="glass-card rounded-xl p-6 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-primary-ui font-bold text-base">Worklog Detail</h3>
              <button onClick={() => setViewLog(null)} style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'HOURS', value: `${viewLog.hoursWorked}h`, color: '#DC143C' },
                { label: 'PROGRESS', value: `${viewLog.progress}%`, color: '#4ade80' },
                { label: 'DATE', value: fmtDate(viewLog.date), color: '#fbbf24' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-lg px-3 py-2.5 text-center"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
                  <p className="text-mono-label mb-1" style={{ fontSize: 9, color: 'var(--text-muted)' }}>{label}</p>
                  <p className="font-bold text-sm" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="label-field mb-1">Tasks Completed</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{viewLog.tasksCompleted}</p>
            </div>
            {viewLog.blockers && (
              <div className="px-3 py-2.5 rounded-lg"
                style={{ background: 'rgba(251,146,60,0.07)', border: '1px solid rgba(251,146,60,0.25)' }}>
                <p className="label-field mb-1 flex items-center gap-1">
                  <AlertTriangle size={10} style={{ color: '#fb923c' }} /> Blocker
                </p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{viewLog.blockers}</p>
              </div>
            )}
            {viewLog.nextSteps && (
              <div>
                <p className="label-field mb-1">Next Steps</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{viewLog.nextSteps}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

// ── TaskRow ────────────────────────────────────────────────────────────────
interface TaskRowProps {
  task: ProjectTask
  worked: boolean
  markDone: boolean
  isActive: boolean
  timerRunning: boolean
  timerSecs: number
  onToggleWorked: (id: string) => void
  onToggleMarkDone: (id: string) => void
  onStart: () => void
  onStop: () => void
}

function TaskRow({ task, worked, markDone, isActive, timerRunning, timerSecs,
  onToggleWorked, onToggleMarkDone, onStart, onStop }: TaskRowProps) {
  const isDone = task.completed

  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all"
      style={{
        background: isActive
          ? 'rgba(220,20,60,0.07)'
          : worked ? 'var(--row-hover-bg)' : 'transparent',
        border: isActive
          ? '1px solid rgba(220,20,60,0.3)'
          : worked ? '1px solid var(--border)' : '1px solid transparent',
        opacity: isDone && !worked ? 0.4 : 1,
      }}>

      {/* Worked checkbox */}
      <button
        onClick={() => onToggleWorked(task.id)}
        className="shrink-0"
        title="Mark as worked on this session">
        {worked
          ? <CheckSquare size={14} style={{ color: isActive ? '#DC143C' : 'rgba(220,20,60,0.6)' }} />
          : <SquareIcon size={14} style={{ color: 'var(--text-muted)' }} />}
      </button>

      {/* Task title */}
      <span className="flex-1 text-sm leading-snug"
        style={{
          color: isActive ? '#fff' : worked ? 'var(--text-primary)' : 'var(--text-secondary)',
          textDecoration: isDone ? 'line-through' : 'none',
          fontWeight: isActive ? 500 : 400,
        }}>
        {task.title}
      </span>

      {/* Right side: live mini-timer OR mark done OR start button */}
      <div className="flex items-center gap-1.5 shrink-0">

        {/* Mark done pill — only visible if worked and not already done */}
        {worked && !isDone && !isActive && (
          <button
            onClick={() => onToggleMarkDone(task.id)}
            className="px-1.5 py-0.5 rounded text-xs transition-all"
            style={{
              fontSize: 10,
              background: markDone ? 'rgba(74,222,128,0.15)' : 'var(--input-bg)',
              border: `1px solid ${markDone ? 'rgba(74,222,128,0.4)' : 'var(--track-bg)'}`,
              color: markDone ? '#4ade80' : 'var(--text-muted)',
            }}>
            {markDone ? '✓' : 'DONE'}
          </button>
        )}

        {/* Already completed badge + time */}
        {isDone && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span style={{ fontSize: 10, color: 'rgba(74,222,128,0.6)' }}>✓</span>
            {task.completedAt && (
              <span style={{ fontSize: 10, color: 'rgba(74,222,128,0.4)', fontFamily: 'JetBrains Mono, monospace' }}>
                {new Date(task.completedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </span>
            )}
          </div>
        )}

        {/* ACTIVE: live timer + stop button */}
        {isActive && timerRunning && (
          <>
            <span className="font-mono text-xs font-bold"
              style={{ color: '#DC143C', fontFamily: 'JetBrains Mono, monospace', minWidth: 44, textAlign: 'right' }}>
              {fmtMini(timerSecs)}
            </span>
            <button
              onClick={onStop}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.4)', color: '#f87171' }}
              title="Stop timer">
              <Square size={11} fill="currentColor" />
            </button>
          </>
        )}

        {/* NOT active: start button */}
        {!isActive && !isDone && (
          <button
            onClick={onStart}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: timerRunning ? 'var(--row-hover-bg)' : 'rgba(220,20,60,0.1)',
              border: `1px solid ${timerRunning ? 'var(--input-bg)' : 'rgba(220,20,60,0.3)'}`,
              color: timerRunning ? 'var(--text-muted)' : '#DC143C',
            }}
            title={timerRunning ? 'Switch to this task' : 'Start timer for this task'}>
            <Play size={10} fill="currentColor" />
            <span style={{ fontSize: 10 }}>{timerRunning ? 'Switch' : 'Start'}</span>
          </button>
        )}
      </div>
    </div>
  )
}
