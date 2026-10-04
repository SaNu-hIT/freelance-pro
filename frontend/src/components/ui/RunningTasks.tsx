'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { tasksApi } from '@/lib/api'
import { ProjectTask } from '@/lib/types'
import { apiError } from '@/lib/utils'
import { LiveElapsed } from '@/components/ui/TaskTimer'

// Tasks with a live worklog timer, refreshed every 30 seconds.
// Admins see everyone's; a freelancer sees only their own (the API scopes it).
export function RunningTasks({ linkFor, showWho, emptyText }: {
  linkFor: (task: ProjectTask) => string
  showWho?: boolean
  emptyText: string
}) {
  const [tasks, setTasks] = useState<ProjectTask[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = () => tasksApi.running()
      .then(res => { setTasks(res.data ?? []); setError('') })
      .catch(err => setError(apiError(err, 'Could not load running tasks.')))
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: tasks?.length ? 'var(--fg)' : 'var(--text-muted)' }} />
        <h2 className="text-mono-label text-xs tracking-widest">IN PROGRESS NOW</h2>
        {!!tasks?.length && <span className="text-mono-label text-[10px]" style={{ color: 'var(--text-muted)' }}>{tasks.length}</span>}
      </div>
      {error ? (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{error}</p>
      ) : tasks === null ? (
        <div className="h-10 rounded animate-pulse" style={{ background: 'var(--input-bg)' }} />
      ) : tasks.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{emptyText}</p>
      ) : (
        <ul className="divide-y divide-[var(--input-bg)]">
          {tasks.map(task => (
            <li key={task.id}>
              <Link href={linkFor(task)} className="flex items-center gap-3 py-2.5 hover:opacity-80 transition-opacity">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary-ui truncate">{task.title}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {task.project?.title ?? 'Project'}
                    {showWho && task.startedBy?.user?.name ? ` · ${task.startedBy.user.name}` : ''}
                  </p>
                </div>
                {task.startedAt && (
                  <span className="text-sm font-bold" style={{ color: 'var(--fg)' }}><LiveElapsed since={task.startedAt} /></span>
                )}
                <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
