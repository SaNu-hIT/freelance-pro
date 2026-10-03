'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Search,
  ChevronDown,
  ChevronUp,
  Users,
  Layers,
  Zap,
  Loader2,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useCurrencySymbol } from '@/lib/store'
import { useSkillTaxonomyStore, SkillGroup } from '@/lib/skillTaxonomyStore'
import { freelancersApi, projectsApi } from '@/lib/api'
import { FreelancerProfile, Project } from '@/lib/types'
import { apiError } from '@/lib/utils'
import ErrorBanner from '@/components/ui/ErrorBanner'

// ─── Types ────────────────────────────────────────────────────────────────────

type AvailabilityStatus = 'available' | 'on_project' | 'ending_soon'
type Track = 'professional' | 'intern'

interface Resource {
  id: string
  name: string
  email: string
  avatar: string
  avatarColor: string
  skills: string[]
  domain: string
  domainColor: string
  experience: number
  hourlyRate: number
  status: AvailabilityStatus
  currentProject?: string
  projectEndDate?: string
  availableFrom?: string
  bio: string
  track: Track
  hoursPerWeek?: number
}

// The list response also carries the saved availability, which the shared type leaves out
type FreelancerRow = FreelancerProfile & { availability?: { hoursPerWeek?: number } | null }

const ENDING_SOON_DAYS = 30
const OTHER_DOMAIN = 'Other'
const OTHER_COLOR = 'var(--text-muted)'

// ─── Derive resources from freelancers + their open projects ─────────────────

