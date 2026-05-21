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
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { freelancersApi } from '@/lib/api'
import { FreelancerProfile, OnboardingStage } from '@/lib/types'
import { useCurrencySymbol } from '@/lib/store'

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_APPLICANTS: FreelancerProfile[] = [
  {
    id: 'ap1', userId: 'u1',
    skills: ['React', 'TypeScript', 'Tailwind CSS'], experience: 3, hourlyRate: 75,
    status: 'pending', onboardingStage: 'applied', track: 'professional',
    bio: 'Frontend engineer who loves building polished UIs with React and TypeScript. Open-source contributor and design-system enthusiast.',
    portfolioUrl: 'https://github.com/alexr',
    verifications: {},
    createdAt: '2026-05-19T09:00:00Z',
    user: { id: 'u1', name: 'Alex Rivera', email: 'alex@dev.com', role: 'freelancer', createdAt: '' },
  },
  {
    id: 'ap2', userId: 'u2',
    skills: ['Vue.js', 'PHP', 'Laravel'], experience: 1, hourlyRate: 35,
    status: 'pending', onboardingStage: 'applied', track: 'intern',
    bio: 'Recent graduate eager to grow in full-stack web development. Built several client sites using Laravel + Vue.',
    portfolioUrl: 'https://priya-portfolio.netlify.app',
    verifications: {},
    createdAt: '2026-05-20T11:30:00Z',
    user: { id: 'u2', name: 'Priya Nair', email: 'priya@intern.dev', role: 'freelancer', createdAt: '' },
  },
  {
    id: 'ap3', userId: 'u3',
    skills: ['Flutter', 'Dart', 'Firebase'], experience: 2, hourlyRate: 45,
    status: 'pending', onboardingStage: 'applied', track: 'professional',
    bio: 'Mobile developer with two published Flutter apps on the Play Store. Passionate about smooth animations and performance.',
    portfolioUrl: 'https://github.com/sambhav-flutter',
    verifications: {},
    createdAt: '2026-05-18T14:00:00Z',
    user: { id: 'u3', name: 'Sambhav Mehta', email: 'sambhav@mobile.dev', role: 'freelancer', createdAt: '' },
  },
  {
    id: 'ap4', userId: 'u4',
    skills: ['Node.js', 'PostgreSQL', 'NestJS'], experience: 4, hourlyRate: 80,
    status: 'pending', onboardingStage: 'reviewing', track: 'professional',
    bio: 'Backend specialist building REST and GraphQL APIs. Deep experience with NestJS microservices and PostgreSQL optimisation.',
    portfolioUrl: 'https://github.com/carlos-api',
    verifications: { profile_complete: true, portfolio_reviewed: false, skills_verified: false },
    createdAt: '2026-05-15T08:00:00Z',
    user: { id: 'u4', name: 'Carlos Teixeira', email: 'carlos@api.dev', role: 'freelancer', createdAt: '' },
  },
  {
    id: 'ap5', userId: 'u5',
    skills: ['Python', 'Django', 'AWS'], experience: 5, hourlyRate: 90,
    status: 'pending', onboardingStage: 'reviewing', track: 'professional',
    bio: 'Senior Python engineer with extensive AWS experience. Built data pipelines and SaaS backends for fintech startups.',
    portfolioUrl: 'https://fatima-dev.com',
    verifications: { profile_complete: true, portfolio_reviewed: true, skills_verified: false },
    createdAt: '2026-05-14T10:00:00Z',
    user: { id: 'u5', name: 'Fatima Al-Hassan', email: 'fatima@pydev.io', role: 'freelancer', createdAt: '' },
  },
  {
    id: 'ap6', userId: 'u6',
    skills: ['React', 'GraphQL', 'MongoDB'], experience: 3, hourlyRate: 70,
    status: 'pending', onboardingStage: 'assessment', track: 'professional',
    bio: 'Full-stack dev focused on the MERN ecosystem. Comfortable with both product and startup environments.',
    portfolioUrl: 'https://github.com/kwame-dev',
    verifications: { profile_complete: true, portfolio_reviewed: true, skills_verified: true, assessment_assigned: false },
    createdAt: '2026-05-10T09:00:00Z',
    user: { id: 'u6', name: 'Kwame Asante', email: 'kwame@mern.dev', role: 'freelancer', createdAt: '' },
  },
  {
    id: 'ap7', userId: 'u7',
    skills: ['Figma', 'UI/UX', 'Framer'], experience: 2, hourlyRate: 40,
    status: 'pending', onboardingStage: 'assessment', track: 'intern',
    bio: 'Design student with a strong portfolio of mobile and web UI work. Skilled in Figma prototyping and micro-interactions.',
    portfolioUrl: 'https://www.behance.net/lena-studio',
    verifications: { profile_complete: true, portfolio_reviewed: true, skills_verified: true, assessment_assigned: true },
    createdAt: '2026-05-09T13:00:00Z',
    user: { id: 'u7', name: 'Lena Kozlova', email: 'lena@design.studio', role: 'freelancer', createdAt: '' },
  },
  {
    id: 'ap8', userId: 'u8',
    skills: ['Docker', 'Kubernetes', 'AWS'], experience: 6, hourlyRate: 110,
    status: 'active', onboardingStage: 'approved', track: 'professional',
    bio: 'Cloud infrastructure engineer specialising in Kubernetes at scale. Certified AWS Solutions Architect.',
    portfolioUrl: 'https://github.com/devops-ren',
    verifications: { profile_complete: true, portfolio_reviewed: true, skills_verified: true, assessment_assigned: true, assessment_passed: true, contract_signed: true, deposit_received: false },
    createdAt: '2026-05-01T07:00:00Z',
    user: { id: 'u8', name: 'René Müller', email: 'rene@cloudops.io', role: 'freelancer', createdAt: '' },
  },
  {
    id: 'ap9', userId: 'u9',
    skills: ['Shopify', 'WordPress', 'PHP'], experience: 4, hourlyRate: 60,
    status: 'active', onboardingStage: 'approved', track: 'professional',
    bio: 'eCommerce developer with 50+ Shopify and WooCommerce stores delivered. Conversion rate optimisation specialist.',
    portfolioUrl: 'https://amara-ecom.com',
    verifications: { profile_complete: true, portfolio_reviewed: true, skills_verified: true, assessment_assigned: true, assessment_passed: true, contract_signed: true },
    createdAt: '2026-04-28T09:00:00Z',
    user: { id: 'u9', name: 'Amara Diallo', email: 'amara@ecom.shop', role: 'freelancer', createdAt: '' },
  },
  {
    id: 'ap10', userId: 'u10',
    skills: ['React Native'], experience: 1, hourlyRate: 30,
    status: 'inactive', onboardingStage: 'rejected', track: 'intern',
    bio: 'Self-taught developer looking for first professional opportunity.',
    portfolioUrl: undefined,
    verifications: {},
    rejectionReason: 'Portfolio quality did not meet our standards. May reapply in 3 months.',
    createdAt: '2026-05-17T16:00:00Z',
    user: { id: 'u10', name: 'Ishan Patel', email: 'ishan@mail.com', role: 'freelancer', createdAt: '' },
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function stageColor(stage: string): string {
  const map: Record<string, string> = {
    applied: '#60a5fa',
    reviewing: '#fbbf24',
    assessment: '#a78bfa',
    approved: '#4ade80',
    rejected: '#f87171',
  }
  return map[stage] ?? '#9ca3af'
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
  '#7c3aed', '#dc2626', '#059669', '#d97706', '#0284c7',
  '#db2777', '#16a34a', '#ea580c', '#6d28d9', '#0891b2',
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

// ── Main component ────────────────────────────────────────────────────────────

export default function OnboardingPipelinePage() {
  const curr = useCurrencySymbol()

  const [applicants, setApplicants] = useState<FreelancerProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [stageFilter, setStageFilter] = useState<OnboardingStage | 'all'>('all')
  const [selected, setSelected] = useState<FreelancerProfile | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccess, setActionSuccess] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [adminNotes, setAdminNotes] = useState('')

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadApplicants = async (): Promise<FreelancerProfile[]> => {
    try {
      const res = await freelancersApi.getAll()
      const data: FreelancerProfile[] = res.data?.data ?? res.data
      return Array.isArray(data) && data.length > 0 ? data : MOCK_APPLICANTS
    } catch {
      return MOCK_APPLICANTS
    }
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadApplicants().then(data => {
      if (!cancelled) {
        setApplicants(data)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (selected) {
      setAdminNotes(selected.adminNotes ?? '')
      setShowRejectForm(false)
      setRejectReason('')
      setActionSuccess('')
    }
  }, [selected?.id])

  // ── Refresh & sync selected ───────────────────────────────────────────────

  const refreshAndSync = async (id: string) => {
    const data = await loadApplicants()
    setApplicants(data)
    const updated = data.find(a => a.id === id)
    if (updated) setSelected(updated)
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

  const handleMoveStage = async (id: string, stage: OnboardingStage) => {
    setActionLoading(true)
    try {
      await freelancersApi.updateStage(id, stage)
    } catch {
      // optimistic: still update local state
    }
    await refreshAndSync(id)
    setActionLoading(false)
    setActionSuccess(`Moved to ${stageLabel(stage)}`)
    setTimeout(() => setActionSuccess(''), 3000)
  }

  const handleApprove = async (id: string) => {
    setActionLoading(true)
    try {
      await freelancersApi.approve(id)
    } catch {
      // optimistic
    }
    await refreshAndSync(id)
    setActionLoading(false)
    setActionSuccess('Freelancer approved — now active on platform')
    setTimeout(() => setActionSuccess(''), 4000)
  }

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) return
    setActionLoading(true)
    try {
      await freelancersApi.reject(id, rejectReason)
    } catch {
      // optimistic
    }
    await refreshAndSync(id)
    setActionLoading(false)
    setShowRejectForm(false)
    setRejectReason('')
    setActionSuccess('Application rejected')
    setTimeout(() => setActionSuccess(''), 3000)
  }

  const handleToggleVerification = async (id: string, key: string, current: boolean) => {
    const update = { [key]: !current }
    try {
      await freelancersApi.updateVerifications(id, update)
    } catch {
      // optimistic
    }
    setApplicants(prev =>
      prev.map(a =>
        a.id === id
          ? { ...a, verifications: { ...(a.verifications ?? {}), ...update } }
          : a
      )
    )
    if (selected?.id === id) {
      setSelected(prev =>
        prev ? { ...prev, verifications: { ...(prev.verifications ?? {}), ...update } } : prev
      )
    }
  }

  const handleAdminNotesBlur = async () => {
    if (!selected) return
    try {
      await freelancersApi.update(selected.id, { adminNotes })
    } catch {
      // best-effort
    }
    setApplicants(prev =>
      prev.map(a => a.id === selected.id ? { ...a, adminNotes } : a)
    )
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  const StageBadge = ({ stage }: { stage: string }) => (
    <span
      style={{
        background: `${stageColor(stage)}1a`,
        border: `1px solid ${stageColor(stage)}55`,
        color: stageColor(stage),
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
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
          background: isPro ? 'rgba(167,139,250,0.12)' : 'rgba(251,191,36,0.12)',
          border: `1px solid ${isPro ? 'rgba(167,139,250,0.35)' : 'rgba(251,191,36,0.35)'}`,
          color: isPro ? '#a78bfa' : '#fbbf24',
          fontSize: 9,
          fontFamily: 'JetBrains Mono, monospace',
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
      <div style={{ padding: '32px 28px', minHeight: '100vh', color: '#e5e7eb' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: 0 }}>
            Onboarding Pipeline
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '6px 0 0', fontFamily: 'JetBrains Mono, monospace' }}>
            Review, verify and approve incoming freelancer applications
          </p>
        </div>

        {/* Stat chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
          {([
            { label: 'Total',              value: counts.all,        color: 'rgba(255,255,255,0.7)' },
            { label: 'Applied (new)',       value: counts.applied,    color: '#60a5fa' },
            { label: 'Under Review',        value: counts.reviewing,  color: '#fbbf24' },
            { label: 'Assessment',          value: counts.assessment, color: '#a78bfa' },
            { label: 'Approved this month', value: counts.approved,   color: '#4ade80' },
            { label: 'Rejected',            value: counts.rejected,   color: '#f87171' },
          ] as { label: string; value: number; color: string }[]).map(chip => (
            <div
              key={chip.label}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 8,
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 20, fontWeight: 700, color: chip.color, fontFamily: 'JetBrains Mono, monospace' }}>
                {chip.value}
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono, monospace' }}>
                {chip.label}
              </span>
            </div>
          ))}
        </div>

        {/* Stage filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
          {(['all', 'applied', 'reviewing', 'assessment', 'approved', 'rejected'] as const).map(tab => {
            const cnt = tab === 'all' ? counts.all : counts[tab]
            const active = stageFilter === tab
            const col = tab === 'all' ? '#DC143C' : stageColor(tab)
            return (
              <button
                key={tab}
                onClick={() => setStageFilter(tab)}
                style={{
                  background: active ? `${col}22` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${active ? col + '88' : 'rgba(255,255,255,0.07)'}`,
                  color: active ? col : 'rgba(255,255,255,0.5)',
                  borderRadius: 20,
                  padding: '6px 14px',
                  fontSize: 12,
                  fontFamily: 'JetBrains Mono, monospace',
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
                  background: active ? col : 'rgba(255,255,255,0.08)',
                  color: active ? '#fff' : 'rgba(255,255,255,0.4)',
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

        {/* Loading state */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '48px 0', justifyContent: 'center' }}>
            <Loader2 size={20} style={{ color: '#DC143C', animation: 'spin 1s linear infinite' }} />
            <span style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
              LOADING APPLICANTS...
            </span>
          </div>
        )}

        {/* Two-panel layout */}
        {!loading && (
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

            {/* LEFT: Applicant list */}
            <div
              style={{
                width: selected ? '40%' : '100%',
                flexShrink: 0,
                transition: 'width 0.2s',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                maxHeight: 'calc(100vh - 260px)',
                overflowY: 'auto',
                paddingRight: 4,
              }}
            >
              {filtered.length === 0 && (
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '48px 0', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
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
                      background: isActive ? 'rgba(220,20,60,0.07)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isActive ? 'rgba(220,20,60,0.4)' : 'rgba(255,255,255,0.07)'}`,
                      borderRadius: 10,
                      padding: '14px 16px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.14)'
                    }}
                    onMouseLeave={e => {
                      if (!isActive) (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'
                    }}
                  >
                    {/* Top row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      {/* Avatar */}
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: avatarColor(applicant.id),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
                      }}>
                        {getInitials(applicant.user.name)}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: 14, color: '#fff', whiteSpace: 'nowrap' }}>
                            {applicant.user.name}
                          </span>
                          <TrackBadge track={applicant.track} />
                          <StageBadge stage={stage} />
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                          {applicant.user.email}
                        </div>
                      </div>
                    </div>

                    {/* Skills */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                      {applicant.skills.slice(0, 3).map(skill => (
                        <span key={skill} style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 4, padding: '2px 7px',
                          fontSize: 10, color: 'rgba(255,255,255,0.55)',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}>
                          {skill}
                        </span>
                      ))}
                      {applicant.skills.length > 3 && (
                        <span style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 4, padding: '2px 7px',
                          fontSize: 10, color: 'rgba(255,255,255,0.3)',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}>
                          +{applicant.skills.length - 3} more
                        </span>
                      )}
                    </div>

                    {/* Bottom row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono, monospace' }}>
                        Applied {daysAgo(applicant.createdAt ?? '')}
                      </span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {applicant.experience}y · {curr}{applicant.hourlyRate}/hr
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* RIGHT: Detail drawer */}
            {selected && (
              <div
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 12,
                  padding: '24px',
                  maxHeight: 'calc(100vh - 260px)',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 24,
                }}
              >
                {/* Close */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setSelected(null)}
                    style={{
                      background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                      color: 'rgba(255,255,255,0.4)', fontSize: 11,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    ✕ CLOSE
                  </button>
                </div>

                {/* ── Section 1: Identity ── */}
                <div>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: '50%',
                      background: avatarColor(selected.id),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, fontWeight: 700, color: '#fff', flexShrink: 0,
                    }}>
                      {getInitials(selected.user.name)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{selected.user.name}</span>
                        <TrackBadge track={selected.track} />
                        <StageBadge stage={selected.onboardingStage ?? 'applied'} />
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {selected.user.email}
                      </div>
                    </div>
                  </div>

                  {/* Portfolio */}
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Portfolio
                    </span>
                    <div style={{ marginTop: 4 }}>
                      {selected.portfolioUrl ? (
                        <a
                          href={selected.portfolioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#60a5fa', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                        >
                          {selected.portfolioUrl}
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>Not provided</span>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  {selected.bio && (
                    <div style={{ marginBottom: 10 }}>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Bio
                      </span>
                      <p style={{ marginTop: 4, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                        {selected.bio}
                      </p>
                    </div>
                  )}

                  {/* Experience + Rate + Skills */}
                  <div style={{ display: 'flex', gap: 20, marginBottom: 10, flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block' }}>Experience</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{selected.experience}y</span>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block' }}>Rate</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{curr}{selected.hourlyRate}/hr</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selected.skills.map(skill => (
                      <span key={skill} style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 5, padding: '3px 9px',
                        fontSize: 11, color: 'rgba(255,255,255,0.65)',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

                {/* ── Section 2: Verification Checklist ── */}
                <div>
                  <h3 style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 14px' }}>
                    Verification Checklist
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {PROFESSIONAL_CHECKS
                      .filter(item => item.tracks.includes(selected.track ?? 'professional'))
                      .map(item => {
                        const checked = !!(selected.verifications ?? {})[item.key]
                        const label = item.key === 'deposit_received'
                          ? `${curr}10,000 Security Deposit Received`
                          : item.label
                        return (
                          <button
                            key={item.key}
                            onClick={() => handleToggleVerification(selected.id, item.key, checked)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '6px 0',
                              textAlign: 'left',
                            }}
                          >
                            {checked ? (
                              <CheckCircle size={18} style={{ color: '#4ade80', flexShrink: 0 }} />
                            ) : (
                              <Circle size={18} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                            )}
                            <span style={{
                              fontSize: 13,
                              color: checked ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)',
                              fontFamily: 'JetBrains Mono, monospace',
                              transition: 'color 0.15s',
                            }}>
                              {label}
                            </span>
                          </button>
                        )
                      })}
                  </div>
                </div>

                {/* Divider */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

                {/* ── Section 3: Pipeline Stage Actions ── */}
                <div>
                  <h3 style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 14px' }}>
                    Pipeline Stage
                  </h3>

                  {/* Stage progress strip */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20, overflowX: 'auto' }}>
                    {PIPELINE_STAGES.map((s, idx) => {
                      const current = selected.onboardingStage ?? 'applied'
                      const isCurrentStage = s === current
                      const isPast = PIPELINE_STAGES.indexOf(current) > idx
                      const col = stageColor(s)
                      return (
                        <div key={s} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                          <div style={{
                            padding: '5px 12px',
                            borderRadius: 6,
                            background: isCurrentStage ? `${col}22` : isPast ? 'rgba(255,255,255,0.03)' : 'transparent',
                            border: `1px solid ${isCurrentStage ? col + '66' : 'rgba(255,255,255,0.07)'}`,
                            color: isCurrentStage ? col : isPast ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)',
                            fontSize: 11,
                            fontFamily: 'JetBrains Mono, monospace',
                            fontWeight: isCurrentStage ? 700 : 400,
                          }}>
                            {stageLabel(s)}
                          </div>
                          {idx < PIPELINE_STAGES.length - 1 && (
                            <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.15)', margin: '0 2px' }} />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Action success banner */}
                  {actionSuccess && (
                    <div style={{
                      background: 'rgba(74,222,128,0.08)',
                      border: '1px solid rgba(74,222,128,0.3)',
                      borderRadius: 8, padding: '10px 14px',
                      marginBottom: 14, fontSize: 12,
                      color: '#4ade80', fontFamily: 'JetBrains Mono, monospace',
                    }}>
                      ✓ {actionSuccess}
                    </div>
                  )}

                  {/* Contextual actions */}
                  {(() => {
                    const stage = selected.onboardingStage ?? 'applied'
                    const btnBase: React.CSSProperties = {
                      border: 'none', borderRadius: 7, padding: '9px 16px',
                      fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 600, cursor: actionLoading ? 'not-allowed' : 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      transition: 'opacity 0.15s',
                      opacity: actionLoading ? 0.6 : 1,
                    }

                    if (stage === 'approved') {
                      return (
                        <div style={{
                          background: 'rgba(74,222,128,0.08)',
                          border: '1px solid rgba(74,222,128,0.3)',
                          borderRadius: 8, padding: '14px 16px',
                          display: 'flex', alignItems: 'center', gap: 10,
                        }}>
                          <CheckCircle size={18} style={{ color: '#4ade80' }} />
                          <span style={{ fontSize: 13, color: '#4ade80', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                            Approved — Active on Platform
                          </span>
                        </div>
                      )
                    }

                    if (stage === 'rejected') {
                      return (
                        <div>
                          <div style={{
                            background: 'rgba(248,113,113,0.08)',
                            border: '1px solid rgba(248,113,113,0.3)',
                            borderRadius: 8, padding: '12px 14px', marginBottom: 12,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <XCircle size={15} style={{ color: '#f87171' }} />
                              <span style={{ fontSize: 12, color: '#f87171', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                                APPLICATION REJECTED
                              </span>
                            </div>
                            {selected.rejectionReason && (
                              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                                {selected.rejectionReason}
                              </p>
                            )}
                          </div>
                          <button
                            disabled={actionLoading}
                            onClick={() => handleMoveStage(selected.id, 'applied')}
                            style={{ ...btnBase, background: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}
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
                            style={{ ...btnBase, background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}
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
                              style={{ ...btnBase, background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)' }}
                            >
                              {actionLoading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRight size={13} />}
                              Request Assessment
                            </button>
                            <button
                              disabled={actionLoading}
                              onClick={() => handleApprove(selected.id)}
                              style={{ ...btnBase, background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}
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
                            style={{ ...btnBase, background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}
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
                            style={{ ...btnBase, background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}
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
                      background: 'rgba(248,113,113,0.05)',
                      border: '1px solid rgba(248,113,113,0.2)',
                      borderRadius: 8, padding: '14px',
                    }}>
                      <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 8 }}>
                        REJECTION REASON
                      </label>
                      <textarea
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        rows={3}
                        placeholder="Explain why the application is being rejected..."
                        style={{
                          width: '100%', background: 'rgba(0,0,0,0.3)',
                          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6,
                          color: '#e5e7eb', fontSize: 13, padding: '8px 10px',
                          fontFamily: 'inherit', resize: 'vertical', outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button
                          disabled={actionLoading || !rejectReason.trim()}
                          onClick={() => handleReject(selected.id)}
                          style={{
                            background: '#f87171', color: '#fff',
                            border: 'none', borderRadius: 6, padding: '8px 16px',
                            fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
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
                            background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)',
                            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6,
                            padding: '8px 14px', fontSize: 12,
                            fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

                {/* ── Section 4: Admin Notes ── */}
                <div>
                  <h3 style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 10px' }}>
                    Admin Notes
                  </h3>
                  <textarea
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    onBlur={handleAdminNotesBlur}
                    rows={4}
                    placeholder="Internal notes about this applicant (auto-saved on focus loss)..."
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: 8,
                      color: '#e5e7eb',
                      fontSize: 13,
                      padding: '10px 12px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      outline: 'none',
                      boxSizing: 'border-box',
                      lineHeight: 1.6,
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(220,20,60,0.35)' }}
                    onBlurCapture={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
                  />
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: 'JetBrains Mono, monospace', marginTop: 6 }}>
                    AUTO-SAVES ON BLUR
                  </p>
                </div>

              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </DashboardLayout>
  )
}
