'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useAuthStore, useCurrencySymbol } from '@/lib/store'
import { useFreelancerStore, AvailabilityConfig, DayKey, DEFAULT_AVAILABILITY } from '@/lib/freelancerStore'
import { freelancersApi } from '@/lib/api'
import { apiError } from '@/lib/utils'
import ErrorBanner from '@/components/ui/ErrorBanner'
import {
  CheckCircle, X, Clock, Calendar, Globe, Zap,
  Shield, AlertTriangle, CheckSquare, Square, Lock,
} from 'lucide-react'

const EMPTY_PROFILE = {
  bio: '',
  skills: [] as string[],
  experience: 0,
  hourlyRate: 0,
  skillInput: '',
}

const DAYS: { key: DayKey; label: string; short: string }[] = [
  { key: 'mon', label: 'Monday',    short: 'Mon' },
  { key: 'tue', label: 'Tuesday',   short: 'Tue' },
  { key: 'wed', label: 'Wednesday', short: 'Wed' },
  { key: 'thu', label: 'Thursday',  short: 'Thu' },
  { key: 'fri', label: 'Friday',    short: 'Fri' },
  { key: 'sat', label: 'Saturday',  short: 'Sat' },
  { key: 'sun', label: 'Sunday',    short: 'Sun' },
]

