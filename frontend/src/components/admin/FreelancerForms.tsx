'use client'

import { useState } from 'react'
import { Check, Clock, UserPlus } from 'lucide-react'
import { freelancersApi, usersApi } from '@/lib/api'
import { apiError } from '@/lib/utils'
import { FreelancerProfile } from '@/lib/types'
import ErrorBanner from '@/components/ui/ErrorBanner'
import { FieldError, FieldErrors, invalidStyle } from '@/components/admin/NewClientForm'

const EMPTY_PROFILE = { skills: '', experience: '0', hourlyRate: '0', track: 'professional', bio: '', portfolioUrl: '' }
type ProfileForm = typeof EMPTY_PROFILE

function validateProfile(p: ProfileForm): FieldErrors {
  const e: FieldErrors = {}
  if (p.experience === '' || Number(p.experience) < 0) e.experience = 'Experience must be 0 or more years.'
  if (p.hourlyRate === '' || Number(p.hourlyRate) < 0) e.hourlyRate = 'Rate must be 0 or more.'
  if (p.portfolioUrl.trim() && !/^https?:\/\/\S+$/.test(p.portfolioUrl.trim())) e.portfolioUrl = 'Use a full http(s) link.'
  return e
}

const profilePayload = (p: ProfileForm) => ({
  skills: p.skills.split(',').map(s => s.trim()).filter(Boolean),
  experience: Number(p.experience),
  hourlyRate: Number(p.hourlyRate),
  track: p.track as 'professional' | 'intern',
  bio: p.bio.trim(),
  portfolioUrl: p.portfolioUrl.trim(),
})

