'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { Mail, Clock, ArrowLeft } from 'lucide-react'
import { Wordmark } from '@/components/brand/SiteHeader'
import { authApi } from '@/lib/api'
import { apiError } from '@/lib/utils'
import ErrorBanner from '@/components/ui/ErrorBanner'

// Anyone who forgot their password asks for a reset link by email
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      await authApi.forgotPassword(email.trim())
      setSent(true)
    } catch (err) {
      setError(apiError(err, 'Could not send the reset link. Try again in a minute.'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-card rounded-xl p-8 w-full max-w-md space-y-5">
        <Wordmark className="text-[var(--fg)]" />
        {sent ? (
          <>
            <div>
              <h1 className="text-display text-3xl">CHECK YOUR EMAIL</h1>
              <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                If an account uses <strong className="text-primary-ui">{email.trim()}</strong>, we sent it a link to choose a new password.
                The link works once and expires in 1 hour. Check your spam folder if it does not arrive in a few minutes.
              </p>
            </div>
            <button type="button" onClick={() => setSent(false)} className="text-mono-label text-[10px] underline" style={{ color: 'var(--text-muted)' }}>
              USE A DIFFERENT EMAIL
            </button>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div>
              <h1 className="text-display text-3xl">FORGOT YOUR PASSWORD?</h1>
              <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                Enter the email you sign in with and we will send you a link to choose a new password.
              </p>
            </div>
            {error && <ErrorBanner message={error} onClose={() => setError('')} />}
            <div>
              <label htmlFor="fp-email" className="label-field">Email address</label>
              <input id="fp-email" type="email" autoComplete="email" className="input-field" placeholder="you@example.com" required
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <button type="submit" disabled={sending} className="btn-primary w-full flex items-center justify-center gap-2 py-3 rounded text-sm disabled:opacity-50">
              {sending ? <><Clock size={14} className="animate-spin" /> Sending…</> : <><Mail size={14} /> Send reset link</>}
            </button>
          </form>
        )}
        <Link href="/login" className="flex items-center justify-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={12} /> Back to sign in
        </Link>
      </div>
    </div>
  )
}