const TIMEZONES = [
  'UTC-8:00 (PST)', 'UTC-5:00 (EST)', 'UTC+0:00 (GMT)',
  'UTC+1:00 (CET)', 'UTC+3:00 (EAT)', 'UTC+5:30 (IST)',
  'UTC+7:00 (WIB)', 'UTC+8:00 (CST)', 'UTC+9:00 (JST)', 'UTC+10:00 (AEST)',
]

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function FreelancerProfilePage() {
  const { user } = useAuthStore()
  const curr = useCurrencySymbol()

  const userId = user?.id ?? 'demo-freelancer'

  /* ── profile state ── */
  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [memberSince, setMemberSince] = useState<string | null>(null)
  const [saved,   setSaved]   = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')

  /* ── approval (derived from API, no store) ── */
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [rejectionReason, setRejectionReason] = useState<string | undefined>()
  const [profileId, setProfileId] = useState<string | null>(null)

  /* ── availability ── */
  const storeSetAvail = useFreelancerStore(s => s.setAvailability)
  const [avail, setAvail] = useState<AvailabilityConfig>(DEFAULT_AVAILABILITY)
  const [availSaved,  setAvailSaved]  = useState(false)
  const [availSaving, setAvailSaving] = useState(false)
  const [availError,  setAvailError]  = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await freelancersApi.getAll()
        const list = res.data?.data ?? res.data ?? []
        const fp = Array.isArray(list) ? list[0] : list
        if (!fp) { setLoadError('No team member profile was found for your account.'); return }
        setProfileId(fp.id ?? null)
        setProfile({
          bio: fp.bio ?? '',
          skills: fp.skills ?? [],
          // decimals arrive as strings
          experience: Number(fp.experience) || 0,
          hourlyRate: Number(fp.hourlyRate) || 0,
          skillInput: '',
        })
        setMemberSince(fp.user?.createdAt ?? fp.createdAt ?? null)
        const stage = fp.onboardingStage ?? fp.status
        if (stage === 'approved' || fp.status === 'active') {
          setApprovalStatus('approved')
        } else if (stage === 'rejected' || fp.status === 'inactive') {
          setApprovalStatus('rejected')
          setRejectionReason(fp.rejectionReason ?? undefined)
        }
        // An empty body means no schedule has been saved yet: start from the default
        const aRes = await freelancersApi.getAvailability(fp.id)
        if (aRes.data) setAvail({ ...DEFAULT_AVAILABILITY, ...(aRes.data as AvailabilityConfig) })
      } catch (err) {
        setLoadError(apiError(err, 'Could not load your profile.'))
      }
    }
    load()
  }, [userId])

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  /* ── profile handlers ── */
  function addSkill(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && profile.skillInput.trim()) {
      e.preventDefault()
      const skill = profile.skillInput.trim().replace(/,$/, '')
      if (!profile.skills.includes(skill)) {
        setProfile(p => ({ ...p, skills: [...p.skills, skill], skillInput: '' }))
      } else {
        setProfile(p => ({ ...p, skillInput: '' }))
      }
    }
  }
  function removeSkill(skill: string) {
    setProfile(p => ({ ...p, skills: p.skills.filter(s => s !== skill) }))
  }
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!profileId) return
    if (!Number.isFinite(profile.experience) || !Number.isFinite(profile.hourlyRate)) {
      setSaveError('Experience and hourly rate must be numbers.')
      return
    }
    setSaving(true); setSaveError('')
    try {
      await freelancersApi.update(profileId, {
        bio: profile.bio,
        skills: profile.skills,
        experience: profile.experience,
        hourlyRate: profile.hourlyRate,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setSaveError(apiError(err, 'Could not save your profile.'))
    } finally {
      setSaving(false)
    }
  }

  /* ── availability handlers ── */
  function toggleDay(day: DayKey) {
    setAvail(a => ({
      ...a,
      schedule: { ...a.schedule, [day]: { ...a.schedule[day], enabled: !a.schedule[day].enabled } },
    }))
  }
  function setDayTime(day: DayKey, field: 'from' | 'to', val: string) {
    setAvail(a => ({
      ...a,
      schedule: { ...a.schedule, [day]: { ...a.schedule[day], [field]: val } },
    }))
  }
  async function handleSaveAvail(e: React.FormEvent) {
    e.preventDefault()
    if (!profileId) return
    setAvailSaving(true); setAvailError('')
    try {
      // Rejects (and reverts the store copy) when the save fails
      await storeSetAvail(profileId, avail)
      setAvailSaved(true)
      setTimeout(() => setAvailSaved(false), 3000)
    } catch (err) {
      setAvailError(apiError(err, 'Could not save your availability.'))
    } finally {
      setAvailSaving(false)
    }
  }
  function resetAvail() { setAvail(DEFAULT_AVAILABILITY) }

  /* ── computed ── */
  const enabledDays   = DAYS.filter(d => avail.schedule[d.key].enabled)
  const weeklySlotHrs = enabledDays.reduce((acc, d) => {
    const slot  = avail.schedule[d.key]
    const [fh, fm] = slot.from.split(':').map(Number)
    const [th, tm] = slot.to.split(':').map(Number)
    const hrs = Math.max(0, (th * 60 + tm - fh * 60 - fm) / 60)
    return acc + hrs
  }, 0)

  const setupSteps = [
    { label: 'Write a bio', hint: 'At least 80 characters on what you build and for whom.', done: profile.bio.trim().length >= 80 },
    { label: 'Add 3 or more skills', hint: 'Languages, frameworks and tools you use day to day.', done: profile.skills.length >= 3 },
    { label: 'Set your experience', hint: 'Years of paid work in your main skill.', done: profile.experience > 0 },
    { label: 'Set your hourly rate', hint: 'Used to match you with project budgets.', done: profile.hourlyRate > 0 },
  ]

  /* ── approval badge ── */
  const approvalBg    = approvalStatus === 'approved'
    ? { bg: 'rgb(var(--fg-rgb) / 0.06)', border: 'rgb(var(--fg-rgb) / 0.25)', color: 'var(--fg)', icon: <CheckSquare size={18} /> }
    : approvalStatus === 'rejected'
    ? { bg: 'rgb(var(--fg-rgb) / 0.06)', border: 'rgb(var(--fg-rgb) / 0.25)', color: 'var(--fg)', icon: <AlertTriangle size={18} /> }
    : { bg: 'rgb(var(--fg-rgb) / 0.06)', border: 'rgb(var(--fg-rgb) / 0.25)', color: 'var(--fg)', icon: <Clock size={18} /> }

  return (
    <DashboardLayout allowedRoles={['freelancer']}>
      <div className="space-y-6">

        {/* ── Page header ── */}
        <div>
          <p className="text-mono-label mb-1" style={{ color: 'var(--text-muted)' }}>TEAM MEMBER</p>
          <h1 className="text-display text-4xl text-primary-ui">MY PROFILE</h1>
        </div>

        {loadError && <ErrorBanner title="Profile failed to load" message={loadError} />}

        {/* ── Approval status banner ── */}
        <div className="rounded-2xl p-5 flex items-start gap-4"
          style={{ background: approvalBg.bg, border: `1px solid ${approvalBg.border}` }}>
          <div className="shrink-0 mt-0.5" style={{ color: approvalBg.color }}>
            {approvalBg.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold text-sm" style={{ color: approvalBg.color }}>
                {approvalStatus === 'approved' ? 'Application Approved — You\'re Active!'
                  : approvalStatus === 'rejected' ? 'Application Not Approved'
                  : 'Application Under Review'}
              </span>
              <span className="text-mono-label text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: `color-mix(in srgb, ${approvalBg.color} 9%, transparent)`, border: `1px solid ${approvalBg.border}`, color: approvalBg.color }}>
                {approvalStatus.toUpperCase()}
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {approvalStatus === 'approved'
                ? `Welcome to FreelancePro! Your profile is live and you can now be assigned to projects.`
                : approvalStatus === 'rejected'
                ? rejectionReason ?? 'Your application was not approved at this time.'
                : 'Our team is reviewing your profile, portfolio, and skills. You\'ll be notified once a decision is made — typically within 2–3 business days.'}
            </p>
          </div>
          {approvalStatus === 'approved' && (
            <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: 'rgb(var(--fg-rgb) / 0.12)', border: '1px solid rgb(var(--fg-rgb) / 0.3)', color: 'var(--fg)' }}>
              <Shield size={12} /> ACTIVE
            </div>
          )}
        </div>

        {/* ── Setup checklist: what reviewers look for ── */}
        {profileId && approvalStatus !== 'approved' && (
          <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Get approved faster</p>
            <p className="text-xs mt-0.5 mb-4" style={{ color: 'var(--text-muted)' }}>
              Reviewers check these first. Fill them in below and press Save Profile.
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {setupSteps.map(step => (
                <li key={step.label} className="flex items-start gap-2.5 rounded-xl p-3"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <span className="shrink-0 mt-0.5" style={{ color: step.done ? 'var(--fg)' : 'var(--text-muted)' }}>
                    {step.done ? <CheckSquare size={15} /> : <Square size={15} />}
                  </span>
                  <div>
                    <p className={`text-sm font-semibold ${step.done ? 'line-through' : ''}`}
                      style={{ color: step.done ? 'var(--text-muted)' : 'var(--text-primary)' }}>{step.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{step.hint}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
              {setupSteps.filter(s => s.done).length} of {setupSteps.length} done. You can set your availability once approved.
            </p>
          </div>
        )}

        {/* ── Profile + Edit ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* Left: Profile Card */}
          <div className="rounded-2xl p-6 flex flex-col items-center gap-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {/* Avatar */}
            <div className="relative w-20 h-20 rounded-full flex items-center justify-center text-[var(--bg)] text-2xl font-black"
              style={{ background: 'var(--fg)' }}>
              {initials}
              <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2`}
                style={{
                  background: approvalStatus === 'approved' ? 'var(--fg)' : approvalStatus === 'rejected' ? 'var(--fg)' : 'var(--fg)',
                  borderColor: 'var(--bg-card)',
                }} />
            </div>

            <div className="text-center">
              <h2 className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>{user?.name ?? '—'}</h2>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{user?.email ?? '—'}</p>
            </div>

            {/* Info grid */}
            <div className="w-full space-y-2.5 mt-1">
              {[
                { label: 'MEMBER SINCE', value: memberSince ? fmtDate(memberSince) : '—', color: 'var(--text-primary)' },
                { label: 'EXPERIENCE',   value: `${profile.experience} years`,   color: 'var(--fg)' },
                { label: 'HOURLY RATE',  value: `${curr}${profile.hourlyRate}/hr`, color: 'var(--fg)' },
              ].map(row => (
                <div key={row.label} className="rounded-xl p-3 flex justify-between items-center"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <span className="text-mono-label text-[10px]" style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                  <span className="font-bold text-sm" style={{ color: row.color }}>{row.value}</span>
                </div>
              ))}
              {/* availability quick-view */}
              <div className="rounded-xl p-3 flex justify-between items-center"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <span className="text-mono-label text-[10px]" style={{ color: 'var(--text-muted)' }}>AVAILABILITY</span>
                <span className="font-bold text-sm" style={{ color: 'var(--fg)' }}>
                  {avail.hoursPerWeek}h/wk · {enabledDays.length}d
                </span>
              </div>
            </div>

            {/* Skills display */}
            <div className="w-full">
              <p className="text-mono-label text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>SKILLS</p>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map(skill => (
                  <span key={skill} className="px-2.5 py-1 rounded text-xs font-semibold"
                    style={{ background: 'rgb(var(--fg-rgb) / 0.1)', border: '1px solid rgb(var(--fg-rgb) / 0.3)', color: 'var(--fg)' }}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Edit Form */}
          <div className="rounded-2xl p-6"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-mono-label text-xs tracking-widest mb-5" style={{ color: 'var(--text-muted)' }}>EDIT PROFILE</p>

            {saved && (
              <div className="flex items-center gap-2 rounded-xl p-3 mb-4"
                style={{ background: 'rgb(var(--fg-rgb) / 0.08)', border: '1px solid rgb(var(--fg-rgb) / 0.25)' }}>
                <CheckCircle size={15} style={{ color: 'var(--fg)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Profile saved!</span>
              </div>
            )}

            {saveError && <div className="mb-4"><ErrorBanner title="Profile not saved" message={saveError} onClose={() => setSaveError('')} /></div>}

            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="label-field">Bio</label>
                <textarea className="input-field" rows={4}
                  placeholder="Tell clients about yourself..."
                  value={profile.bio}
                  onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} />
              </div>

              <div>
                <label className="label-field">Skills (press Enter or , to add)</label>
                <input className="input-field mb-2"
                  placeholder="e.g. React, TypeScript…"
                  value={profile.skillInput}
                  onChange={e => setProfile(p => ({ ...p, skillInput: e.target.value }))}
                  onKeyDown={addSkill} />
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map(skill => (
                    <span key={skill}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold"
                      style={{ background: 'rgb(var(--fg-rgb) / 0.1)', border: '1px solid rgb(var(--fg-rgb) / 0.3)', color: 'var(--fg)' }}>
                      {skill}
                      <button type="button" onClick={() => removeSkill(skill)}><X size={11} /></button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Experience (years)</label>
                  <input type="number" min={0} max={50} className="input-field"
                    value={profile.experience}
                    onChange={e => setProfile(p => ({ ...p, experience: parseInt(e.target.value) }))} />
                </div>
                <div>
                  <label className="label-field">Hourly Rate ({curr})</label>
                  <input type="number" min={0} step={5} className="input-field"
                    value={profile.hourlyRate}
                    onChange={e => setProfile(p => ({ ...p, hourlyRate: parseFloat(e.target.value) }))} />
                </div>
              </div>

              <button type="submit" disabled={saving || !profileId} className="btn-primary w-full rounded disabled:opacity-50">
                {saving ? 'SAVING…' : 'SAVE PROFILE'}
              </button>
            </form>
          </div>
        </div>

        {/* ── Availability section ── */}
        <div className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>

          {/* section header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-theme"
            style={{ background: 'var(--bg-sidebar)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'rgb(var(--fg-rgb) / 0.1)', border: '1px solid rgb(var(--fg-rgb) / 0.25)' }}>
                <Calendar size={16} style={{ color: 'var(--fg)' }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Availability Schedule</p>
                  {approvalStatus !== 'approved' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold"
                      style={{ background: 'rgb(var(--fg-rgb) / 0.12)', border: '1px solid rgb(var(--fg-rgb) / 0.3)', color: 'var(--fg)' }}>
                      <Lock size={9} /> LOCKED UNTIL APPROVED
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-mono-label" style={{ color: 'var(--text-muted)' }}>
                  SET YOUR WORKING HOURS SO CLIENTS KNOW WHEN YOU&apos;RE REACHABLE
                </p>
              </div>
            </div>
            {/* summary chips */}
            <div className="hidden md:flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                style={{ background: 'rgb(var(--fg-rgb) / 0.08)', border: '1px solid rgb(var(--fg-rgb) / 0.2)', color: 'var(--fg)' }}>
                <Clock size={11} /> {avail.hoursPerWeek}h/week
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                style={{ background: 'rgb(var(--fg-rgb) / 0.08)', border: '1px solid rgb(var(--fg-rgb) / 0.2)', color: 'var(--fg)' }}>
                <Zap size={11} /> {enabledDays.length} days active
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                style={{ background: 'rgb(var(--fg-rgb) / 0.08)', border: '1px solid rgb(var(--fg-rgb) / 0.2)', color: 'var(--fg)' }}>
                <Globe size={11} /> {avail.timezone.split(' ')[0]}
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveAvail} className="p-6 space-y-6"
            style={{ opacity: approvalStatus !== 'approved' ? 0.55 : 1, pointerEvents: approvalStatus !== 'approved' ? 'none' : 'auto' }}>

            {approvalStatus !== 'approved' && (
              <div className="flex items-center gap-3 rounded-xl p-4"
                style={{ background: 'rgb(var(--fg-rgb) / 0.06)', border: '1px solid rgb(var(--fg-rgb) / 0.2)' }}>
                <Lock size={15} style={{ color: 'var(--fg)' }} />
                <p className="text-sm" style={{ color: 'var(--fg)' }}>
                  Availability editing is unlocked once your application is approved.
                </p>
              </div>
            )}

            {availSaved && (
              <div className="flex items-center gap-2 rounded-xl p-3"
                style={{ background: 'rgb(var(--fg-rgb) / 0.08)', border: '1px solid rgb(var(--fg-rgb) / 0.25)' }}>
                <CheckCircle size={15} style={{ color: 'var(--fg)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Availability saved!</span>
              </div>
            )}

            {availError && <ErrorBanner title="Availability not saved" message={availError} onClose={() => setAvailError('')} />}

            {/* top row: hours/week + timezone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-field flex items-center gap-1.5">
                  <Clock size={12} /> Hours per week
                </label>
                <div className="relative">
                  <input type="number" min={1} max={80} className="input-field pr-16"
                    value={avail.hoursPerWeek}
                    onChange={e => setAvail(a => ({ ...a, hoursPerWeek: Math.min(80, Math.max(1, +e.target.value)) }))} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold"
                    style={{ color: 'var(--text-muted)' }}>hrs/wk</span>
                </div>
                <p className="text-[10px] mt-1 text-mono-label" style={{ color: 'var(--text-muted)' }}>
                  Slot-based total: ~{weeklySlotHrs.toFixed(0)}h from your schedule below
                </p>
              </div>
              <div>
                <label className="label-field flex items-center gap-1.5">
                  <Globe size={12} /> Timezone
                </label>
                <select className="input-field"
                  value={avail.timezone}
                  onChange={e => setAvail(a => ({ ...a, timezone: e.target.value }))}>
                  {TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* day schedule */}
            <div>
              <p className="label-field mb-3 flex items-center gap-1.5">
                <Calendar size={12} /> Weekly schedule
              </p>

              {/* day toggle row */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {DAYS.map(d => {
                  const on = avail.schedule[d.key].enabled
                  return (
                    <button key={d.key} type="button" onClick={() => toggleDay(d.key)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                      style={{
                        background: on ? 'rgb(var(--fg-rgb) / 0.12)' : 'var(--bg-elevated)',
                        border: `1px solid ${on ? 'rgb(var(--fg-rgb) / 0.35)' : 'var(--border)'}`,
                        color: on ? 'var(--fg)' : 'var(--text-muted)',
                      }}>
                      {d.short}
                    </button>
                  )
                })}
              </div>

              {/* per-day time slots */}
              <div className="space-y-2">
                {DAYS.map(d => {
                  const slot = avail.schedule[d.key]
                  return (
                    <div key={d.key}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all"
                      style={{
                        background: slot.enabled ? 'var(--bg-elevated)' : 'transparent',
                        border: `1px solid ${slot.enabled ? 'rgb(var(--fg-rgb) / 0.15)' : 'var(--border)'}`,
                        opacity: slot.enabled ? 1 : 0.45,
                      }}>
                      {/* day label + toggle */}
                      <button type="button" onClick={() => toggleDay(d.key)}
                        className="shrink-0 w-5 h-5 rounded flex items-center justify-center transition-all"
                        style={{
                          background: slot.enabled ? 'rgb(var(--fg-rgb) / 0.15)' : 'var(--bg-card)',
                          border: `1px solid ${slot.enabled ? 'rgb(var(--fg-rgb) / 0.4)' : 'var(--border)'}`,
                        }}>
                        {slot.enabled && <span style={{ color: 'var(--fg)', fontSize: 11, fontWeight: 900 }}>✓</span>}
                      </button>
                      <span className="w-24 text-xs font-semibold shrink-0"
                        style={{ color: slot.enabled ? 'var(--text-primary)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {d.label}
                      </span>

                      {slot.enabled ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input type="time" className="input-field py-1.5 text-xs w-28"
                            value={slot.from}
                            onChange={e => setDayTime(d.key, 'from', e.target.value)}
                            disabled={!slot.enabled} />
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>to</span>
                          <input type="time" className="input-field py-1.5 text-xs w-28"
                            value={slot.to}
                            onChange={e => setDayTime(d.key, 'to', e.target.value)}
                            disabled={!slot.enabled} />
                          {/* hours for this day */}
                          <span className="text-xs font-bold ml-auto shrink-0"
                            style={{ color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>
                            {(() => {
                              const [fh, fm] = slot.from.split(':').map(Number)
                              const [th, tm] = slot.to.split(':').map(Number)
                              const h = Math.max(0, (th * 60 + tm - fh * 60 - fm) / 60)
                              return `${h % 1 === 0 ? h : h.toFixed(1)}h`
                            })()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>Not available</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* action row */}
            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={availSaving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                style={{ background: 'var(--fg)', color: 'var(--bg)' }}>
                {availSaving ? 'Saving…' : <><CheckCircle size={14} /> Save Availability</>}
              </button>
              <button type="button" onClick={resetAvail}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                Reset to Default
              </button>
              <span className="text-[10px] text-mono-label ml-auto" style={{ color: 'var(--text-muted)' }}>
                Visible to admin and project managers
              </span>
            </div>
          </form>
        </div>

      </div>
    </DashboardLayout>
  )
}
