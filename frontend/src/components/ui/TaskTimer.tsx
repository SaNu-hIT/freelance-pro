'use client'

import { useEffect, useState } from 'react'
import { ProjectTask } from '@/lib/types'

// Matches the worklog timer's 8 hour auto-pause; an older start is a timer that was never stopped
const RUNNING_MAX_MS = 8 * 3600 * 1000

export function isTaskRunning(task: Pick<ProjectTask, 'startedAt' | 'completed'>, now = Date.now()) {
  if (!task.startedAt || task.completed) return false
  const elapsed = now - new Date(task.startedAt).getTime()
  return elapsed >= 0 && elapsed < RUNNING_MAX_MS
}

// Open and marked in progress, either by hand or by a live timer
export function isTaskInProgress(task: Pick<ProjectTask, 'startedAt' | 'completed' | 'inProgressAt'>, now = Date.now()) {
  return !task.completed && (!!task.inProgressAt || isTaskRunning(task, now))
}

function fmtElapsed(ms: number) {
  const secs = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Live h:mm:ss since a start time, ticking every second
export function LiveElapsed({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  return <span className="font-mono tabular-nums">{fmtElapsed(now - new Date(since).getTime())}</span>
}

// "IN PROGRESS 0:12:33 · Name" chip; the clock shows only while a timer runs
export function InProgressChip({ task, showWho }: { task: ProjectTask; showWho?: boolean }) {
  if (!isTaskInProgress(task)) return null
  const running = isTaskRunning(task)
  const who = (running ? task.startedBy : task.assignedFreelancer ?? task.startedBy)?.user?.name
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold shrink-0"
      style={{ background: 'rgb(var(--fg-rgb) / 0.1)', border: '1px solid rgb(var(--fg-rgb) / 0.3)', color: 'var(--fg)' }}>
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--fg)' }} />
      IN PROGRESS {running && task.startedAt && <LiveElapsed since={task.startedAt} />}
      {showWho && who && <span style={{ color: 'var(--text-muted)' }}>· {who}</span>}
    </span>
  )
}
