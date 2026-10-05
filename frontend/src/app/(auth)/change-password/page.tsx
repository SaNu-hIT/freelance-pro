'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, Clock } from 'lucide-react'
import { Wordmark } from '@/components/brand/SiteHeader'
import { usersApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { UserRole } from '@/lib/types'
import { apiError } from '@/lib/utils'
import ErrorBanner from '@/components/ui/ErrorBanner'

const roleRoutes: Record<UserRole, string> = { admin: '/admin', freelancer: '/freelancer', client: '/client' }

// After an admin reset, the user swaps the temporary password for their own before using the app
export default function ChangePasswordPage() {
  const router = useRouter()
  const { user, isAuthenticated, _hasHydrated, setUser, logout } = useAuthStore()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (_hasHydrated && (!isAuthenticated || !user)) router.replace('/login')
  }, [_hasHydrated, isAuthenticated, user, router])

  if (!_hasHydrated || !user) return null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (next.length < 8) return setError('Your new password must be at least 8 characters.')
    if (next !== confirm) return setError('The two new passwords do not match.')
    if (next === current) return setError('Choose a password different from the temporary one.')
    setSaving(true)
    try {
      await usersApi.changePassword(current, next)
      setUser({ ...user, mustChangePassword: false })
      router.replace(roleRoutes[user.role] ?? '/login')
    } catch (err) {
      setError(apiError(err, 'Could not change your password.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={submit} className="glass-card rounded-xl p-8 w-full max-w-md space-y-5">
        <Wordmark className="text-[var(--fg)]" />
        <div>
          <h1 className="text-display text-3xl">CHOOSE A NEW PASSWORD</h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            An admin reset your password. Enter the temporary password they gave you, then pick your own.
          </p>
        </div>
        {error && <ErrorBanner message={error} onClose={() => setError('')} />}
        <div>
          <label htmlFor="cp-current" className="label-field">Temporary password</label>
          <input id="cp-current" type="password" autoComplete="current-password" className="input-field" required
            value={current} onChange={e => setCurrent(e.target.value)} />
        </div>
        <div>
          <label htmlFor="cp-next" className="label-field">New password</label>
          <input id="cp-next" type="password" autoComplete="new-password" className="input-field" placeholder="At least 8 characters" required
            value={next} onChange={e => setNext(e.target.value)} />
        </div>
        <div>
          <label htmlFor="cp-confirm" className="label-field">Repeat new password</label>
          <input id="cp-confirm" type="password" autoComplete="new-password" className="input-field" required
            value={confirm} onChange={e => setConfirm(e.target.value)} />
        </div>
        <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 py-3 rounded text-sm disabled:opacity-50">
          {saving ? <><Clock size={14} className="animate-spin" /> Saving…</> : <><KeyRound size={14} /> Save and continue</>}
        </button>
        <button type="button" onClick={() => { logout(); router.replace('/login') }}
          className="w-full text-mono-label text-[10px] underline" style={{ color: 'var(--text-muted)' }}>
          LOG OUT INSTEAD
        </button>
      </form>
    </div>
  )
}
