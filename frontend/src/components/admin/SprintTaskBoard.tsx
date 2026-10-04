'use client'

import { useRef, useState, KeyboardEvent } from 'react'
import {
  Plus, Layers, ChevronDown, Pencil, Trash2, Check, X, CheckSquare, Square, Inbox, CheckCircle2, CalendarDays,
} from 'lucide-react'
import { sprintsApi, tasksApi } from '@/lib/api'
import { ProjectSprint, ProjectTask } from '@/lib/types'
import { apiError } from '@/lib/utils'
import ErrorBanner from '@/components/ui/ErrorBanner'
import { InProgressChip } from '@/components/ui/TaskTimer'

type Member = { id: string; name: string }
const BACKLOG = '__backlog'
const DAY = 86400000

const isoDay = (d: Date) => d.toISOString().slice(0, 10)
const fmtDay = (iso: string) => new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

function dateRange(s: ProjectSprint) {
  if (s.startDate && s.endDate) return `${fmtDay(s.startDate)} – ${fmtDay(s.endDate)}`
  if (s.endDate) return `ends ${fmtDay(s.endDate)}`
  if (s.startDate) return `starts ${fmtDay(s.startDate)}`
  return null
}

// A new sprint follows the latest one: starts the day after it ends and runs two weeks
function suggestSprint(sprints: ProjectSprint[]) {
  const lastEnd = sprints.map(s => s.endDate).filter(Boolean).sort().pop()
  const start = lastEnd ? new Date(new Date(lastEnd!.slice(0, 10) + 'T00:00:00Z').getTime() + DAY) : new Date()
  return { name: `Sprint ${sprints.length + 1}`, start: isoDay(start), end: isoDay(new Date(start.getTime() + 13 * DAY)) }
}

