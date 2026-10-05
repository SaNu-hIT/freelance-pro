'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  ExternalLink,
  CheckCircle,
  Circle,
  ChevronRight,
  Loader2,
  XCircle,
  RotateCcw,
  ArrowRight,
  User,
  X,
  Check,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { freelancersApi } from '@/lib/api'
import { FreelancerProfile, OnboardingStage } from '@/lib/types'
import { useCurrencySymbol } from '@/lib/store'
import { AvailabilityConfig } from '@/lib/freelancerStore'
import { apiError } from '@/lib/utils'
import ErrorBanner from '@/components/ui/ErrorBanner'

// The list response also carries these, which the shared type leaves out
type Applicant = FreelancerProfile & { updatedAt?: string }

// No approval timestamp is stored; the last profile update is the closest we have
function approvedThisMonth(a: Applicant): boolean {
  if (a.onboardingStage !== 'approved' || !a.updatedAt) return false
  const d = new Date(a.updatedAt)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}


// ── Helpers ───────────────────────────────────────────────────────────────────

function stageColor(stage: string): string {
  const map: Record<string, string> = {
    applied: 'var(--fg)',
    reviewing: 'var(--fg)',
    assessment: 'var(--fg)',
    approved: 'var(--fg)',
    rejected: 'var(--fg)',
  }
  return map[stage] ?? 'rgb(var(--fg-rgb) / .55)'
}

function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    applied: 'Applied',
    reviewing: 'Reviewing',
    assessment: 'Assessment',
    approved: 'Approved',
    rejected: 'Rejected',
  }
  return map[stage] ?? stage
}

function daysAgo(iso: string): string {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  const days = Math.floor(ms / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const AVATAR_PALETTE = [
  'var(--fg)', 'var(--fg)', 'var(--fg)', 'var(--fg)', 'var(--fg)',
  'var(--fg)', 'var(--fg)', 'var(--fg)', 'var(--fg)', 'var(--fg)',
]

function avatarColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]
}

// ── Verification config ───────────────────────────────────────────────────────

interface VerifItem {
  key: string
  label: string
  tracks: ('professional' | 'intern')[]
}

const PROFESSIONAL_CHECKS: VerifItem[] = [
  { key: 'profile_complete',    label: 'Profile & Bio Complete',                tracks: ['professional', 'intern'] },
  { key: 'portfolio_reviewed',  label: 'Portfolio / Work Samples Reviewed',     tracks: ['professional', 'intern'] },
  { key: 'skills_verified',     label: 'Skills Verified Against Portfolio',     tracks: ['professional', 'intern'] },
  { key: 'assessment_assigned', label: 'Technical Assessment Assigned',         tracks: ['professional'] },
  { key: 'assessment_passed',   label: 'Assessment Passed',                     tracks: ['professional'] },
  { key: 'contract_signed',     label: 'Service Contract Signed',               tracks: ['professional', 'intern'] },
  { key: 'deposit_received',    label: 'Security Deposit Received',             tracks: ['intern'] },
]

// ── Stage progress strip ──────────────────────────────────────────────────────

const PIPELINE_STAGES: OnboardingStage[] = ['applied', 'reviewing', 'assessment', 'approved']

// What the admin should do at each open stage
const NEXT_STEP: Partial<Record<OnboardingStage, string>> = {
  applied: 'New application. Start the review when you are ready to look at it.',
  reviewing: 'Check the profile and portfolio, then send a technical assessment or approve directly.',
  assessment: 'Waiting on the assessment. Approve once it is passed.',
}

// ── Availability panel (read-only for admin) ──────────────────────────────────

const DAY_LABELS: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
}

