'use client'

import { useState } from 'react'
import { Check, Clock, KeyRound } from 'lucide-react'
import { usersApi } from '@/lib/api'
import { apiError } from '@/lib/utils'
import { User } from '@/lib/types'
import ErrorBanner from '@/components/ui/ErrorBanner'
import { FieldError, FieldErrors, invalidStyle } from '@/components/admin/NewClientForm'

type Account = Pick<User, 'id' | 'name' | 'email' | 'phone' | 'company'>

// Admin edits another user's name, email, phone and (for clients) company
export function EditAccountForm({ user, showCompany, onSaved }: {
  user: Account
  showCompany?: boolean
  onSaved: (user: User) => void
}) {
  const [form, setForm] = useState({
    name: user.name, email: user.email, phone: user.phone ?? '', company: user.company ?? '',
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const setField = (key: keyof typeof form, value: string) => {
    setForm(f => ({ ...f, [key]: value }))
    setErrors(e => (e[key] ? { ...e, [key]: undefined } : e))
    setSaved(false)
  }

  const handleSave = async () => {
    const found: FieldErrors = {}
    if (!form.name.trim()) found.name = 'Name is required.'
    if (!form.email.trim()) found.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) found.email = 'Enter a valid email.'
    setErrors(found)
    setSaveError('')
    if (Object.keys(found).length) return
    setSaving(true)
    try {
      const { data } = await usersApi.update(user.id, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        ...(showCompany ? { company: form.company.trim() } : {}),
      })
      setSaved(true)
      onSaved(data)
    } catch (err) {
      setSaveError(apiError(err, 'Could not save these details.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {saveError && <ErrorBanner title="Details not saved" message={saveError} onClose={() => setSaveError('')} />}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="acct-name" className="label-field">Name *</label>
          <input id="acct-name" className="input-field"
            aria-invalid={!!errors.name} aria-describedby="acct-name-error" style={invalidStyle(errors.name)}
            value={form.name} onChange={e => setField('name', e.target.value)} />
          <FieldError id="acct-name-error" message={errors.name} />
        </div>
        <div>
          <label htmlFor="acct-email" className="label-field">Email *</label>
          <input id="acct-email" type="email" className="input-field"
            aria-invalid={!!errors.email} aria-describedby="acct-email-error" style={invalidStyle(errors.email)}
            value={form.email} onChange={e => setField('email', e.target.value)} />
          <FieldError id="acct-email-error" message={errors.email} />
        </div>
        {showCompany && (
          <div>
            <label htmlFor="acct-company" className="label-field">Company</label>
            <input id="acct-company" className="input-field" placeholder="Optional"
              value={form.company} onChange={e => setField('company', e.target.value)} />
          </div>
        )}
        <div>
          <label htmlFor="acct-phone" className="label-field">Phone</label>
          <input id="acct-phone" className="input-field" placeholder="Optional"
            value={form.phone} onChange={e => setField('phone', e.target.value)} />
        </div>
      </div>
      <button type="button" onClick={handleSave} disabled={saving}
        className="btn-primary flex items-center gap-2 px-4 py-2 rounded text-sm disabled:opacity-50">
        {saving ? <><Clock size={13} className="animate-spin" /> Saving…</> : saved ? <><Check size={13} /> Saved</> : 'Save details'}
      </button>
    </div>
  )
}

// Admin sets a new password for a user who is locked out
export function ResetPasswordForm({ userId }: { userId: string }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const handleReset = async () => {
    setSaveError('')
    if (password.length < 8) { setError('New password must be at least 8 characters.'); return }
    setSaving(true)
    try {
      await usersApi.resetPassword(userId, password)
      setPassword('')
      setDone(true)
    } catch (err) {
      setSaveError(apiError(err, 'Could not reset the password.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {saveError && <ErrorBanner title="Password not reset" message={saveError} onClose={() => setSaveError('')} />}
      <div>
        <label htmlFor="reset-password" className="label-field">New password</label>
        <input id="reset-password" type="text" autoComplete="off" className="input-field" placeholder="At least 8 characters"
          aria-invalid={!!error} aria-describedby="reset-password-error reset-password-hint" style={invalidStyle(error)}
          value={password} onChange={e => { setPassword(e.target.value); setError(''); setDone(false) }} />
        <FieldError id="reset-password-error" message={error} />
        <p id="reset-password-hint" className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
          {done ? 'Password reset. Share the new one with them.' : 'Their old password stops working right away.'}
        </p>
      </div>
      <button type="button" onClick={handleReset} disabled={saving}
        className="btn-ghost flex items-center gap-2 px-4 py-2 rounded text-sm disabled:opacity-50">
        {saving ? <><Clock size={13} className="animate-spin" /> Resetting…</> : <><KeyRound size={13} /> Reset password</>}
      </button>
    </div>
  )
}
