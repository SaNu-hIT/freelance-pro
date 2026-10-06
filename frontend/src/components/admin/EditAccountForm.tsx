'use client'

import { useState } from 'react'
import { Check, Clock, Copy, KeyRound, Trash2 } from 'lucide-react'
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

// Admin resets a password: the server generates a temporary one, shown here once to hand over.
// The user must choose their own at next login.
export function ResetPasswordForm({ userId }: { userId: string }) {
  const [temporary, setTemporary] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [emailed, setEmailed] = useState(false)

  const handleReset = async () => {
    setSaveError('')
    setSaving(true)
    try {
      const { data } = await usersApi.resetPassword(userId)
      setTemporary(data.temporaryPassword)
      setEmailed(!!data.emailed)
      setConfirming(false)
      setCopied(false)
    } catch (err) {
      setSaveError(apiError(err, 'Could not reset the password.'))
    } finally {
      setSaving(false)
    }
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(temporary); setCopied(true) } catch {}
  }

  return (
    <div className="space-y-3">
      {saveError && <ErrorBanner title="Password not reset" message={saveError} onClose={() => setSaveError('')} />}
      {temporary ? (
        <div className="rounded-lg p-4 space-y-2" style={{ border: '1px solid rgb(var(--fg-rgb) / 0.35)', background: 'rgb(var(--fg-rgb) / 0.05)' }}>
          <p className="text-mono-label text-[10px]">TEMPORARY PASSWORD · SHOWN ONCE</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-lg tracking-wider select-all" style={{ color: 'var(--fg)' }}>{temporary}</code>
            <button type="button" onClick={copy} className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 rounded text-xs">
              {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
            </button>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {emailed
              ? 'We also emailed it to them. '
              : 'The email could not be sent, so give this to them yourself. '}
            They will be asked to choose their own password when they sign in. It will not be shown again.
          </p>
          <button type="button" onClick={() => setTemporary('')} className="text-mono-label text-[10px] underline" style={{ color: 'var(--text-muted)' }}>
            DONE, HIDE IT
          </button>
        </div>
      ) : confirming ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Their current password stops working right away.</span>
          <button type="button" onClick={handleReset} disabled={saving}
            className="btn-primary flex items-center gap-2 px-4 py-2 rounded text-sm disabled:opacity-50">
            {saving ? <><Clock size={13} className="animate-spin" /> Resetting…</> : 'Yes, reset it'}
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="btn-ghost px-4 py-2 rounded text-sm">Cancel</button>
        </div>
      ) : (
        <>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Passwords are stored encrypted, so nobody can see them. Reset to get a temporary one to hand over.
          </p>
          <button type="button" onClick={() => setConfirming(true)}
            className="btn-ghost flex items-center gap-2 px-4 py-2 rounded text-sm">
            <KeyRound size={13} /> Reset password
          </button>
        </>
      )}
    </div>
  )
}

// Admin deletes a client or freelancer; the server refuses anyone with linked work and says why
export function DeleteUserButton({ user, onDeleted }: { user: Pick<User, 'id' | 'name'>; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    setDeleting(true)
    setError('')
    try {
      await usersApi.remove(user.id)
      onDeleted()
    } catch (err) {
      setError(apiError(err, 'Could not delete this account.'))
      setConfirming(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-3">
      {error && <ErrorBanner title="Not deleted" message={error} onClose={() => setError('')} />}
      {confirming ? (
        <div className="space-y-3">
          <p className="text-sm text-primary-ui">
            Delete <strong>{user.name}</strong>? Their account and login are removed. This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={handleDelete} disabled={deleting}
              className="btn-primary flex items-center gap-2 px-4 py-2 rounded text-sm disabled:opacity-50">
              {deleting ? <><Clock size={13} className="animate-spin" /> Deleting…</> : <><Trash2 size={13} /> Yes, delete</>}
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={deleting}
              className="btn-ghost px-4 py-2 rounded text-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)}
          className="btn-ghost flex items-center gap-2 px-4 py-2 rounded text-sm">
          <Trash2 size={13} /> Delete account
        </button>
      )}
    </div>
  )
}
