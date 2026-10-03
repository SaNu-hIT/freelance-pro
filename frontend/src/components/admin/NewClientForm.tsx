'use client'

import { useState } from 'react'
import { AlertCircle, Clock, UserPlus } from 'lucide-react'
import { usersApi } from '@/lib/api'
import { apiError } from '@/lib/utils'
import { User } from '@/lib/types'
import ErrorBanner from '@/components/ui/ErrorBanner'

export type FieldErrors = Partial<Record<string, string>>

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="flex items-center gap-1.5 text-xs font-semibold mt-1.5" style={{ color: 'var(--fg)' }}>
      <AlertCircle size={12} className="shrink-0" /> {message}
    </p>
  )
}

export const invalidStyle = (bad?: string) => bad ? { borderColor: 'var(--fg)', boxShadow: '0 0 0 1px var(--fg)' } : undefined

const EMPTY_CLIENT = { name: '', email: '', company: '', phone: '', password: '' }
type ClientForm = typeof EMPTY_CLIENT

// Mirrors the backend CreateClientDto rules
function validateClient(c: ClientForm): FieldErrors {
  const e: FieldErrors = {}
  if (!c.name.trim()) e.name = 'Name is required.'
  if (!c.email.trim()) e.email = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim())) e.email = 'Enter a valid email.'
  if (c.password.length < 8) e.password = 'Temporary password must be at least 8 characters.'
  return e
}

// Admin creates a client account; used on the Clients page and inside the project form
export default function NewClientForm({ onCreated }: { onCreated: (client: User & { projectCount: number }) => void }) {
  const [form, setForm] = useState(EMPTY_CLIENT)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  const setField = (key: keyof ClientForm, value: string) => {
    setForm(f => ({ ...f, [key]: value }))
    setErrors(e => (e[key] ? { ...e, [key]: undefined } : e))
  }

  const handleCreate = async () => {
    const found = validateClient(form)
    setErrors(found)
    setSaveError('')
    if (Object.keys(found).length) return
    setSaving(true)
    try {
      const { data } = await usersApi.createClient({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        ...(form.company.trim() ? { company: form.company.trim() } : {}),
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
      })
      setForm(EMPTY_CLIENT)
      onCreated(data)
    } catch (err) {
      setSaveError(apiError(err, 'Could not create the client.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {saveError && <ErrorBanner title="Client not created" message={saveError} onClose={() => setSaveError('')} />}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="client-name" className="label-field">Name *</label>
          <input id="client-name" className="input-field" placeholder="Contact or company name"
            aria-invalid={!!errors.name} aria-describedby="client-name-error" style={invalidStyle(errors.name)}
            value={form.name} onChange={e => setField('name', e.target.value)} />
          <FieldError id="client-name-error" message={errors.name} />
        </div>
        <div>
          <label htmlFor="client-email" className="label-field">Email *</label>
          <input id="client-email" type="email" className="input-field" placeholder="client@company.com"
            aria-invalid={!!errors.email} aria-describedby="client-email-error" style={invalidStyle(errors.email)}
            value={form.email} onChange={e => setField('email', e.target.value)} />
          <FieldError id="client-email-error" message={errors.email} />
        </div>
        <div>
          <label htmlFor="client-company" className="label-field">Company</label>
          <input id="client-company" className="input-field" placeholder="Optional"
            value={form.company} onChange={e => setField('company', e.target.value)} />
        </div>
        <div>
          <label htmlFor="client-phone" className="label-field">Phone</label>
          <input id="client-phone" className="input-field" placeholder="Optional"
            value={form.phone} onChange={e => setField('phone', e.target.value)} />
        </div>
      </div>
      <div>
        <label htmlFor="client-password" className="label-field">Temporary password *</label>
        <input id="client-password" type="text" autoComplete="off" className="input-field" placeholder="At least 8 characters"
          aria-invalid={!!errors.password} aria-describedby="client-password-error client-password-hint" style={invalidStyle(errors.password)}
          value={form.password} onChange={e => setField('password', e.target.value)} />
        <FieldError id="client-password-error" message={errors.password} />
        <p id="client-password-hint" className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
          Share this with the client. They can change it in their account settings.
        </p>
      </div>
      <button type="button" onClick={handleCreate} disabled={saving}
        className="btn-primary flex items-center gap-2 px-4 py-2 rounded text-sm disabled:opacity-50">
        {saving ? <><Clock size={13} className="animate-spin" /> Creating…</> : <><UserPlus size={13} /> Create client</>}
      </button>
    </div>
  )
}
