import { ProjectStatus } from '@/lib/types'

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
  return (
    <span className={`status-badge ${cls}`}>
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
      {label}
    </span>
  )
}
