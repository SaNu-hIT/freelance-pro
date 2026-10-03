import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// YYYY-MM-DD in the user's timezone. toISOString() gives the UTC date, which is
// yesterday's date for part of the morning east of UTC.
export function localDate(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// "9:30 AM – 12:00 PM" for a timer-tracked worklog, '' for hours entered by hand
export function sessionRange(w: { startedAt?: string | null; endedAt?: string | null }) {
  if (!w.startedAt || !w.endedAt) return ''
  const t = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${t(w.startedAt)} – ${t(w.endedAt)}`
}

// The API's error message (Nest sends a string or a list of validation messages), or the fallback
export function apiError(err: unknown, fallback: string) {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
  return (Array.isArray(msg) ? msg.join(', ') : msg) || fallback
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}
