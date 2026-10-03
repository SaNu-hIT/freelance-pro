import { ProjectStatus } from '@/lib/types'

// Brand allows no extra hues: states differ by fill.
// to do = outline · in progress = solid · blocked = hatched · done = struck at .55
const statusMap: Record<ProjectStatus, { cls: string; label: string }> = {
  new: { cls: 'status-new', label: 'New' },
  assigned: { cls: 'status-assigned', label: 'Assigned' },
  in_progress: { cls: 'status-progress', label: 'In Progress' },
  blocked: { cls: 'status-blocked', label: 'Blocked' },
  pending_approval: { cls: 'status-pending', label: 'Pending' },
  completed: { cls: 'status-completed', label: 'Completed' },
  delayed: { cls: 'status-delayed', label: 'Delayed' },
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const { cls, label } = statusMap[status]
  return <span className={`status-badge ${cls}`}>{label}</span>
}