function AvailabilityPanel({ profileId }: { profileId: string }) {
  const [avail, setAvail] = useState<AvailabilityConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Mounted with key={profileId}, so state starts fresh for each applicant
  useEffect(() => {
    let cancelled = false
    freelancersApi.getAvailability(profileId)
      .then(res => { if (!cancelled) setAvail((res.data || null) as AvailabilityConfig | null) })
      .catch(err => { if (!cancelled) setError(apiError(err, 'Could not load availability')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [profileId])

  const heading = (
    <h3 style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 12px' }}>
      Availability Schedule
    </h3>
  )
  if (loading || error || !avail?.schedule) {
    return (
      <div>
        {heading}
        {error
          ? <ErrorBanner title="Availability unavailable" message={error} />
          : <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{loading ? 'Loading…' : 'Not set by the freelancer yet'}</span>}
      </div>
    )
  }

  const enabledDays = Object.entries(avail.schedule).filter(([, v]) => v.enabled)

  return (
    <div>
      {heading}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', background: 'rgb(var(--fg-rgb) / 0.1)', border: '1px solid rgb(var(--fg-rgb) / 0.25)', color: 'var(--fg)', borderRadius: 6, padding: '3px 10px', fontWeight: 700 }}>
          {avail.hoursPerWeek}h/week
        </span>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', background: 'rgb(var(--fg-rgb) / 0.1)', border: '1px solid rgb(var(--fg-rgb) / 0.25)', color: 'var(--fg)', borderRadius: 6, padding: '3px 10px', fontWeight: 700 }}>
          {avail.timezone.split(' ')[0]}
        </span>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', background: 'rgb(var(--fg-rgb) / 0.1)', border: '1px solid rgb(var(--fg-rgb) / 0.25)', color: 'var(--fg)', borderRadius: 6, padding: '3px 10px', fontWeight: 700 }}>
          {enabledDays.length} days/week
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {Object.entries(avail.schedule).map(([day, slot]) => (
          <div key={day} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '6px 10px', borderRadius: 7,
            background: slot.enabled ? 'rgb(var(--fg-rgb) / 0.05)' : 'transparent',
            border: `1px solid ${slot.enabled ? 'rgb(var(--fg-rgb) / 0.15)' : 'var(--border)'}`,
            opacity: slot.enabled ? 1 : 0.45,
          }}>
            <span style={{ width: 28, fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', color: slot.enabled ? 'var(--fg)' : 'var(--text-muted)' }}>
              {DAY_LABELS[day]}
            </span>
            {slot.enabled
              ? <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{slot.from} – {slot.to}</span>
              : <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Not available</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OnboardingPipelinePage() {
  const curr = useCurrencySymbol()

  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [stageFilter, setStageFilter] = useState<OnboardingStage | 'all'>('all')
  const [selected, setSelected] = useState<Applicant | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccess, setActionSuccess] = useState('')
  const [actionError, setActionError] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadApplicants = async (): Promise<Applicant[]> => {
    const res = await freelancersApi.getAll()
    const data: Applicant[] = res.data?.data ?? res.data
    return (Array.isArray(data) ? data : [])
      .filter(a => (a.onboardingStage !== 'approved' && a.status !== 'active') || approvedThisMonth(a))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadApplicants()
      .then(data => { if (!cancelled) setApplicants(data) })
      .catch(err => { if (!cancelled) setLoadError(apiError(err, 'Could not load applicants')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (selected) {
      setAdminNotes(selected.adminNotes ?? '')
      setShowRejectForm(false)
      setRejectReason('')
      setActionSuccess('')
      setActionError('')
      setNotesSaved(false)
    }
  }, [selected?.id])

  // ── Apply the server's copy of an applicant ───────────────────────────────

  const applyUpdate = (updated: Applicant) => {
    setApplicants(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a))
    setSelected(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev)
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  const counts = useMemo(() => ({
    all:        applicants.length,
    applied:    applicants.filter(a => (a.onboardingStage ?? 'applied') === 'applied').length,
    reviewing:  applicants.filter(a => a.onboardingStage === 'reviewing').length,
    assessment: applicants.filter(a => a.onboardingStage === 'assessment').length,
    approved:   applicants.filter(a => a.onboardingStage === 'approved').length,
    rejected:   applicants.filter(a => a.onboardingStage === 'rejected').length,
  }), [applicants])

  const filtered = useMemo(() => {
    if (stageFilter === 'all') return applicants
    return applicants.filter(a => (a.onboardingStage ?? 'applied') === stageFilter)
  }, [applicants, stageFilter])

  // ── Actions ───────────────────────────────────────────────────────────────

  const runAction = async (request: () => Promise<{ data: Applicant }>, success: string, failure: string): Promise<boolean> => {
    setActionLoading(true)
    setActionError('')
    try {
      const res = await request()
      applyUpdate(res.data)
      setActionSuccess(success)
      setTimeout(() => setActionSuccess(''), 3000)
      return true
    } catch (err) {
      setActionSuccess('')
      setActionError(apiError(err, failure))
      return false
    } finally {
      setActionLoading(false)
    }
  }

  const handleMoveStage = (id: string, stage: OnboardingStage) =>
    runAction(() => freelancersApi.updateStage(id, stage), `Moved to ${stageLabel(stage)}`, 'Could not change the stage')

  const handleApprove = (id: string) =>
    runAction(() => freelancersApi.approve(id), 'Freelancer approved — now active on platform', 'Could not approve the freelancer')

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) return
    const ok = await runAction(() => freelancersApi.reject(id, rejectReason), 'Application rejected', 'Could not reject the application')
    if (ok) {
      setShowRejectForm(false)
      setRejectReason('')
    }
  }

  const handleToggleVerification = async (id: string, key: string, current: boolean) => {
    setActionError('')
    try {
      const res = await freelancersApi.updateVerifications(id, { [key]: !current })
      applyUpdate(res.data)
    } catch (err) {
      setActionError(apiError(err, 'Could not update the checklist'))
    }
  }

  const handleAdminNotesBlur = async () => {
    if (!selected || adminNotes === (selected.adminNotes ?? '')) return
    setActionError('')
    try {
      const res = await freelancersApi.update(selected.id, { adminNotes })
      applyUpdate(res.data)
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2500)
    } catch (err) {
      // Keep the typed text in the box so it can be saved again
      setActionError(apiError(err, 'Admin notes were not saved'))
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  const StageBadge = ({ stage }: { stage: string }) => (
    <span
      style={{
        background: `color-mix(in srgb, ${stageColor(stage)} 10%, transparent)`,
        border: `1px solid color-mix(in srgb, ${stageColor(stage)} 33%, transparent)`,
        color: stageColor(stage),
        fontSize: 10,
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        letterSpacing: '0.08em',
        padding: '2px 8px',
        borderRadius: 4,
        textTransform: 'uppercase' as const,
        whiteSpace: 'nowrap' as const,
      }}
    >
      {stageLabel(stage)}
    </span>
  )

  const TrackBadge = ({ track }: { track?: string }) => {
    if (!track) return null
    const isPro = track === 'professional'
    return (
      <span
        style={{
          background: isPro ? 'rgb(var(--fg-rgb) / 0.12)' : 'rgb(var(--fg-rgb) / 0.12)',
          border: `1px solid ${isPro ? 'rgb(var(--fg-rgb) / 0.35)' : 'rgb(var(--fg-rgb) / 0.35)'}`,
          color: isPro ? 'var(--fg)' : 'var(--fg)',
          fontSize: 9,
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          letterSpacing: '0.1em',
          padding: '2px 7px',
          borderRadius: 4,
          textTransform: 'uppercase' as const,
          whiteSpace: 'nowrap' as const,
        }}
      >
        {isPro ? 'PROFESSIONAL' : 'INTERN'}
      </span>
    )
  }

  // ── Page ──────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout allowedRoles={['admin']}>
      <div style={{ padding: '32px 28px', minHeight: '100vh', color: 'var(--text-primary)' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Onboarding Pipeline
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '6px 0 0', fontFamily: 'var(--font-mono)' }}>
            Review, verify and approve incoming freelancer applications
          </p>
        </div>


        {/* Stage filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
          {(['all', 'applied', 'reviewing', 'assessment', 'approved', 'rejected'] as const).map(tab => {
            const cnt = tab === 'all' ? counts.all : counts[tab]
            const active = stageFilter === tab
            const col = tab === 'all' ? 'var(--fg)' : stageColor(tab)
            return (
              <button
                key={tab}
                onClick={() => setStageFilter(tab)}
                title={tab === 'approved' ? 'Approved this month' : undefined}
                style={{
                  background: active ? `color-mix(in srgb, ${col} 13%, transparent)` : 'var(--input-bg)',
                  border: `1px solid ${active ? `color-mix(in srgb, ${col} 53%, transparent)` : 'var(--input-bg)'}`,
                  color: active ? col : 'var(--text-muted)',
                  borderRadius: 20,
                  padding: '6px 14px',
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s',
                }}
              >
                {tab === 'all' ? 'All' : stageLabel(tab)}
                <span style={{
                  background: active ? col : 'var(--input-bg)',
                  color: active ? 'var(--bg)' : 'var(--text-muted)',
                  borderRadius: 10,
                  padding: '1px 7px',
                  fontSize: 10,
                }}>
                  {cnt}
                </span>
              </button>
            )
          })}
        </div>

        {loadError && (
          <div style={{ marginBottom: 20 }}>
            <ErrorBanner title="Could not load applicants" message={loadError} />
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '48px 0', justifyContent: 'center' }}>
            <Loader2 size={20} style={{ color: 'var(--fg)', animation: 'spin 1s linear infinite' }} />
            <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              LOADING APPLICANTS...
            </span>
          </div>
        )}

        {/* Two-panel layout: the page scrolls, the detail panel stays in view */}
        {!loading && !loadError && (
          <div
            className="onb-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: selected ? 'minmax(260px, 1fr) minmax(0, 2.6fr)' : '1fr',
              gap: 16,
              alignItems: 'start',
            }}
          >

            {/* LEFT: Applicant list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
              {filtered.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '48px 0', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  No applicants in this stage
                </div>
              )}
              {filtered.map(applicant => {
                const stage = applicant.onboardingStage ?? 'applied'
                const isActive = selected?.id === applicant.id
                return (
                  <div
                    key={applicant.id}
                    onClick={() => setSelected(applicant)}
                    style={{
                      background: isActive ? 'rgb(var(--fg-rgb) / 0.07)' : 'var(--row-hover-bg)',
                      border: `1px solid ${isActive ? 'rgb(var(--fg-rgb) / 0.4)' : 'var(--input-bg)'}`,
                      borderRadius: 10,
                      padding: '14px 16px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--track-bg)'
                    }}
                    onMouseLeave={e => {
                      if (!isActive) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--input-bg)'
                    }}
                  >
                    {/* Top row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      {/* Avatar */}
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: avatarColor(applicant.id),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: 'var(--bg)', flexShrink: 0,
                      }}>
                        {getInitials(applicant.user.name)}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                            {applicant.user.name}
                          </span>
                          <TrackBadge track={applicant.track} />
                          <StageBadge stage={stage} />
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                          {applicant.user.email}
                        </div>
                      </div>
                    </div>

                    {/* Skills */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                      {applicant.skills.slice(0, 3).map(skill => (
                        <span key={skill} style={{
                          background: 'var(--input-bg)',
                          border: '1px solid var(--border)',
                          borderRadius: 4, padding: '2px 7px',
                          fontSize: 10, color: 'var(--text-muted)',
                          fontFamily: 'var(--font-mono)',
                        }}>
                          {skill}
                        </span>
                      ))}
                      {applicant.skills.length > 3 && (
                        <span style={{
                          background: 'var(--input-bg)',
                          border: '1px solid var(--border)',
                          borderRadius: 4, padding: '2px 7px',
                          fontSize: 10, color: 'var(--text-muted)',
                          fontFamily: 'var(--font-mono)',
                        }}>
                          +{applicant.skills.length - 3} more
                        </span>
                      )}
                    </div>

                    {/* Bottom row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        Applied {daysAgo(applicant.createdAt ?? '')}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {applicant.experience}y · {curr}{applicant.hourlyRate}/hr
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* RIGHT: Detail panel */}
            {selected && (() => {
              const stage = selected.onboardingStage ?? 'applied'
              const checks = PROFESSIONAL_CHECKS.filter(item => item.tracks.includes(selected.track ?? 'professional'))
              const doneCount = checks.filter(item => (selected.verifications ?? {})[item.key]).length
              const sectionTitle: React.CSSProperties = { fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 12px' }
              const fieldLabel: React.CSSProperties = { fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block' }
              return (
              <div
                className="onb-panel"
                style={{
                  position: 'sticky',
                  top: 16,
                  maxHeight: 'calc(100vh - 96px)',
                  overflowY: 'auto',
                  background: 'var(--bg-base)',
                  border: '1px solid rgb(var(--fg-rgb) / 0.35)',
                  boxShadow: '0 12px 40px rgb(0 0 0 / 0.12)',
                  borderRadius: 12,
                  minWidth: 0,
                }}
              >
                {/* Header: who this is, pinned while the panel scrolls */}
                <div style={{
                  position: 'sticky', top: 0, zIndex: 1,
                  background: 'var(--bg-base)', borderBottom: '1px solid var(--border)',
                  padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'center',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: avatarColor(selected.id),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 700, color: 'var(--bg)', flexShrink: 0,
                  }}>
                    {getInitials(selected.user.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{selected.user.name}</span>
                      <TrackBadge track={selected.track} />
                      <StageBadge stage={stage} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selected.user.email}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    aria-label="Close"
                    title="Close"
                    style={{
                      background: 'none', border: '1px solid var(--border)',
                      borderRadius: 6, width: 32, height: 32, cursor: 'pointer',
                      color: 'var(--text-secondary)', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Two columns on wide screens: decide (stage, checklist) | know (profile, availability, notes) */}
                <div className="onb-detail">
                {actionError && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <ErrorBanner message={actionError} onClose={() => setActionError('')} />
                  </div>
                )}

                <div className="onb-col">

                {/* ── Section 1: Stage and next step ── */}
                <div>
                  <h3 style={sectionTitle}>Stage</h3>

                  {/* Stage progress strip */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 14, overflowX: 'auto' }}>
                    {PIPELINE_STAGES.map((s, idx) => {
                      const isCurrentStage = s === stage
                      const isPast = PIPELINE_STAGES.indexOf(stage) > idx
                      return (
                        <div key={s} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                          <div style={{
                            padding: '5px 12px',
                            borderRadius: 6,
                            background: isCurrentStage ? 'var(--fg)' : 'transparent',
                            border: `1px solid ${isCurrentStage ? 'var(--fg)' : 'var(--border)'}`,
                            color: isCurrentStage ? 'var(--bg)' : isPast ? 'var(--text-secondary)' : 'var(--text-muted)',
                            fontSize: 11,
                            fontFamily: 'var(--font-mono)',
                            fontWeight: isCurrentStage ? 700 : 400,
                            display: 'flex', alignItems: 'center', gap: 5,
                          }}>
                            {isPast && <Check size={11} />}
                            {stageLabel(s)}
                          </div>
                          {idx < PIPELINE_STAGES.length - 1 && (
                            <ChevronRight size={14} style={{ color: 'var(--text-muted)', margin: '0 2px' }} />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {NEXT_STEP[stage] && (
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.5 }}>
                      {NEXT_STEP[stage]}
                    </p>
                  )}
                  {/* Action success banner */}
                  {actionSuccess && (
                    <div style={{
                      background: 'rgb(var(--fg-rgb) / 0.08)',
                      border: '1px solid rgb(var(--fg-rgb) / 0.3)',
                      borderRadius: 8, padding: '10px 14px',
                      marginBottom: 14, fontSize: 12,
                      color: 'var(--fg)', fontFamily: 'var(--font-mono)',
                    }}>
                      ✓ {actionSuccess}
                    </div>
                  )}

                  {/* Contextual actions */}
                  {(() => {
                    const stage = selected.onboardingStage ?? 'applied'
                    const btnBase: React.CSSProperties = {
                      border: 'none', borderRadius: 7, padding: '9px 16px',
                      fontSize: 12, fontFamily: 'var(--font-mono)',
                      fontWeight: 600, cursor: actionLoading ? 'not-allowed' : 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      transition: 'opacity 0.15s',
                      opacity: actionLoading ? 0.6 : 1,
                    }

                    if (stage === 'approved') {
                      return (
                        <div style={{
                          background: 'rgb(var(--fg-rgb) / 0.08)',
                          border: '1px solid rgb(var(--fg-rgb) / 0.3)',
                          borderRadius: 8, padding: '14px 16px',
                          display: 'flex', alignItems: 'center', gap: 10,
                        }}>
                          <CheckCircle size={18} style={{ color: 'var(--fg)' }} />
                          <span style={{ fontSize: 13, color: 'var(--fg)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                            Approved — Active on Platform
                          </span>
                        </div>
                      )
                    }

                    if (stage === 'rejected') {
                      return (
                        <div>
                          <div style={{
                            background: 'rgb(var(--fg-rgb) / 0.08)',
                            border: '1px solid rgb(var(--fg-rgb) / 0.3)',
                            borderRadius: 8, padding: '12px 14px', marginBottom: 12,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <XCircle size={15} style={{ color: 'var(--fg)' }} />
                              <span style={{ fontSize: 12, color: 'var(--fg)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                                APPLICATION REJECTED
                              </span>
                            </div>
                            {selected.rejectionReason && (
                              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                {selected.rejectionReason}
                              </p>
                            )}
                          </div>
                          <button
                            disabled={actionLoading}
                            onClick={() => handleMoveStage(selected.id, 'applied')}
                            style={{ ...btnBase, background: 'rgb(var(--fg-rgb) / 0.12)', color: 'var(--fg)', border: '1px solid rgb(var(--fg-rgb) / 0.3)' }}
                          >
                            {actionLoading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <RotateCcw size={13} />}
                            Reconsider — Move to Applied
                          </button>
                        </div>
                      )
                    }

                    return (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {stage === 'applied' && (
                          <button
                            disabled={actionLoading}
                            onClick={() => handleMoveStage(selected.id, 'reviewing')}
                            style={{ ...btnBase, background: 'rgb(var(--fg-rgb) / 0.12)', color: 'var(--fg)', border: '1px solid rgb(var(--fg-rgb) / 0.3)' }}
                          >
                            {actionLoading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRight size={13} />}
                            Start Review
                          </button>
                        )}
                        {stage === 'reviewing' && (
                          <>
                            <button
                              disabled={actionLoading}
                              onClick={() => handleMoveStage(selected.id, 'assessment')}
                              style={{ ...btnBase, background: 'rgb(var(--fg-rgb) / 0.12)', color: 'var(--fg)', border: '1px solid rgb(var(--fg-rgb) / 0.3)' }}
                            >
                              {actionLoading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRight size={13} />}
                              Request Assessment
                            </button>
                            <button
                              disabled={actionLoading}
                              onClick={() => handleApprove(selected.id)}
                              style={{ ...btnBase, background: 'rgb(var(--fg-rgb) / 0.12)', color: 'var(--fg)', border: '1px solid rgb(var(--fg-rgb) / 0.3)' }}
                            >
                              {actionLoading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={13} />}
                              Approve Directly
                            </button>
                          </>
                        )}
                        {stage === 'assessment' && (
                          <button
                            disabled={actionLoading}
                            onClick={() => handleApprove(selected.id)}
                            style={{ ...btnBase, background: 'rgb(var(--fg-rgb) / 0.12)', color: 'var(--fg)', border: '1px solid rgb(var(--fg-rgb) / 0.3)' }}
                          >
                            {actionLoading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={13} />}
                            Approve
                          </button>
                        )}

                        {/* Reject button (all non-approved/rejected stages) */}
                        {!showRejectForm && (
                          <button
                            disabled={actionLoading}
                            onClick={() => setShowRejectForm(true)}
                            style={{ ...btnBase, background: 'rgb(var(--fg-rgb) / 0.1)', color: 'var(--fg)', border: '1px solid rgb(var(--fg-rgb) / 0.25)' }}
                          >
                            <XCircle size={13} />
                            Reject
                          </button>
                        )}
                      </div>
                    )
                  })()}

                  {/* Reject form */}
                  {showRejectForm && (
                    <div style={{
                      marginTop: 14,
                      background: 'rgb(var(--fg-rgb) / 0.05)',
                      border: '1px solid rgb(var(--fg-rgb) / 0.2)',
                      borderRadius: 8, padding: '14px',
                    }}>
                      <label style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 8 }}>
                        REJECTION REASON
                      </label>
                      <textarea
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        rows={3}
                        placeholder="Explain why the application is being rejected..."
                        style={{
                          width: '100%', background: 'rgb(var(--bg-rgb) / 0.3)',
                          border: '1px solid var(--border)', borderRadius: 6,
                          color: 'var(--text-primary)', fontSize: 13, padding: '8px 10px',
                          fontFamily: 'inherit', resize: 'vertical', outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button
                          disabled={actionLoading || !rejectReason.trim()}
                          onClick={() => handleReject(selected.id)}
                          style={{
                            background: 'var(--fg)', color: 'var(--bg)',
                            border: 'none', borderRadius: 6, padding: '8px 16px',
                            fontSize: 12, fontFamily: 'var(--font-mono)',
                            fontWeight: 700, cursor: rejectReason.trim() ? 'pointer' : 'not-allowed',
                            opacity: rejectReason.trim() ? 1 : 0.5,
                            display: 'flex', alignItems: 'center', gap: 6,
                          }}
                        >
                          {actionLoading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                          Confirm Rejection
                        </button>
                        <button
                          onClick={() => { setShowRejectForm(false); setRejectReason('') }}
                          style={{
                            background: 'var(--input-bg)', color: 'var(--text-muted)',
                            border: '1px solid var(--border)', borderRadius: 6,
                            padding: '8px 14px', fontSize: 12,
                            fontFamily: 'var(--font-mono)', cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div style={{ borderTop: '1px solid var(--border)' }} />

                {/* ── Section 2: Verification Checklist ── */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                    <h3 style={sectionTitle}>Verification Checklist</h3>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {doneCount} of {checks.length} done
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginBottom: 10, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${checks.length ? (doneCount / checks.length) * 100 : 0}%`, background: 'var(--fg)', transition: 'width 0.2s' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {checks.map(item => {
                      const checked = !!(selected.verifications ?? {})[item.key]
                      return (
                        <button
                          key={item.key}
                          onClick={() => handleToggleVerification(selected.id, item.key, checked)}
                          aria-pressed={checked}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '7px 0',
                            textAlign: 'left',
                          }}
                        >
                          {checked ? (
                            <CheckCircle size={18} style={{ color: 'var(--fg)', flexShrink: 0 }} />
                          ) : (
                            <Circle size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          )}
                          <span style={{
                            fontSize: 13,
                            color: checked ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontFamily: 'var(--font-mono)',
                            transition: 'color 0.15s',
                          }}>
                            {item.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                </div>

                <div className="onb-col">
                {/* ── Section 3: Profile ── */}
                <div>
                  <h3 style={sectionTitle}>Profile</h3>
                  <div style={{ display: 'flex', gap: 24, marginBottom: 14, flexWrap: 'wrap' }}>
                    <div>
                      <span style={fieldLabel}>Experience</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{selected.experience}y</span>
                    </div>
                    <div>
                      <span style={fieldLabel}>Rate</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{curr}{selected.hourlyRate}/hr</span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <span style={fieldLabel}>Portfolio</span>
                      {selected.portfolioUrl ? (
                        <a
                          href={selected.portfolioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--fg)', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'underline', wordBreak: 'break-all' }}
                        >
                          {selected.portfolioUrl}
                          <ExternalLink size={12} style={{ flexShrink: 0 }} />
                        </a>
                      ) : (
                        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Not provided</span>
                      )}
                    </div>
                  </div>

                  {selected.bio && (
                    <div style={{ marginBottom: 14 }}>
                      <span style={fieldLabel}>Bio</span>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {selected.bio}
                      </p>
                    </div>
                  )}

                  {selected.skills.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {selected.skills.map(skill => (
                        <span key={skill} style={{
                          background: 'var(--input-bg)',
                          border: '1px solid var(--border)',
                          borderRadius: 5, padding: '3px 9px',
                          fontSize: 11, color: 'var(--text-secondary)',
                          fontFamily: 'var(--font-mono)',
                        }}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div style={{ borderTop: '1px solid var(--border)' }} />

                {/* ── Section 4: Availability ── */}
                <AvailabilityPanel key={selected.id} profileId={selected.id} />

                {/* Divider */}
                <div style={{ borderTop: '1px solid var(--border)' }} />

                {/* ── Section 5: Admin Notes ── */}
                <div>
                  <h3 style={{ ...sectionTitle, margin: '0 0 10px' }}>Admin Notes</h3>
                  <textarea
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    onBlur={handleAdminNotesBlur}
                    rows={4}
                    placeholder="Internal notes about this applicant. Only admins see these."
                    style={{
                      width: '100%',
                      background: 'var(--row-hover-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      padding: '10px 12px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      outline: 'none',
                      boxSizing: 'border-box',
                      lineHeight: 1.6,
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgb(var(--fg-rgb) / 0.35)' }}
                    onBlurCapture={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                  />
                  <p style={{ fontSize: 11, color: notesSaved ? 'var(--fg)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 6 }}>
                    {notesSaved ? '✓ Saved' : 'Saves when you click outside the box'}
                  </p>
                </div>
                </div>

                </div>
              </div>
              )
            })()}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        .onb-detail { padding: 20px 24px 24px; display: grid; grid-template-columns: 1fr; gap: 24px; }
        .onb-col { display: flex; flex-direction: column; gap: 24px; min-width: 0; }
        .onb-col + .onb-col { border-top: 1px solid var(--border); padding-top: 24px; }
        @media (min-width: 1280px) {
          .onb-detail { grid-template-columns: 1fr 1fr; column-gap: 0; }
          .onb-col + .onb-col { border-top: none; padding-top: 0; border-left: 1px solid var(--border); padding-left: 28px; }
          .onb-col:has(+ .onb-col) { padding-right: 28px; }
        }
        @media (max-width: 900px) {
          .onb-grid { grid-template-columns: 1fr !important; }
          .onb-panel { position: static !important; max-height: none !important; order: -1; }
        }
      `}</style>
    </DashboardLayout>
  )
}
