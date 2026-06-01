'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, ExternalLink, Mail, Clock, DollarSign, Star,
  Calendar, AlertTriangle, CheckCircle2, Circle, ChevronRight,
  Layers, Activity, Shield, Zap, Globe,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { freelancersApi, projectsApi, worklogsApi, tasksApi } from '@/lib/api'
import { FreelancerProfile, Project, Worklog, ProjectTask, ProjectStatus } from '@/lib/types'
import { useCurrencySymbol } from '@/lib/store'
import { useFreelancerStore, DEFAULT_AVAILABILITY, AvailabilityConfig, DayKey } from '@/lib/freelancerStore'

const DAY_LABELS: { key: DayKey; short: string }[] = [
  { key: 'mon', short: 'Mon' },
  { key: 'tue', short: 'Tue' },
  { key: 'wed', short: 'Wed' },
  { key: 'thu', short: 'Thu' },
  { key: 'fri', short: 'Fri' },
  { key: 'sat', short: 'Sat' },
  { key: 'sun', short: 'Sun' },
]

function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return m === 0 ? `${h12}${ampm}` : `${h12}:${m.toString().padStart(2,'0')}${ampm}`
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function fmtDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtShortDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function daysAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  const d = Math.floor(ms / 86400000)
  if (d === 0) return 'today'
  if (d === 1) return '1 day ago'
  return `${d} days ago`
}

function isOverdue(deadline: string) {
  return new Date(deadline) < new Date()
}