function initialsOf(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// The skill group sharing the most skills with the freelancer
function primaryGroup(skills: string[], groups: SkillGroup[]): SkillGroup | null {
  let best: SkillGroup | null = null
  let bestCount = 0
  for (const g of groups) {
    const count = g.skills.filter(s => skills.includes(s)).length
    if (count > bestCount) { best = g; bestCount = count }
  }
  return best
}

function toResource(f: FreelancerRow, projects: Project[], groups: SkillGroup[], today: Date): Resource {
  const group = primaryGroup(f.skills ?? [], groups)
  const open = projects.filter(p =>
    p.status !== 'completed' &&
    (p.assignedTo === f.id || (p.teamMembers ?? []).some(m => m.id === f.id)),
  )

  let status: AvailabilityStatus = 'available'
  let currentProject: string | undefined
  let projectEndDate: string | undefined
  let availableFrom: string | undefined
  if (open.length > 0) {
    status = 'on_project'
    const last = [...open].sort((x, y) => (x.deadline ?? '').localeCompare(y.deadline ?? '')).pop()!
    currentProject = last.title
    // Free after the last open project's deadline; unknown if any has no deadline or it has passed
    if (open.every(p => p.deadline) && daysBetween(last.deadline, today) >= 0) {
      projectEndDate = last.deadline
      const next = new Date(last.deadline)
      next.setUTCDate(next.getUTCDate() + 1)
      availableFrom = next.toISOString().slice(0, 10)
      if (daysBetween(last.deadline, today) <= ENDING_SOON_DAYS) status = 'ending_soon'
    }
  }

  return {
    id: f.id,
    name: f.user?.name ?? '—',
    email: f.user?.email ?? '',
    avatar: initialsOf(f.user?.name ?? '?'),
    avatarColor: 'var(--fg)',
    skills: f.skills ?? [],
    domain: group?.name ?? OTHER_DOMAIN,
    domainColor: group?.color ?? OTHER_COLOR,
    experience: f.experience,
    hourlyRate: Number(f.hourlyRate),
    status,
    currentProject,
    projectEndDate,
    availableFrom,
    bio: f.bio ?? '',
    track: f.track ?? 'professional',
    hoursPerWeek: f.availability?.hoursPerWeek,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysBetween(fromIso: string, toDate: Date): number {
  const from = new Date(fromIso)
  return Math.ceil((from.getTime() - toDate.getTime()) / (1000 * 60 * 60 * 24))
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AvatarCircle({ initials, color, size = 44 }: { initials: string; color: string; size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-full shrink-0 font-bold text-primary-ui"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, color-mix(in srgb, ${color} 60%, transparent), ${color})`,
        fontSize: size * 0.3,
        border: `1.5px solid color-mix(in srgb, ${color} 33%, transparent)`,
      }}
    >
      {initials}
    </div>
  )
}

function AvailabilityBadge({ resource, today }: { resource: Resource; today: Date }) {
  if (resource.status === 'available') {
    return (
      <span
        className="flex items-center gap-1.5 text-mono-label px-2.5 py-1 rounded-full"
        style={{
          fontSize: '10px',
          background: 'rgb(var(--fg-rgb) / 0.08)',
          border: '1px solid rgb(var(--fg-rgb) / 0.25)',
          color: 'var(--fg)',
        }}
      >
        <span style={{ fontSize: 8 }}>●</span> Available Now
      </span>
    )
  }
  if (resource.status === 'ending_soon' && resource.projectEndDate) {
    const days = daysBetween(resource.projectEndDate, today)
    return (
      <span
        className="flex items-center gap-1.5 text-mono-label px-2.5 py-1 rounded-full"
        style={{
          fontSize: '10px',
          background: 'rgb(var(--fg-rgb) / 0.08)',
          border: '1px solid rgb(var(--fg-rgb) / 0.25)',
          color: 'var(--fg)',
        }}
      >
        <span style={{ fontSize: 9 }}>◷</span> Free in {days}d
      </span>
    )
  }
  if (resource.status === 'on_project' && resource.availableFrom) {
    return (
      <span
        className="flex items-center gap-1.5 text-mono-label px-2.5 py-1 rounded-full"
        style={{
          fontSize: '10px',
          background: 'rgb(var(--fg-rgb) / 0.08)',
          border: '1px solid rgb(var(--fg-rgb) / 0.2)',
          color: 'var(--text-muted)',
        }}
      >
        <span style={{ fontSize: 8 }}>⬛</span> On Project · Free {formatShortDate(resource.availableFrom)}
      </span>
    )
  }
  if (resource.status === 'on_project') {
    return (
      <span
        className="flex items-center gap-1.5 text-mono-label px-2.5 py-1 rounded-full"
        style={{
          fontSize: '10px',
          background: 'rgb(var(--fg-rgb) / 0.08)',
          border: '1px solid rgb(var(--fg-rgb) / 0.2)',
          color: 'var(--text-muted)',
        }}
        title={resource.currentProject}
      >
        <span style={{ fontSize: 8 }}>⬛</span> On Project
      </span>
    )
  }
  return null
}

function TrackBadge({ track }: { track: Track }) {
  if (track === 'professional') {
    return (
      <span
        className="text-mono-label px-2 py-0.5 rounded"
        style={{
          fontSize: '9px',
          background: 'rgb(var(--fg-rgb) / 0.12)',
          border: '1px solid rgb(var(--fg-rgb) / 0.3)',
          color: 'var(--fg)',
        }}
      >
        PROFESSIONAL
      </span>
    )
  }
  return (
    <span
      className="text-mono-label px-2 py-0.5 rounded"
      style={{
        fontSize: '9px',
        background: 'rgb(var(--fg-rgb) / 0.1)',
        border: '1px solid rgb(var(--fg-rgb) / 0.3)',
        color: 'var(--fg)',
      }}
    >
      INTERN
    </span>
  )
}

// ─── Member Card (By Member view) ─────────────────────────────────────────────

function MemberCard({
  resource,
  today,
  curr,
  selectedSkill,
}: {
  resource: Resource
  today: Date
  curr: string
  selectedSkill: string | null
}) {
  const color = resource.domainColor
  const dimmed = selectedSkill !== null && !resource.skills.includes(selectedSkill)
  const MAX_SKILLS = 6

  return (
    <div
      className="glass-card rounded-xl p-5 flex flex-col gap-4 transition-all duration-200 hover:border-[var(--fg)]"
      style={{
        opacity: dimmed ? 0.3 : 1,
        transition: 'opacity 0.2s ease, border-color 0.2s ease',
      }}
    >
      {/* Top row: avatar + name + domain + track */}
      <div className="flex items-start gap-3">
        <AvatarCircle initials={resource.avatar} color={resource.avatarColor} size={44} />
        <div className="flex-1 min-w-0">
          <p className="text-primary-ui font-bold text-sm truncate leading-tight">{resource.name}</p>
          <p className="text-mono-label truncate" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            {resource.email}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {/* Domain chip */}
            <span
              className="text-mono-label px-2 py-0.5 rounded"
              style={{
                fontSize: '9px',
                background: `color-mix(in srgb, ${color} 9%, transparent)`,
                border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
                color,
              }}
            >
              {resource.domain}
            </span>
            <TrackBadge track={resource.track} />
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-1.5">
        {resource.skills.slice(0, MAX_SKILLS).map(skill => (
          <span
            key={skill}
            className="glass-card-dark text-mono-label px-2 py-0.5 rounded transition-all"
            style={{
              fontSize: '10px',
              color: selectedSkill === skill ? 'var(--fg)' : 'rgb(var(--fg-rgb) / .55)',
              border: selectedSkill === skill ? '1px solid rgb(var(--fg-rgb) / 0.5)' : undefined,
              background: selectedSkill === skill ? 'rgb(var(--fg-rgb) / 0.08)' : undefined,
            }}
          >
            {skill}
          </span>
        ))}
        {resource.skills.length > MAX_SKILLS && (
          <span
            className="text-mono-label px-2 py-0.5 rounded"
            style={{ fontSize: '10px', color: 'var(--text-muted)' }}
          >
            +{resource.skills.length - MAX_SKILLS} more
          </span>
        )}
      </div>

      {/* Bio */}
      {resource.bio && (
        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-muted)' }}>
          {resource.bio}
        </p>
      )}

      {/* Bottom: exp + rate + availability */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--input-bg)]">
        <div className="flex items-center gap-3">
          <span className="text-mono-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {resource.experience} yr exp
            {resource.hoursPerWeek ? ` · ${resource.hoursPerWeek}h/wk` : ''}
          </span>
          <span className="text-mono-label font-bold" style={{ fontSize: '11px', color: 'var(--fg)' }}>
            {curr}{resource.hourlyRate}/hr
          </span>
        </div>
        <AvailabilityBadge resource={resource} today={today} />
      </div>
    </div>
  )
}

