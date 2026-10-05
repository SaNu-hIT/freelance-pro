'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Clock } from 'lucide-react'
import { tasksApi, worklogsApi } from '@/lib/api'
import { ProjectTask } from '@/lib/types'
import { apiError, localDate } from '@/lib/utils'
import { isTaskRunning } from '@/components/ui/TaskTimer'

interface ProjectHours { projectId: string; title: string; hours: number; weekHours: number; freelancers: number }
interface Summary { totalHours: number; weekHours: number; byProject: ProjectHours[] }

// Sunday 00:00 local, matching the freelancer dashboard's "This Week Hours"
function weekStartDate() {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  return localDate(d)
}

function fmt(h: number) {
  return `${Math.round(h * 10) / 10}h`
}

// Logged hours (total, this week, per project) plus time on timers still running, so it grows live.
// Admins see everyone's; a freelancer sees only their own (the API scopes both calls).
export function HoursSummary({ linkFor, showFreelancers }: {
  linkFor?: (projectId: string) => string
  showFreelancers?: boolean
}) {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [running, setRunning] = useState<ProjectTask[]>([])
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const load = () => Promise.all([worklogsApi.summary(weekStartDate()), tasksApi.running()])
      .then(([s, r]) => { setSummary(s.data); setRunning(r.data ?? []); setError('') })
      .catch(err => setError(apiError(err, 'Could not load hours.')))
    load()
    const refresh = setInterval(load, 60000)
    const tick = setInterval(() => setNow(Date.now()), 30000)
    return () => { clearInterval(refresh); clearInterval(tick) }
  }, [])

  // Unsaved time on running timers, per project
  const live = new Map<string, { title: string; hours: number }>()
  for (const t of running) {
    if (!t.startedAt || !isTaskRunning(t, now)) continue
    const h = (now - new Date(t.startedAt).getTime()) / 3600000
    const prev = live.get(t.projectId)
    live.set(t.projectId, { title: t.project?.title ?? 'Project', hours: (prev?.hours ?? 0) + h })
  }
  const liveTotal = [...live.values()].reduce((s, p) => s + p.hours, 0)

  const rows: (ProjectHours & { live: number })[] = (summary?.byProject ?? []).map(p => ({ ...p, live: live.get(p.projectId)?.hours ?? 0 }))
  for (const [projectId, p] of live) {
    if (!rows.some(r => r.projectId === projectId)) rows.push({ projectId, title: p.title, hours: 0, weekHours: 0, freelancers: 1, live: p.hours })
  }
  rows.sort((a, b) => (b.hours + b.live) - (a.hours + a.live))

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={13} style={{ color: 'var(--fg)' }} />
        <h2 className="text-mono-label text-xs tracking-widest">WORK HOURS</h2>
        {liveTotal > 0 && (
          <span className="text-mono-label text-[10px] inline-flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--fg)' }} />
            INCLUDES RUNNING TIMER
          </span>
        )}
      </div>
      {error ? (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{error}</p>
      ) : summary === null ? (
        <div className="h-16 rounded animate-pulse" style={{ background: 'var(--input-bg)' }} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-mono-label text-[10px] mb-1">TOTAL</p>
              <p className="text-2xl font-bold text-display" style={{ color: 'var(--fg)' }}>{fmt(summary.totalHours + liveTotal)}</p>
            </div>
            <div>
              <p className="text-mono-label text-[10px] mb-1">THIS WEEK</p>
              <p className="text-2xl font-bold text-display" style={{ color: 'var(--fg)' }}>{fmt(summary.weekHours + liveTotal)}</p>
            </div>
          </div>
          {rows.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No hours logged yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--input-bg)] max-h-80 overflow-y-auto pr-1">
              {rows.map(p => {
                const body = (
                  <div className="flex items-center gap-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary-ui truncate">{p.title}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {fmt(p.weekHours + p.live)} this week
                        {showFreelancers ? ` · ${p.freelancers} team member${p.freelancers === 1 ? '' : 's'}` : ''}
                      </p>
                    </div>
                    <span className="text-sm font-bold font-mono tabular-nums" style={{ color: 'var(--fg)' }}>{fmt(p.hours + p.live)}</span>
                  </div>
                )
                return (
                  <li key={p.projectId}>
                    {linkFor ? <Link href={linkFor(p.projectId)} className="block hover:opacity-80 transition-opacity">{body}</Link> : body}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