// Sprints and tasks for one project: plan sprints, add tasks where they belong, assign, move, rename
export function SprintTaskBoard({ projectId, team, tasks, setTasks, sprints, setSprints }: {
  projectId: string
  team: Member[]
  tasks: ProjectTask[]
  setTasks: React.Dispatch<React.SetStateAction<ProjectTask[]>>
  sprints: ProjectSprint[]
  setSprints: React.Dispatch<React.SetStateAction<ProjectSprint[]>>
}) {
  const [error, setError] = useState('')
  const [sprintForm, setSprintForm] = useState<{ id?: string; name: string; start: string; end: string } | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [confirmSprint, setConfirmSprint] = useState<string | null>(null)

  const done = tasks.filter(t => t.completed).length
  const sections = [
    ...sprints.map(s => ({ key: s.id, sprint: s as ProjectSprint | null })),
    { key: BACKLOG, sprint: null },
  ]

  const toggleCollapse = (key: string) => setCollapsed(prev => {
    const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n
  })

  const saveTask = async (task: ProjectTask, patch: Parameters<typeof tasksApi.update>[1]) => {
    setError('')
    try {
      const res = await tasksApi.update(task.id, patch)
      setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, ...res.data } : t)))
      return true
    } catch (err) {
      setError(apiError(err, 'Could not update the task.'))
      return false
    }
  }

  const deleteTask = async (id: string) => {
    setError('')
    try {
      await tasksApi.delete(id)
      setTasks(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      setError(apiError(err, 'Could not delete the task.'))
    }
  }

  const deleteSprint = async (id: string) => {
    setError('')
    setConfirmSprint(null)
    try {
      await sprintsApi.delete(id)
      setSprints(prev => prev.filter(s => s.id !== id))
      // The server moves the sprint's tasks to the backlog
      setTasks(prev => prev.map(t => (t.sprintId === id ? { ...t, sprintId: null, sprint: null } : t)))
    } catch (err) {
      setError(apiError(err, 'Could not delete the sprint.'))
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Layers size={15} style={{ color: 'var(--fg)' }} />
        <h2 className="text-sm font-bold text-primary-ui">Sprints &amp; Tasks</h2>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {done} of {tasks.length} done
        </span>
        <button type="button" onClick={() => setSprintForm(suggestSprint(sprints))} disabled={!!sprintForm && !sprintForm.id}
          className="btn-primary ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded text-xs disabled:opacity-50">
          <Plus size={13} /> New sprint
        </button>
      </div>

      {error && <ErrorBanner message={error} onClose={() => setError('')} />}

      {sprintForm && !sprintForm.id && (
        <SprintForm form={sprintForm} setForm={setSprintForm} onDone={s => setSprints(prev => [...prev, s])}
          projectId={projectId} order={sprints.length} />
      )}

      {tasks.length === 0 && sprints.length === 0 && !sprintForm && (
        <p className="text-sm rounded-xl px-4 py-3" style={{ color: 'var(--text-muted)', border: '1px dashed var(--border)' }}>
          Group work into sprints with <strong>New sprint</strong>, or add tasks straight to the Backlog below.
        </p>
      )}

      {sections.map(({ key, sprint }) => {
        const list = tasks.filter(t => (sprint ? t.sprintId === sprint.id : !t.sprintId))
        const sectionDone = list.filter(t => t.completed).length
        const pct = list.length ? Math.round((sectionDone / list.length) * 100) : 0
        const isCollapsed = collapsed.has(key)
        const range = sprint && dateRange(sprint)

        if (sprintForm?.id && sprint && sprintForm.id === sprint.id) {
          return (
            <SprintForm key={key} form={sprintForm} setForm={setSprintForm} projectId={projectId} order={sprint.order}
              onDone={s => setSprints(prev => prev.map(x => (x.id === s.id ? { ...x, ...s } : x)))} />
          )
        }

        return (
          <section key={key} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 px-4 py-2.5 flex-wrap" style={{ background: 'var(--bg-elevated)' }}>
              <button type="button" onClick={() => toggleCollapse(key)} aria-expanded={!isCollapsed}
                className="flex items-center gap-2 min-w-0 flex-1 text-left">
                <ChevronDown size={14} className="shrink-0 transition-transform"
                  style={{ color: 'var(--text-muted)', transform: isCollapsed ? 'rotate(-90deg)' : 'none' }} />
                {sprint ? <Layers size={13} style={{ color: 'var(--fg)' }} /> : <Inbox size={13} style={{ color: 'var(--text-muted)' }} />}
                <span className="text-sm font-semibold text-primary-ui truncate">{sprint ? sprint.name : 'Backlog'}</span>
                {range && (
                  <span className="hidden sm:flex items-center gap-1 text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                    <CalendarDays size={11} /> {range}
                  </span>
                )}
              </button>
              {sprint?.approvedAt && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded"
                  style={{ background: 'rgb(var(--fg-rgb) / 0.1)', color: 'var(--fg)' }}>
                  <CheckCircle2 size={10} /> Client approved
                </span>
              )}
              <div className="flex items-center gap-2">
                <div className="w-14 rounded-full overflow-hidden" style={{ height: 4, background: 'var(--track-bg)' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--fg)' }} />
                </div>
                <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>{sectionDone}/{list.length}</span>
              </div>
              {sprint && (confirmSprint === sprint.id ? (
                <span className="flex items-center gap-2 text-xs">
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Delete sprint?{list.length > 0 && ` ${list.length} task${list.length === 1 ? '' : 's'} move to Backlog.`}
                  </span>
                  <button type="button" onClick={() => deleteSprint(sprint.id)} className="font-bold" style={{ color: 'var(--fg)' }}>Delete</button>
                  <button type="button" onClick={() => setConfirmSprint(null)} style={{ color: 'var(--text-muted)' }}>Cancel</button>
                </span>
              ) : (
                <span className="flex items-center gap-0.5">
                  <IconButton label={`Edit ${sprint.name}`} onClick={() => setSprintForm({
                    id: sprint.id, name: sprint.name, start: sprint.startDate?.slice(0, 10) ?? '', end: sprint.endDate?.slice(0, 10) ?? '',
                  })}><Pencil size={12} /></IconButton>
                  <IconButton label={`Delete ${sprint.name}`} onClick={() => setConfirmSprint(sprint.id)}><Trash2 size={12} /></IconButton>
                </span>
              ))}
            </div>

            {!isCollapsed && (
              <div className="p-2 space-y-0.5">
                {list.map(task => (
                  <TaskItem key={task.id} task={task} team={team} sprints={sprints}
                    onSave={patch => saveTask(task, patch)} onDelete={() => deleteTask(task.id)} />
                ))}
                {list.length === 0 && (
                  <p className="text-xs px-2 py-2" style={{ color: 'var(--text-muted)' }}>
                    {sprint ? 'No tasks in this sprint yet.' : 'Tasks not planned into a sprint land here.'}
                  </p>
                )}
                <TaskComposer projectId={projectId} sprintId={sprint?.id ?? null} team={team} order={tasks.length}
                  onAdded={t => setTasks(prev => [...prev, t])} onError={setError} />
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label}
      className="p-1.5 rounded transition-colors hover:bg-[var(--row-hover-bg)]" style={{ color: 'var(--text-muted)' }}>
      {children}
    </button>
  )
}

function SprintForm({ form, setForm, projectId, order, onDone }: {
  form: { id?: string; name: string; start: string; end: string }
  setForm: (f: { id?: string; name: string; start: string; end: string } | null) => void
  projectId: string
  order: number
  onDone: (s: ProjectSprint) => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const editing = !!form.id

  const problem = !form.name.trim() ? 'Give the sprint a name.'
    : form.start && form.end && form.end < form.start ? 'End date must be on or after the start date.'
    : ''

  const submit = async () => {
    if (problem) { setError(problem); return }
    setSaving(true)
    setError('')
    const data = {
      name: form.name.trim(),
      ...(form.start && { startDate: form.start }),
      ...(form.end && { endDate: form.end }),
    }
    try {
      const res = editing
        ? await sprintsApi.update(form.id!, data)
        : await sprintsApi.create({ projectId, order, ...data })
      onDone(res.data)
      setForm(null)
    } catch (err) {
      setError(apiError(err, editing ? 'Could not save the sprint.' : 'Could not create the sprint.'))
    } finally {
      setSaving(false)
    }
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); submit() }
    if (e.key === 'Escape') setForm(null)
  }

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg-elevated)', border: '1px solid rgb(var(--fg-rgb) / 0.3)' }}
      onKeyDown={onKey}>
      <p className="text-sm font-semibold text-primary-ui">{editing ? 'Edit sprint' : 'New sprint'}</p>
      {error && <ErrorBanner message={error} onClose={() => setError('')} />}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-1">
          <label htmlFor="sprint-name" className="label-field">Name</label>
          <input id="sprint-name" className="input-field" autoFocus value={form.name}
            onChange={e => { setForm({ ...form, name: e.target.value }); setError('') }} />
        </div>
        <div>
          <label htmlFor="sprint-start" className="label-field">Starts</label>
          <input id="sprint-start" type="date" className="input-field" value={form.start}
            onChange={e => { setForm({ ...form, start: e.target.value }); setError('') }} />
        </div>
        <div>
          <label htmlFor="sprint-end" className="label-field">Ends</label>
          <input id="sprint-end" type="date" className="input-field" value={form.end} min={form.start || undefined}
            onChange={e => { setForm({ ...form, end: e.target.value }); setError('') }} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={submit} disabled={saving}
          className="btn-primary flex items-center gap-1.5 px-4 py-2 rounded text-sm disabled:opacity-50">
          <Check size={13} /> {saving ? 'Saving…' : editing ? 'Save sprint' : 'Create sprint'}
        </button>
        <button type="button" onClick={() => setForm(null)} disabled={saving} className="btn-ghost px-4 py-2 rounded text-sm">Cancel</button>
        <span className="text-xs ml-auto hidden sm:block" style={{ color: 'var(--text-muted)' }}>Enter to save · Esc to cancel</span>
      </div>
    </div>
  )
}

// Inline "add task" at the bottom of a sprint: Enter adds and keeps the box open for the next one
function TaskComposer({ projectId, sprintId, team, order, onAdded, onError }: {
  projectId: string
  sprintId: string | null
  team: Member[]
  order: number
  onAdded: (t: ProjectTask) => void
  onError: (msg: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [assignee, setAssignee] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const add = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    onError('')
    try {
      const res = await tasksApi.create({
        projectId, title: title.trim(), order,
        ...(sprintId && { sprintId }),
        ...(assignee && { assignedFreelancerId: assignee }),
      })
      onAdded(res.data)
      setTitle('')
    } catch (err) {
      onError(apiError(err, 'Could not add the task.'))
    } finally {
      setSaving(false)
      inputRef.current?.focus()
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors hover:bg-[var(--row-hover-bg)]"
        style={{ color: 'var(--text-muted)' }}>
        <Plus size={14} /> Add task
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 px-1 py-1 flex-wrap sm:flex-nowrap">
      <input ref={inputRef} autoFocus className="input-field flex-1 min-w-[160px] py-2 text-sm"
        placeholder="What needs doing?" aria-label="New task title" value={title} disabled={saving}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') add()
          if (e.key === 'Escape') { setOpen(false); setTitle('') }
        }} />
      <select className="input-field py-2 text-xs w-36" aria-label="Assign to" value={assignee}
        onChange={e => setAssignee(e.target.value)}>
        <option value="">Unassigned</option>
        {team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      <button type="button" onClick={add} disabled={!title.trim() || saving}
        className="btn-primary px-3 py-2 rounded text-xs disabled:opacity-40">Add</button>
      <button type="button" onClick={() => { setOpen(false); setTitle('') }} aria-label="Close" title="Close"
        className="p-2 rounded" style={{ color: 'var(--text-muted)' }}><X size={14} /></button>
    </div>
  )
}

function TaskItem({ task, team, sprints, onSave, onDelete }: {
  task: ProjectTask
  team: Member[]
  sprints: ProjectSprint[]
  onSave: (patch: Parameters<typeof tasksApi.update>[1]) => Promise<boolean>
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Keep someone assigned before they left the team selectable
  const members = task.assignedFreelancerId && !team.some(m => m.id === task.assignedFreelancerId)
    ? [...team, { id: task.assignedFreelancerId, name: task.assignedFreelancer?.user?.name ?? 'Former member' }]
    : team

  const saveTitle = async () => {
    const next = title.trim()
    if (!next || next === task.title) { setTitle(task.title); setEditing(false); return }
    if (await onSave({ title: next })) setEditing(false)
  }

  return (
    <div className="group flex items-center gap-2 px-2 py-1.5 rounded-lg flex-wrap sm:flex-nowrap hover:bg-[var(--row-hover-bg)] transition-colors">
      <button type="button" onClick={() => onSave({ completed: !task.completed })} className="shrink-0"
        aria-label={task.completed ? `Mark "${task.title}" not done` : `Mark "${task.title}" done`}>
        {task.completed ? <CheckSquare size={16} style={{ color: 'var(--fg)' }} /> : <Square size={16} style={{ color: 'var(--text-muted)' }} />}
      </button>

      {editing ? (
        <input autoFocus className="input-field flex-1 py-1 text-sm" aria-label="Task title" value={title}
          onChange={e => setTitle(e.target.value)} onBlur={saveTitle}
          onKeyDown={e => {
            if (e.key === 'Enter') saveTitle()
            if (e.key === 'Escape') { setTitle(task.title); setEditing(false) }
          }} />
      ) : (
        <button type="button" onClick={() => setEditing(true)} title="Click to rename"
          className="flex-1 min-w-0 text-left text-sm truncate"
          style={{ color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.completed ? 'line-through' : 'none' }}>
          {task.title}
        </button>
      )}

      <InProgressChip task={task} />

      <select className="input-field py-1 text-xs w-32 shrink-0" aria-label={`Assignee for ${task.title}`}
        value={task.assignedFreelancerId ?? ''}
        onChange={e => onSave({ assignedFreelancerId: e.target.value || null })}>
        <option value="">Unassigned</option>
        {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>

      <select className="input-field py-1 text-xs w-32 shrink-0" aria-label={`Sprint for ${task.title}`}
        value={task.sprintId ?? ''}
        onChange={e => onSave({ sprintId: e.target.value || null })}>
        <option value="">Backlog</option>
        {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      {confirmDelete ? (
        <span className="flex items-center gap-2 text-xs shrink-0">
          <button type="button" onClick={onDelete} className="font-bold" style={{ color: 'var(--fg)' }}>Delete</button>
          <button type="button" onClick={() => setConfirmDelete(false)} style={{ color: 'var(--text-muted)' }}>Cancel</button>
        </span>
      ) : (
        <span className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
          <IconButton label={`Delete ${task.title}`} onClick={() => setConfirmDelete(true)}><Trash2 size={12} /></IconButton>
        </span>
      )}
    </div>
  )
}