// ─── Member Chip (By Domain view) ─────────────────────────────────────────────

function MemberChip({
  resource,
  highlighted,
  today,
}: {
  resource: Resource
  highlighted: boolean
  today: Date
}) {
  const dotColor =
    resource.status === 'available'
      ? 'var(--fg)'
      : resource.status === 'ending_soon'
      ? 'var(--fg)'
      : 'rgb(var(--fg-rgb) / .55)'

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all shrink-0"
      style={{
        background: highlighted
          ? 'rgb(var(--fg-rgb) / 0.1)'
          : 'var(--input-bg)',
        border: highlighted
          ? '1px solid rgb(var(--fg-rgb) / 0.4)'
          : '1px solid var(--border)',
      }}
    >
      <AvatarCircle initials={resource.avatar} color={resource.avatarColor} size={28} />
      <span className="text-primary-ui text-xs font-medium whitespace-nowrap">{resource.name}</span>
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: dotColor, boxShadow: `0 0 4px ${dotColor}` }}
      />
    </div>
  )
}

// ─── Domain Section (By Domain view) ─────────────────────────────────────────

function DomainSection({
  domain,
  color,
  resources,
  selectedSkill,
  collapsed,
  onToggle,
  today,
}: {
  domain: string
  color: string
  resources: Resource[]
  selectedSkill: string | null
  collapsed: boolean
  onToggle: () => void
  today: Date
}) {
  const Icon = Layers

  // Skills cloud: unique skills + count
  const skillCounts = useMemo(() => {
    const map: Record<string, number> = {}
    resources.forEach(r => r.skills.forEach(s => { map[s] = (map[s] ?? 0) + 1 }))
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [resources])

  return (
    <div
      className="glass-card rounded-xl overflow-hidden"
      style={{ borderColor: collapsed ? 'var(--input-bg)' : `color-mix(in srgb, ${color} 15%, transparent)` }}
    >
      {/* Domain header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-[var(--row-hover-bg)]"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `color-mix(in srgb, ${color} 9%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 19%, transparent)` }}
          >
            <Icon size={15} color={color} />
          </div>
          <span className="text-primary-ui font-bold text-sm">{domain}</span>
          <span
            className="text-mono-label px-2 py-0.5 rounded-full"
            style={{
              fontSize: '10px',
              background: `color-mix(in srgb, ${color} 9%, transparent)`,
              border: `1px solid color-mix(in srgb, ${color} 19%, transparent)`,
              color,
            }}
          >
            {resources.length} members
          </span>
        </div>
        <div style={{ color: 'var(--text-muted)' }}>
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </div>
      </button>

      {/* Expanded content */}
      {!collapsed && (
        <div className="px-5 pb-5 space-y-4">
          {/* Member chips row (scrollable) */}
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
            {resources.map(r => (
              <MemberChip
                key={r.id}
                resource={r}
                highlighted={selectedSkill !== null && r.skills.includes(selectedSkill)}
                today={today}
              />
            ))}
          </div>

          {/* Skills cloud */}
          <div>
            <p
              className="text-mono-label mb-2"
              style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.1em' }}
            >
              SKILLS IN THIS DOMAIN
            </p>
            <div className="flex flex-wrap gap-1.5">
              {skillCounts.map(([skill, count]) => (
                <span
                  key={skill}
                  className="text-mono-label px-2.5 py-1 rounded transition-all"
                  style={{
                    fontSize: '10px',
                    background: selectedSkill === skill ? 'rgb(var(--fg-rgb) / 0.12)' : 'var(--input-bg)',
                    border: selectedSkill === skill
                      ? '1px solid rgb(var(--fg-rgb) / 0.45)'
                      : `1px solid color-mix(in srgb, ${color} 13%, transparent)`,
                    color: selectedSkill === skill ? 'var(--fg)' : 'rgb(var(--fg-rgb) / .55)',
                  }}
                >
                  {skill}
                  <span style={{ color: color, marginLeft: 4, opacity: 0.8 }}>({count})</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminResourcesPage() {
  const curr = useCurrencySymbol()
  const [today] = useState(() => new Date())

  const { groups: skillGroups, fetch: fetchGroups, error: groupsError } = useSkillTaxonomyStore()
  useEffect(() => { fetchGroups() }, [fetchGroups])

  const [freelancers, setFreelancers] = useState<FreelancerRow[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([freelancersApi.getAll({ status: 'active' }), projectsApi.getAll()])
      .then(([fRes, pRes]) => {
        if (cancelled) return
        setFreelancers(Array.isArray(fRes.data) ? fRes.data : fRes.data?.data ?? [])
        setProjects(Array.isArray(pRes.data) ? pRes.data : pRes.data?.data ?? [])
      })
      .catch(err => { if (!cancelled) setLoadError(apiError(err, 'Could not load resources')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const resources = useMemo(
    () => freelancers.map(f => toResource(f, projects, skillGroups, today)),
    [freelancers, projects, skillGroups, today],
  )

  const [view, setView] = useState<'member' | 'domain'>('member')
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [collapsedDomains, setCollapsedDomains] = useState<Set<string>>(new Set())

  // ── Skills within the active group (for drill-down) ──────────────────────
  const activeGroup = useMemo(
    () => skillGroups.find(g => g.id === selectedGroupId) ?? null,
    [skillGroups, selectedGroupId],
  )

  // All raw skills across all resources (for unmapped detection)
  const allSkills = useMemo(() => {
    const set = new Set<string>()
    resources.forEach(r => r.skills.forEach(s => set.add(s)))
    return Array.from(set).sort()
  }, [resources])

  // Skills not mapped to any group
  const unmappedSkills = useMemo(() => {
    const mapped = new Set(skillGroups.flatMap(g => g.skills))
    return allSkills.filter(s => !mapped.has(s))
  }, [allSkills, skillGroups])

  // ── Filtered resources ───────────────────────────────────────────────────
  const filteredResources = useMemo(() => {
    const q = search.toLowerCase()
    return resources.filter(r => {
      const matchSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.skills.some(s => s.toLowerCase().includes(q))
      // If a specific skill is selected (drill-down), match it
      const matchSkill = !selectedSkill || r.skills.includes(selectedSkill)
      // If a group is selected (but no specific skill), match any skill in that group
      const matchGroup = !selectedGroupId || !activeGroup || activeGroup.skills.some(s => r.skills.includes(s))
      return matchSearch && matchSkill && matchGroup
    })
  }, [resources, search, selectedSkill, selectedGroupId, activeGroup])

  // ── Domain groups ────────────────────────────────────────────────────────
  const domainGroups = useMemo(() => {
    const map: Record<string, Resource[]> = {}
    filteredResources.forEach(r => {
      if (!map[r.domain]) map[r.domain] = []
      map[r.domain]!.push(r)
    })
    return map
  }, [filteredResources])

  // Skill groups in their configured order, then freelancers matching none
  const domainOrder = useMemo(
    () => [...skillGroups.map(g => g.name), OTHER_DOMAIN],
    [skillGroups],
  )

  // ── Info bar data ────────────────────────────────────────────────────────
  const infoBar = useMemo(() => {
    if (!selectedSkill && !selectedGroupId) return null
    const matching = selectedSkill
      ? resources.filter(r => r.skills.includes(selectedSkill))
      : activeGroup
        ? resources.filter(r => activeGroup.skills.some(s => r.skills.includes(s)))
        : []
    const availableNow = matching.filter(r => r.status === 'available').length
    const futureDates = matching
      .filter(r => r.status !== 'available' && r.availableFrom)
      .map(r => new Date(r.availableFrom!).getTime())
    const earliest =
      futureDates.length > 0
        ? new Date(Math.min(...futureDates)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : null
    return {
      count: matching.length,
      availableNow,
      earliest,
      label: selectedSkill ?? activeGroup?.name ?? '',
      color: activeGroup?.color ?? 'var(--fg)',
    }
  }, [resources, selectedSkill, selectedGroupId, activeGroup])

  // ── Domain collapse logic for selected skill ─────────────────────────────
  const effectiveCollapsed = useMemo(() => {
    if (!selectedSkill) return collapsedDomains
    const domainsWithSkill = new Set(
      resources.filter(r => r.skills.includes(selectedSkill)).map(r => r.domain)
    )
    const result = new Set<string>()
    domainOrder.forEach(domain => {
      if (!domainsWithSkill.has(domain)) result.add(domain)
    })
    return result
  }, [resources, selectedSkill, collapsedDomains, domainOrder])

  function toggleDomain(d: string) {
    setCollapsedDomains(prev => {
      const next = new Set(prev)
      next.has(d) ? next.delete(d) : next.add(d)
      return next
    })
  }

  function toggleGroup(groupId: string) {
    if (selectedGroupId === groupId) {
      setSelectedGroupId(null)
      setSelectedSkill(null)
    } else {
      setSelectedGroupId(groupId)
      setSelectedSkill(null)
    }
  }

  function toggleSkill(skill: string) {
    setSelectedSkill(prev => (prev === skill ? null : skill))
    if (!selectedGroupId) {
      // find which group this skill belongs to
      const group = skillGroups.find(g => g.skills.includes(skill))
      if (group) setSelectedGroupId(group.id)
    }
  }

  function clearFilters() {
    setSelectedGroupId(null)
    setSelectedSkill(null)
  }

  // ── Stat counts ──────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: resources.length,
    available: resources.filter(r => r.status === 'available').length,
    endingSoon: resources.filter(r => r.status === 'ending_soon').length,
    onProject: resources.filter(r => r.status === 'on_project').length,
  }), [resources])

  return (
    <DashboardLayout allowedRoles={['admin']}>
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="mb-8">
        <p className="text-mono-label mb-1">TALENT MANAGEMENT</p>
        <h1 className="text-display text-4xl text-primary-ui">RESOURCES</h1>
        <p className="text-mono-label mt-1" style={{ color: 'var(--text-muted)' }}>
          Unassigned &amp; upcoming availability across your team
        </p>
      </div>

      {(loadError || groupsError) && (
        <div className="space-y-2 mb-6">
          {loadError && <ErrorBanner title="Could not load resources" message={loadError} />}
          {groupsError && <ErrorBanner title="Could not load skill groups" message={groupsError} />}
        </div>
      )}

      {/* ── Stat Chips ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'TOTAL RESOURCES', value: stats.total, color: 'var(--fg)', icon: Users },
          { label: 'AVAILABLE NOW', value: stats.available, color: 'var(--fg)', icon: Zap },
          { label: 'ENDING SOON', value: stats.endingSoon, color: 'var(--fg)', icon: null },
          { label: 'ON PROJECT', value: stats.onProject, color: 'var(--text-muted)', icon: null },
        ].map(item => (
          <div key={item.label} className="glass-card metric-card rounded-lg">
            <p className="text-mono-label mb-2">{item.label}</p>
            <p className="text-2xl font-bold" style={{ color: item.color }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── View Toggle ───────────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-6">
        {(['member', 'domain'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className="px-5 py-2 rounded text-xs transition-all text-mono-label"
            style={
              view === v
                ? {
                    background: 'var(--fg)',
                    color: 'var(--bg)',
                    border: '1px solid var(--fg)',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.06em',
                  }
                : {
                    background: 'var(--input-bg)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.06em',
                  }
            }
          >
            {v === 'member' ? 'By Member' : 'By Domain'}
          </button>
        ))}
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="glass-card-dark rounded-xl p-4 mb-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by name or skill..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9 py-2.5 text-sm w-full"
          />
        </div>

        {/* Group chips */}
        <div>
          <p className="text-mono-label mb-2" style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.12em' }}>
            FILTER BY SKILL GROUP
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {skillGroups.filter(g => g.skills.length > 0).map(group => {
              const active = selectedGroupId === group.id
              return (
                <button
                  key={group.id}
                  onClick={() => toggleGroup(group.id)}
                  className="flex items-center gap-1.5 shrink-0 text-mono-label px-3 py-1.5 rounded-lg transition-all"
                  style={{
                    fontSize: '11px',
                    background: active ? `color-mix(in srgb, ${group.color} 13%, transparent)` : 'var(--input-bg)',
                    border: active ? `1px solid color-mix(in srgb, ${group.color} 38%, transparent)` : '1px solid var(--border)',
                    color: active ? group.color : 'var(--text-secondary)',
                    fontWeight: active ? 700 : 400,
                  }}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: group.color }} />
                  {group.name}
                  <span style={{ opacity: 0.6, fontSize: 9 }}>({group.skills.length})</span>
                </button>
              )
            })}
            {unmappedSkills.length > 0 && (
              <button
                onClick={() => toggleGroup('__unmapped__')}
                className="flex items-center gap-1.5 shrink-0 text-mono-label px-3 py-1.5 rounded-lg transition-all"
                style={{
                  fontSize: '11px',
                  background: selectedGroupId === '__unmapped__' ? 'rgb(var(--fg-rgb) / 0.15)' : 'var(--input-bg)',
                  border: selectedGroupId === '__unmapped__' ? '1px solid rgb(var(--fg-rgb) / 0.4)' : '1px solid var(--border)',
                  color: 'var(--text-muted)',
                }}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--text-muted)' }} />
                Other
                <span style={{ opacity: 0.6, fontSize: 9 }}>({unmappedSkills.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Drill-down: skill chips within selected group */}
        {activeGroup && activeGroup.skills.length > 0 && (
          <div>
            <p className="text-mono-label mb-2" style={{ fontSize: '9px', color: activeGroup.color, letterSpacing: '0.12em' }}>
              ↳ DRILL DOWN IN {activeGroup.name.toUpperCase()}
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {activeGroup.skills
                .filter(s => allSkills.includes(s))
                .map(skill => {
                  const isActive = selectedSkill === skill
                  return (
                    <button
                      key={skill}
                      onClick={() => toggleSkill(skill)}
                      className="shrink-0 text-mono-label px-2.5 py-1 rounded transition-all"
                      style={{
                        fontSize: '10px',
                        background: isActive ? activeGroup.color : `color-mix(in srgb, ${activeGroup.color} 6%, transparent)`,
                        border: `1px solid ${isActive ? activeGroup.color : `color-mix(in srgb, ${activeGroup.color} 19%, transparent)`}`,
                        color: isActive ? 'var(--bg)' : activeGroup.color,
                      }}
                    >
                      {skill}
                    </button>
                  )
                })}
            </div>
          </div>
        )}
      </div>

      {/* ── Active Filter Info Bar ─────────────────────────────────────────── */}
      {infoBar && (
        <div
          className="rounded-lg px-4 py-3 mb-6 flex flex-wrap items-center gap-3"
          style={{
            background: `color-mix(in srgb, ${infoBar.color} 3%, transparent)`,
            border: `1px solid color-mix(in srgb, ${infoBar.color} 21%, transparent)`,
          }}
        >
          <span className="text-mono-label" style={{ fontSize: '11px', color: infoBar.color, letterSpacing: '0.06em' }}>
            <span className="font-bold text-primary-ui">{infoBar.count}</span> developer{infoBar.count !== 1 ? 's' : ''} match{' '}
            <span className="font-bold" style={{ color: infoBar.color }}>{infoBar.label}</span>
          </span>
          <span className="text-mono-label px-2.5 py-0.5 rounded"
            style={{ fontSize: '10px', background: 'rgb(var(--fg-rgb) / 0.1)', border: '1px solid rgb(var(--fg-rgb) / 0.3)', color: 'var(--fg)' }}>
            {infoBar.availableNow} available now
          </span>
          {infoBar.earliest && (
            <span className="text-mono-label px-2.5 py-0.5 rounded"
              style={{ fontSize: '10px', background: 'rgb(var(--fg-rgb) / 0.1)', border: '1px solid rgb(var(--fg-rgb) / 0.3)', color: 'var(--fg)' }}>
              Next available: {infoBar.earliest}
            </span>
          )}
          <button onClick={clearFilters} className="ml-auto text-mono-label text-xs" style={{ color: 'var(--text-muted)' }}>
            ✕ Clear
          </button>
        </div>
      )}

      {/* ── BY MEMBER VIEW ────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-20">
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--fg)' }} />
          <span className="text-mono-label" style={{ color: 'var(--text-muted)' }}>LOADING RESOURCES...</span>
        </div>
      )}

      {!loading && !loadError && view === 'member' && (
        <>
          {filteredResources.length === 0 ? (
            <div className="text-center py-20">
              <Users size={32} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
              <p
                className="text-mono-label text-lg"
                style={{ color: 'var(--text-muted)' }}
              >
                NO RESOURCES FOUND
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredResources.map(r => (
                <MemberCard
                  key={r.id}
                  resource={r}
                  today={today}
                  curr={curr}
                  selectedSkill={selectedSkill}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── BY DOMAIN VIEW ────────────────────────────────────────────────── */}
      {!loading && !loadError && view === 'domain' && (
        <div className="space-y-4">
          {domainOrder
            .filter(d => domainGroups[d] && domainGroups[d].length > 0)
            .map(domain => (
              <DomainSection
                key={domain}
                domain={domain}
                color={skillGroups.find(g => g.name === domain)?.color ?? OTHER_COLOR}
                resources={domainGroups[domain]}
                selectedSkill={selectedSkill}
                collapsed={effectiveCollapsed.has(domain)}
                onToggle={() => toggleDomain(domain)}
                today={today}
              />
            ))}

          {Object.keys(domainGroups).length === 0 && (
            <div className="text-center py-20">
              <Layers size={32} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
              <p className="text-mono-label text-lg" style={{ color: 'var(--text-muted)' }}>
                NO DOMAINS TO DISPLAY
              </p>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  )
}
