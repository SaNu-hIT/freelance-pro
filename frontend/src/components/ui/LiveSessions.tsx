'use client'

import { useEffect, useState } from 'react'
import { tasksApi } from '@/lib/api'
import { ProjectTask } from '@/lib/types'
import { LiveElapsed, isTaskRunning } from '@/components/ui/TaskTimer'

// Timer sessions running right now, as activity-feed cards; renders nothing when none are running.
// Admins see everyone's; a freelancer sees only their own (the API scopes it).
export function LiveSessions({ showWho }: { showWho?: boolean }) {
  const [tasks, setTasks] = useState<ProjectTask[]>([])

  useEffect(() => {
    const load = () => tasksApi.running().then(res => setTasks(res.data ?? [])).catch(() => {})
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [])

  const live = tasks.filter(t => isTaskRunning(t))
  if (live.length === 0) return null

  return (
    <div className="space-y-3 mb-3">
      {live.map(t => (
        <div key={t.id} className="glass-card-dark rounded-lg p-4" style={{ borderColor: 'rgb(var(--fg-rgb) / 0.4)' }}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-mono-label inline-flex items-center gap-1.5 mb-1" style={{ fontSize: '10px', color: 'var(--fg)' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--fg)' }} />
                WORKING NOW
              </p>
              <p className="text-primary-ui text-sm font-semibold truncate">
                {showWho ? `${t.startedBy?.user?.name ?? 'Someone'} · ` : ''}{t.title}
              </p>
              <p className="text-mono-label mt-0.5 truncate" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {t.project?.title ?? 'Project'}
              </p>
            </div>
            {t.startedAt && (
              <span className="text-sm font-bold shrink-0" style={{ color: 'var(--fg)' }}><LiveElapsed since={t.startedAt} /></span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