const STATUS_META: Record<ProjectStatus, { label: string; color: string; bg: string }> = {
  new:              { label: 'New',            color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
  assigned:         { label: 'Assigned',       color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  in_progress:      { label: 'In Progress',    color: '#4ade80', bg: 'rgba(74,222,128,0.12)'  },
  blocked:          { label: 'Blocked',        color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  pending_approval: { label: 'Pending Review', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)'  },
  completed:        { label: 'Completed',      color: '#4ade80', bg: 'rgba(74,222,128,0.12)'  },
  delayed:          { label: 'Delayed',        color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
}

function StatusPill({ status }: { status: ProjectStatus }) {
  const m = STATUS_META[status] ?? STATUS_META.new
  return (
    <span style={{ background: m.bg, color: m.color, fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      {m.label}
    </span>
  )
}

const card: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  padding: 20,
}

const sectionTitle = (icon: React.ReactNode, text: string, count?: number): React.ReactNode => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
    <span style={{ color: '#DC143C' }}>{icon}</span>
    <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
      {text}{count !== undefined ? ` (${count})` : ''}
    </span>
  </div>
)

// ── Main page ──────────────────────────────────────────────────────────────────

export default function FreelancerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const curr = useCurrencySymbol()

  const [profile, setProfile]   = useState<FreelancerProfile | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [worklogs, setWorklogs] = useState<Worklog[]>([])
  const [taskMap, setTaskMap]   = useState<Record<string, ProjectTask[]>>({})
  const [loading, setLoading]   = useState(true)
  const [avail, setAvail]         = useState<AvailabilityConfig>(DEFAULT_AVAILABILITY)
  const fetchAvailability = useFreelancerStore(s => s.fetchAvailability)
  const getAvailability   = useFreelancerStore(s => s.getAvailability)

  useEffect(() => {
    if (!id) return
    freelancersApi.getOne(id).then(async fRes => {
      const p: FreelancerProfile = fRes.data
      setProfile(p)
      // Load availability from DB then update local state
      await fetchAvailability(p.id)
      setAvail(getAvailability(p.id))

      const [r1, r2, wRes] = await Promise.all([
        projectsApi.getAll({ assignedTo: id }),
        projectsApi.getAll({ freelancerUserId: p.userId }),
        worklogsApi.getAll({ freelancerId: id, limit: 50 }),
      ])
      const list1: Project[] = r1.data?.data ?? r1.data ?? []
      const list2: Project[] = r2.data?.data ?? r2.data ?? []
      const seen = new Set<string>()
      const merged = [...list1, ...list2].filter(proj => {
        if (seen.has(proj.id)) return false
        seen.add(proj.id)
        return true
      })
      setProjects(merged)
      const wData = wRes.data?.data ?? wRes.data ?? []
      setWorklogs(Array.isArray(wData) ? wData : [])

      const taskResults = await Promise.all(merged.map(proj => tasksApi.getByProject(proj.id)))
      const map: Record<string, ProjectTask[]> = {}
      merged.forEach((proj, i) => {
        const all: ProjectTask[] = taskResults[i].data ?? []
        map[proj.id] = all.filter(t => t.assignedFreelancerId === id)
      })
      setTaskMap(map)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <DashboardLayout allowedRoles={['admin']}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
        <div style={{ width: 28, height: 28, border: '3px solid rgba(220,20,60,0.2)', borderTopColor: '#DC143C', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-muted)' }}>LOADING TEAM MEMBER...</span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </DashboardLayout>
  )

  if (!profile) return (
    <DashboardLayout allowedRoles={['admin']}>
      <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
        Freelancer not found.
      </div>
    </DashboardLayout>
  )

  // ── Derived stats ────────────────────────────────────────────────────────────

  const sortedLogs    = [...worklogs].sort((a, b) => b.date.localeCompare(a.date))
  const lastLog       = sortedLogs[0]
  const lastActive    = lastLog ? daysAgo(lastLog.date) : 'Never'
  const isRecentlyActive = lastLog && new Date(lastLog.date) >= new Date(Date.now() - 7 * 86400000)

  const thisWeek      = new Date(); thisWeek.setDate(thisWeek.getDate() - 7)
  const weekHours     = worklogs.filter(w => new Date(w.date) >= thisWeek).reduce((s, w) => s + Number(w.hoursWorked), 0)
  const totalHours    = worklogs.reduce((s, w) => s + Number(w.hoursWorked), 0)

  const allTasks      = Object.values(taskMap).flat()
  const openTasks     = allTasks.filter(t => !t.completed)
  const doneTasks     = allTasks.filter(t => t.completed)

  const cutoff        = new Date(); cutoff.setDate(cutoff.getDate() - 30)
  const blockers      = sortedLogs.filter(w => w.blockers?.trim() && new Date(w.date) >= cutoff)

  const activeProjects    = projects.filter(p => p.status !== 'completed')
  const blockedProjects   = projects.filter(p => p.status === 'blocked' || p.status === 'delayed')
  const completedProjects = projects.filter(p => p.status === 'completed')

  return (
    <DashboardLayout allowedRoles={['admin']}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Back nav */}
      <button onClick={() => router.back()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', marginBottom: 20, padding: 0 }}>
        <ArrowLeft size={13} /> BACK TO OUR TEAM
      </button>

      {/* ── TWO-COLUMN LAYOUT ───────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'start' }}>

        {/* ════════════════════════════════════════════════════════════════════
            LEFT COLUMN — Profile + Stats + Skills
        ════════════════════════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 24 }}>

          {/* Profile card */}
          <div style={card}>
            {/* Avatar */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingBottom: 18, borderBottom: '1px solid var(--border)', marginBottom: 18 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#8B0000,#DC143C)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 14 }}>
                {getInitials(profile.user.name)}
              </div>
              <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>{profile.user.name}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                <Mail size={11} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{profile.user.email}</span>
              </div>
              {/* Badges */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                <span style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, padding: '3px 10px', borderRadius: 4, letterSpacing: '0.1em' }}>ACTIVE</span>
                {profile.track && (
                  <span style={{ background: profile.track === 'professional' ? 'rgba(167,139,250,0.1)' : 'rgba(251,191,36,0.1)', color: profile.track === 'professional' ? '#a78bfa' : '#fbbf24', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, padding: '3px 10px', borderRadius: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {profile.track}
                  </span>
                )}
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, margin: '0 0 14px' }}>{profile.bio}</p>
            )}

            {/* Portfolio */}
            {profile.portfolioUrl && (
              <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#60a5fa', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', textDecoration: 'none', marginBottom: 14 }}>
                <ExternalLink size={11} /> Portfolio
              </a>
            )}

            {/* Stat rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { icon: <Activity size={13} />,   label: 'Last Active',  value: lastActive,                  color: isRecentlyActive ? '#4ade80' : '#fbbf24' },
                { icon: <Clock size={13} />,       label: 'This Week',    value: `${weekHours}h`,             color: '#60a5fa' },
                { icon: <Shield size={13} />,      label: 'Total Hours',  value: `${totalHours}h`,            color: 'var(--text-primary)' },
                { icon: <Star size={13} />,        label: 'Experience',   value: `${profile.experience} yrs`, color: 'var(--text-primary)' },
                { icon: <DollarSign size={13} />,  label: 'Rate',         value: `${curr}${profile.hourlyRate}/hr`, color: '#DC143C' },
                { icon: <Calendar size={13} />,    label: 'Joined',       value: fmtDate(profile.user.createdAt), color: 'var(--text-muted)' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                  <span style={{ color: '#DC143C', flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', flex: 1 }}>{item.label.toUpperCase()}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: item.color, fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Skills card */}
          {profile.skills?.length > 0 && (
            <div style={card}>
              {sectionTitle(<Zap size={14} />, 'Skills')}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {profile.skills.map(skill => (
                  <span key={skill} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', padding: '4px 10px', borderRadius: 6 }}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Availability card */}
          <div style={card}>
            {sectionTitle(<Globe size={14} />, 'Availability')}
            {/* Days pills */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
              {DAY_LABELS.map(({ key, short }) => {
                const slot = avail.schedule[key]
                return (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <span style={{
                      padding: '4px 8px', borderRadius: 6, fontSize: 10,
                      fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                      letterSpacing: '0.06em',
                      background: slot.enabled ? 'rgba(220,20,60,0.12)' : 'var(--bg-elevated)',
                      color: slot.enabled ? '#DC143C' : 'var(--text-muted)',
                      border: `1px solid ${slot.enabled ? 'rgba(220,20,60,0.3)' : 'var(--border)'}`,
                    }}>
                      {short.toUpperCase()}
                    </span>
                    {slot.enabled && (
                      <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>
                        {fmt12(slot.from)}–{fmt12(slot.to)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            {/* Summary rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { icon: <Clock size={12} />, label: 'Weekly Hours', value: `${avail.hoursPerWeek}h/week` },
                { icon: <Globe size={12} />, label: 'Timezone',     value: avail.timezone },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                  <span style={{ color: '#DC143C', flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', flex: 1 }}>{item.label.toUpperCase()}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity summary card */}
          <div style={card}>
            {sectionTitle(<Activity size={14} />, 'Activity')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Active Projects', value: activeProjects.length,   color: '#60a5fa',  sub: `${completedProjects.length} done` },
                { label: 'Open Tasks',      value: openTasks.length,        color: '#fbbf24',  sub: `${doneTasks.length} done` },
                { label: 'Blockers 30d',    value: blockers.length,         color: blockers.length > 0 ? '#f87171' : '#4ade80',       sub: blockers.length > 0 ? 'attention' : 'all clear' },
                { label: 'At Risk',         value: blockedProjects.length,  color: blockedProjects.length > 0 ? '#f87171' : '#4ade80', sub: blockedProjects.length > 0 ? 'review' : 'on track' },
              ].map(item => (
                <div key={item.label} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 6, textTransform: 'uppercase' }}>{item.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: item.color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{item.value}</div>
                  <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', marginTop: 4 }}>{item.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            RIGHT COLUMN — Blockers · Projects & Tasks · Worklogs
        ════════════════════════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Blockers / Escalations */}
          {blockers.length > 0 && (
            <div style={{ ...card, borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <AlertTriangle size={14} style={{ color: '#f87171' }} />
                <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#f87171', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Active Blockers & Escalations ({blockers.length})
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {blockers.slice(0, 5).map(w => {
                  const proj = projects.find(p => p.id === w.projectId)
                  return (
                    <div key={w.id} style={{ display: 'flex', gap: 14, padding: '12px 14px', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.18)', borderRadius: 10 }}>
                      <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 46 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#f87171', fontFamily: 'JetBrains Mono, monospace' }}>{fmtShortDate(w.date)}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>{daysAgo(w.date)}</div>
                      </div>
                      <div style={{ width: 1, background: 'rgba(248,113,113,0.2)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {proj && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{proj.title}</span>
                            <StatusPill status={proj.status} />
                          </div>
                        )}
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>{w.blockers}</p>
                        {w.nextSteps && (
                          <p style={{ fontSize: 11, color: '#4ade80', margin: '6px 0 0', fontFamily: 'JetBrains Mono, monospace' }}>→ {w.nextSteps}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Projects & Tasks */}
          <div style={card}>
            {sectionTitle(<Layers size={14} />, 'Projects & Tasks', projects.length)}
            {projects.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, textAlign: 'center', padding: '32px 0' }}>No projects assigned.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {projects.map(project => {
                  const sm = STATUS_META[project.status] ?? STATUS_META.new
                  const myTasks = taskMap[project.id] ?? []
                  const myOpen  = myTasks.filter(t => !t.completed)
                  const myDone  = myTasks.filter(t => t.completed)
                  const overdue = isOverdue(project.deadline) && project.status !== 'completed'

                  const sprintMap: Record<string, { sprint: ProjectTask['sprint']; tasks: ProjectTask[] }> = {}
                  myTasks.forEach(t => {
                    const key = t.sprintId ?? 'unassigned'
                    if (!sprintMap[key]) sprintMap[key] = { sprint: t.sprint, tasks: [] }
                    sprintMap[key].tasks.push(t)
                  })

                  return (
                    <div key={project.id} style={{ border: '1px solid var(--border)', borderLeft: `3px solid ${sm.color}`, borderRadius: 10, overflow: 'hidden' }}>
                      {/* Project header — clickable */}
                      <div
                        onClick={() => router.push(`/admin/projects/${project.id}`)}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', background: 'var(--bg-elevated)', cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{project.title}</span>
                            <StatusPill status={project.status} />
                            {project.priority && (
                              <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: project.priority === 'critical' ? '#f87171' : project.priority === 'high' ? '#f97316' : '#fbbf24' }}>
                                {project.priority.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 99, background: project.status === 'blocked' ? '#f87171' : project.status === 'completed' ? '#4ade80' : '#DC143C', width: `${project.progress}%` }} />
                            </div>
                            <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{project.progress}%</span>
                          </div>
                          <div style={{ display: 'flex', gap: 14 }}>
                            <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>{curr}{project.budget?.toLocaleString()}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: overdue ? '#f87171' : 'var(--text-muted)' }}>
                              {overdue && <AlertTriangle size={10} />}
                              Due {fmtDate(project.deadline)}
                            </span>
                          </div>
                        </div>
                        {myTasks.length > 0 && (
                          <div style={{ flexShrink: 0, textAlign: 'right' }}>
                            <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', marginBottom: 4 }}>MY TASKS</div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#4ade80' }}>{myDone.length} done</span>
                              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>·</span>
                              <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: myOpen.length > 0 ? '#fbbf24' : '#4ade80' }}>{myOpen.length} open</span>
                            </div>
                          </div>
                        )}
                        {/* Click indicator */}
                        <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, alignSelf: 'center' }} />
                      </div>

                      {/* Tasks grouped by sprint */}
                      {myTasks.length > 0 && (
                        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {Object.entries(sprintMap).map(([key, { sprint, tasks }]) => (
                            <div key={key}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                <ChevronRight size={11} style={{ color: 'var(--text-muted)' }} />
                                <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                                  {sprint ? sprint.name.toUpperCase() : 'BACKLOG'}
                                </span>
                                {sprint?.startDate && (
                                  <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>
                                    {fmtShortDate(sprint.startDate)} → {sprint.endDate ? fmtShortDate(sprint.endDate) : '…'}
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingLeft: 16 }}>
                                {tasks.map(task => (
                                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {task.completed
                                      ? <CheckCircle2 size={13} style={{ color: '#4ade80', flexShrink: 0 }} />
                                      : <Circle size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                                    <span style={{ fontSize: 13, color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.completed ? 'line-through' : 'none', flex: 1 }}>
                                      {task.title}
                                    </span>
                                    {task.completed && task.completedAt && (
                                      <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                        {fmtShortDate(task.completedAt)}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {myTasks.length === 0 && (
                        <div style={{ padding: '10px 16px' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>No tasks assigned in this project.</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent Worklogs */}
          <div style={card}>
            {sectionTitle(<Clock size={14} />, `Recent Work Logs (${worklogs.length} total · ${totalHours}h)`)}
            {sortedLogs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>No worklogs yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {sortedLogs.slice(0, 8).map((w, i) => {
                  const proj = projects.find(p => p.id === w.projectId)
                  const hasBlocker = !!w.blockers?.trim()
                  return (
                    <div key={w.id} style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: i < Math.min(sortedLogs.length, 8) - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ flexShrink: 0, width: 74, textAlign: 'right' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>{fmtShortDate(w.date)}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: '#DC143C' }}>{w.hoursWorked}h</div>
                      </div>
                      <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          {proj
                            ? <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{proj.title}</span>
                            : <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{w.projectId?.slice(0, 8)}…</span>
                          }
                          {hasBlocker && (
                            <span style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, padding: '1px 6px', borderRadius: 4 }}>BLOCKER</span>
                          )}
                          <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', marginLeft: 'auto' }}>Progress: {w.progress}%</span>
                        </div>
                        {w.tasksCompleted && (
                          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{w.tasksCompleted}</p>
                        )}
                        {hasBlocker && (
                          <p style={{ fontSize: 11, color: '#f87171', margin: '4px 0 0', lineHeight: 1.4, fontStyle: 'italic' }}>⚠ {w.blockers}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
        {/* end right column */}

      </div>
      {/* end two-column */}

    </DashboardLayout>
  )
}
