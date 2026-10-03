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