function ProfileFields({ form, errors, setField }: {
  form: ProfileForm
  errors: FieldErrors
  setField: (key: keyof ProfileForm, value: string) => void
}) {
  return (
    <>
      <div>
        <label htmlFor="fl-skills" className="label-field">Skills</label>
        <input id="fl-skills" className="input-field" placeholder="React, Node.js, Figma"
          value={form.skills} onChange={e => setField('skills', e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="fl-experience" className="label-field">Experience (yrs)</label>
          <input id="fl-experience" type="number" min={0} className="input-field"
            aria-invalid={!!errors.experience} aria-describedby="fl-experience-error" style={invalidStyle(errors.experience)}
            value={form.experience} onChange={e => setField('experience', e.target.value)} />
          <FieldError id="fl-experience-error" message={errors.experience} />
        </div>
        <div>
          <label htmlFor="fl-rate" className="label-field">Hourly rate</label>
          <input id="fl-rate" type="number" min={0} className="input-field"
            aria-invalid={!!errors.hourlyRate} aria-describedby="fl-rate-error" style={invalidStyle(errors.hourlyRate)}
            value={form.hourlyRate} onChange={e => setField('hourlyRate', e.target.value)} />
          <FieldError id="fl-rate-error" message={errors.hourlyRate} />
        </div>
        <div>
          <label htmlFor="fl-track" className="label-field">Track</label>
          <select id="fl-track" className="input-field" value={form.track} onChange={e => setField('track', e.target.value)}>
            <option value="professional">Professional</option>
            <option value="intern">Intern</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="fl-portfolio" className="label-field">Portfolio URL</label>
        <input id="fl-portfolio" className="input-field" placeholder="https://"
          aria-invalid={!!errors.portfolioUrl} aria-describedby="fl-portfolio-error" style={invalidStyle(errors.portfolioUrl)}
          value={form.portfolioUrl} onChange={e => setField('portfolioUrl', e.target.value)} />
        <FieldError id="fl-portfolio-error" message={errors.portfolioUrl} />
      </div>
      <div>
        <label htmlFor="fl-bio" className="label-field">Bio</label>
        <textarea id="fl-bio" rows={3} className="input-field"
          value={form.bio} onChange={e => setField('bio', e.target.value)} />
      </div>
    </>
  )
}

function useFieldForm<T extends Record<string, string>>(initial: T) {
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState<FieldErrors>({})
  const setField = (key: keyof T, value: string) => {
    setForm(f => ({ ...f, [key]: value }))
    setErrors(e => (e[key as string] ? { ...e, [key]: undefined } : e))
  }
  return { form, setForm, errors, setErrors, setField }
}

// Admin adds a vetted freelancer straight to the team, skipping onboarding
export function NewFreelancerForm({ onCreated }: { onCreated: (profile: FreelancerProfile) => void }) {
  const initial = { name: '', email: '', phone: '', password: '', ...EMPTY_PROFILE }
  const { form, setForm, errors, setErrors, setField } = useFieldForm(initial)
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    const found = validateProfile(form)
    if (!form.name.trim()) found.name = 'Name is required.'
    if (!form.email.trim()) found.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) found.email = 'Enter a valid email.'
    if (form.password.length < 8) found.password = 'Temporary password must be at least 8 characters.'
    setErrors(found)
    setSaveError('')
    if (Object.keys(found).length) return
    setSaving(true)
    try {
      const { bio, portfolioUrl, ...rest } = profilePayload(form)
      const { data } = await usersApi.createFreelancer({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
        ...rest,
        ...(bio ? { bio } : {}),
        ...(portfolioUrl ? { portfolioUrl } : {}),
      })
      setForm(initial)
      onCreated(data)
    } catch (err) {
      setSaveError(apiError(err, 'Could not add the freelancer.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {saveError && <ErrorBanner title="Freelancer not added" message={saveError} onClose={() => setSaveError('')} />}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="fl-name" className="label-field">Name *</label>
          <input id="fl-name" className="input-field"
            aria-invalid={!!errors.name} aria-describedby="fl-name-error" style={invalidStyle(errors.name)}
            value={form.name} onChange={e => setField('name', e.target.value)} />
          <FieldError id="fl-name-error" message={errors.name} />
        </div>
        <div>
          <label htmlFor="fl-email" className="label-field">Email *</label>
          <input id="fl-email" type="email" className="input-field"
            aria-invalid={!!errors.email} aria-describedby="fl-email-error" style={invalidStyle(errors.email)}
            value={form.email} onChange={e => setField('email', e.target.value)} />
          <FieldError id="fl-email-error" message={errors.email} />
        </div>
        <div>
          <label htmlFor="fl-phone" className="label-field">Phone</label>
          <input id="fl-phone" className="input-field" placeholder="Optional"
            value={form.phone} onChange={e => setField('phone', e.target.value)} />
        </div>
        <div>
          <label htmlFor="fl-password" className="label-field">Temporary password *</label>
          <input id="fl-password" type="text" autoComplete="off" className="input-field" placeholder="At least 8 characters"
            aria-invalid={!!errors.password} aria-describedby="fl-password-error" style={invalidStyle(errors.password)}
            value={form.password} onChange={e => setField('password', e.target.value)} />
          <FieldError id="fl-password-error" message={errors.password} />
        </div>
      </div>
      <ProfileFields form={form} errors={errors} setField={setField} />
      <button type="button" onClick={handleCreate} disabled={saving}
        className="btn-primary flex items-center gap-2 px-4 py-2 rounded text-sm disabled:opacity-50">
        {saving ? <><Clock size={13} className="animate-spin" /> Adding…</> : <><UserPlus size={13} /> Add freelancer</>}
      </button>
    </div>
  )
}

// Admin edits a freelancer's skills, experience, rate, track, bio and portfolio
export function EditFreelancerProfileForm({ profile, onSaved }: {
  profile: FreelancerProfile
  onSaved: (profile: FreelancerProfile) => void
}) {
  const { form, errors, setErrors, setField } = useFieldForm({
    skills: profile.skills.join(', '),
    experience: String(profile.experience ?? 0),
    hourlyRate: String(profile.hourlyRate ?? 0),
    track: profile.track ?? 'professional',
    bio: profile.bio ?? '',
    portfolioUrl: profile.portfolioUrl ?? '',
  })
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    const found = validateProfile(form)
    setErrors(found)
    setSaveError('')
    setSaved(false)
    if (Object.keys(found).length) return
    setSaving(true)
    try {
      const { data } = await freelancersApi.update(profile.id, profilePayload(form))
      setSaved(true)
      onSaved(data)
    } catch (err) {
      setSaveError(apiError(err, 'Could not save the profile.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {saveError && <ErrorBanner title="Profile not saved" message={saveError} onClose={() => setSaveError('')} />}
      <ProfileFields form={form} errors={errors} setField={(k, v) => { setField(k, v); setSaved(false) }} />
      <button type="button" onClick={handleSave} disabled={saving}
        className="btn-primary flex items-center gap-2 px-4 py-2 rounded text-sm disabled:opacity-50">
        {saving ? <><Clock size={13} className="animate-spin" /> Saving…</> : saved ? <><Check size={13} /> Saved</> : 'Save profile'}
      </button>
    </div>
  )
}
