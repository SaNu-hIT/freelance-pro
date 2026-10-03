'use client'

import { AlertCircle, X } from 'lucide-react'

export default function ErrorBanner({ title = 'Something went wrong', message, onClose }: {
  title?: string
  message: string
  onClose?: () => void
}) {
  if (!message) return null
  return (
    <div role="alert" className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl"
      style={{ background: 'rgb(var(--fg-rgb) / 0.08)', border: '1px solid rgb(var(--fg-rgb) / 0.3)' }}>
      <AlertCircle size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--fg)' }} />
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{title}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{message}</p>
      </div>
      {onClose && (
        <button onClick={onClose} aria-label="Dismiss" className="ml-auto shrink-0" style={{ color: 'var(--text-muted)' }}>
          <X size={13} />
        </button>
      )}
    </div>
  )
}
