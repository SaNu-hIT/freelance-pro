'use client'

import { useState, FormEvent, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { KeyRound, Clock, ArrowRight } from 'lucide-react'
import { Wordmark } from '@/components/brand/SiteHeader'
import { authApi } from '@/lib/api'
import { apiError } from '@/lib/utils'
import ErrorBanner from '@/components/ui/ErrorBanner'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPassword />
    </Suspense>
  )
}

// Opened from the reset email: the token in the link lets the user set a new password once
function ResetPassword() {
  const token = useSearchParams().get('token') ?? ''
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (next.length < 8) return setError('Your new password must be at least 8 characters.')
    if (next !== confirm) return setError('The two passwords do not match.')
    setSaving(true)
    try {
      await authApi.resetPassword(token, next)
      setDone(true)
    } catch (err) {
      setError(apiError(err, 'Could not change your password.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-card rounded-xl p-8 w-full max-w-md space-y-5">
        <Wordmark className="text-[var(--fg)]" />
        {done ? (
          <>
            <div>
              <h1 className="text-display text-3xl">PASSWORD CHANGED</h1>
              <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Sign in with your new password.</p>
            </div>
            <Link href="/login" className="btn-primary w-full flex items-center justify-center gap-2 py-3 rounded text-sm">
              <ArrowRight size={14} /> Sign in
            </Link>
          </>
        ) : !token ? (
          <>
            <div>
              <h1 className="text-display text-3xl">LINK INCOMPLETE</h1>
              <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                This page needs the link from your reset email. Open the link from the email again, or ask for a new one.
              </p>
            </div>
            <Link href="/forgot-password" className="btn-primary w-full flex items-center justify-center gap-2 py-3 rounded text-sm">
              Send me a new link
            </Link>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div>
              <h1 className="text-display text-3xl">CHOOSE A NEW PASSWORD</h1>
              <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Pick a password you have not used here before.</p>
            </div>
            {error && (
              <ErrorBanner message={error} onClose={() => setError('')} />
            )}
            {error.includes('expired') && (
              <Link href="/forgot-password" className="block text-xs underline" style={{ color: 'var(--fg)' }}>Send me a new link</Link>
            )}
            <div>
              <label htmlFor="rp-next" className="label-field">New password</label>
              <input id="rp-next" type="password" autoComplete="new-password" className="input-field" placeholder="At least 8 characters" required
                value={next} onChange={e => setNext(e.target.value)} />
            </div>
            <div>
              <label htmlFor="rp-confirm" className="label-field">Repeat new password</label>
              <input id="rp-confirm" type="password" autoComplete="new-password" className="input-field" required
                value={confirm} onChange={e => setConfirm(e.target.value)} />
            </div>
            <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 py-3 rounded text-sm disabled:opacity-50">
              {saving ? <><Clock size={14} className="animate-spin" /> Saving…</> : <><KeyRound size={14} /> Save new password</>}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
