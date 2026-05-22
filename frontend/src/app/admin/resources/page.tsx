'use client'

import { useState, useMemo } from 'react'
import {
  Search,
  ChevronDown,
  ChevronUp,
  Users,
  Layers,
  Monitor,
  Server,
  Smartphone,
  GitBranch,
  Database,
  Palette,
  Zap,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useCurrencySymbol } from '@/lib/store'

// ─── Types ────────────────────────────────────────────────────────────────────

type AvailabilityStatus = 'available' | 'on_project' | 'ending_soon'
type Domain = 'Frontend' | 'Backend' | 'Mobile' | 'DevOps' | 'Database' | 'Design' | 'Full-Stack'
type Track = 'professional' | 'intern'

interface Resource {
  id: string
  name: string
  email: string
  avatar: string
  avatarColor: string
  skills: string[]
  domain: Domain
  experience: number
  hourlyRate: number
  status: AvailabilityStatus
  currentProject?: string
  projectEndDate?: string
  availableFrom?: string
  bio: string
  track: Track
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
// Today: 2026-05-21

const MOCK_RESOURCES: Resource[] = [
  // ── 5 Available Now ──────────────────────────────────────────────────────
  {
    id: 'r01',
    name: 'Arjun Mehta',
    email: 'arjun.mehta@devteam.io',
    avatar: 'AM',
    avatarColor: '#6366f1',
    skills: ['React', 'TypeScript', 'Tailwind CSS', 'GraphQL', 'Figma'],
    domain: 'Frontend',
    experience: 5,
    hourlyRate: 85,
    status: 'available',
    bio: 'Senior front-end engineer with a passion for design-system-first development. Delivered 10+ SaaS products.',
    track: 'professional',
  },
  {
    id: 'r02',
    name: 'Priya Nair',
    email: 'priya.nair@fullstack.dev',
    avatar: 'PN',
    avatarColor: '#a78bfa',
    skills: ['React', 'Node.js', 'PostgreSQL', 'TypeScript', 'NestJS', 'Docker'],
    domain: 'Full-Stack',
    experience: 7,
    hourlyRate: 105,
    status: 'available',
    bio: 'Full-stack architect who bridges product thinking with robust engineering. Loves event-driven systems.',
    track: 'professional',
  },
  {
    id: 'r03',
    name: 'Lena Fischer',
    email: 'lena.fischer@mobilelab.de',
    avatar: 'LF',
    avatarColor: '#34d399',
    skills: ['Flutter', 'Firebase', 'Firestore', 'React Native', 'Dart'],
    domain: 'Mobile',
    experience: 4,
    hourlyRate: 75,
    status: 'available',
    bio: 'Cross-platform mobile engineer with apps shipped to 500k+ users on both iOS and Android.',
    track: 'professional',
  },
  {
    id: 'r04',
    name: 'Carlos Vega',
    email: 'carlos.vega@backendpro.com',
    avatar: 'CV',
    avatarColor: '#818cf8',
    skills: ['Python', 'Django', 'PostgreSQL', 'Redis', 'AWS', 'GraphQL'],
    domain: 'Backend',
    experience: 6,
    hourlyRate: 90,
    status: 'available',
    bio: 'Python specialist building high-throughput APIs and data pipelines. AWS certified solutions architect.',
    track: 'professional',
  },
  {
    id: 'r05',
    name: 'Ayesha Qureshi',
    email: 'ayesha.q@designsprint.co',
    avatar: 'AQ',
    avatarColor: '#f472b6',
    skills: ['Figma', 'UI/UX', 'Tailwind CSS', 'React', 'CSS'],
    domain: 'Design',
    experience: 3,
    hourlyRate: 60,
    status: 'available',
    bio: 'Product designer and front-end collaborator. Expert at translating wireframes to pixel-perfect Tailwind.',
    track: 'intern',
  },

  // ── 4 Ending Soon (7–30 days from 2026-05-21) ────────────────────────────
  {
    id: 'r06',
    name: 'Tom Kiefer',
    email: 'tom.kiefer@devops.cloud',
    avatar: 'TK',
    avatarColor: '#fb923c',
    skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Terraform', 'GCP'],
    domain: 'DevOps',
    experience: 8,
    hourlyRate: 120,
    status: 'ending_soon',
    currentProject: 'CloudScale Migration',
    projectEndDate: '2026-05-28',
    availableFrom: '2026-05-29',
    bio: 'Cloud-native DevOps engineer with expertise in zero-downtime deployments and multi-cloud architectures.',
    track: 'professional',
  },
  {
    id: 'r07',
    name: 'Sofia Reyes',
    email: 'sofia.reyes@vueworks.mx',
    avatar: 'SR',
    avatarColor: '#60a5fa',
    skills: ['Vue.js', 'TypeScript', 'Node.js', 'MongoDB', 'Tailwind CSS'],
    domain: 'Frontend',
    experience: 4,
    hourlyRate: 70,
    status: 'ending_soon',
    currentProject: 'Retail Dashboard v2',
    projectEndDate: '2026-06-05',
    availableFrom: '2026-06-06',
    bio: 'Vue.js specialist who writes clean, accessible components with strong TypeScript discipline.',
    track: 'professional',
  },
  {
    id: 'r08',
    name: 'Nikhil Shetty',
    email: 'nikhil.shetty@dbmaster.in',
    avatar: 'NS',
    avatarColor: '#fbbf24',
    skills: ['PostgreSQL', 'MongoDB', 'Redis', 'Firebase', 'MySQL', 'Python'],
    domain: 'Database',
    experience: 5,
    hourlyRate: 80,
    status: 'ending_soon',
    currentProject: 'Analytics Warehouse',
    projectEndDate: '2026-06-10',
    availableFrom: '2026-06-11',
    bio: 'Database engineer specializing in query optimization, schema design, and replication strategies.',
    track: 'professional',
  },
  {
    id: 'r09',
    name: 'Jake Thornton',
    email: 'jake.thornton@phpcraft.uk',
    avatar: 'JT',
    avatarColor: '#818cf8',
    skills: ['PHP', 'Laravel', 'Shopify', 'WordPress', 'MySQL', 'REST API'],
    domain: 'Backend',
    experience: 3,
    hourlyRate: 55,
    status: 'ending_soon',
    currentProject: 'E-Commerce Theme Build',
    projectEndDate: '2026-06-14',
    availableFrom: '2026-06-15',
    bio: 'PHP/Laravel engineer focused on e-commerce integrations. Shopify Partner with 15+ store launches.',
    track: 'intern',
  },

  // ── 3 On Long-Term Projects (60–120 days from 2026-05-21) ────────────────
  {
    id: 'r10',
    name: 'Maria Gonzalez',
    email: 'maria.gonzalez@mobilestack.es',
    avatar: 'MG',
    avatarColor: '#34d399',
    skills: ['React Native', 'TypeScript', 'Firebase', 'Firestore', 'GraphQL', 'iOS'],
    domain: 'Mobile',
    experience: 6,
    hourlyRate: 95,
    status: 'on_project',
    currentProject: 'FinTrack Mobile App',
    projectEndDate: '2026-07-20',
    availableFrom: '2026-07-21',
    bio: 'React Native expert building financial and healthcare mobile apps with offline-first architecture.',
    track: 'professional',
  },
  {
    id: 'r11',
    name: 'Raj Patel',
    email: 'raj.patel@nestmaster.io',
    avatar: 'RP',
    avatarColor: '#818cf8',
    skills: ['NestJS', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'AWS', 'GraphQL'],
    domain: 'Backend',
    experience: 9,
    hourlyRate: 130,
    status: 'on_project',
    currentProject: 'Enterprise Auth Platform',
    projectEndDate: '2026-08-15',
    availableFrom: '2026-08-16',
    bio: 'Node.js & NestJS architect building enterprise-grade microservices. CQRS and DDD practitioner.',
    track: 'professional',
  },
  {
    id: 'r12',
    name: 'Yuki Tanaka',
    email: 'yuki.tanaka@fullui.jp',
    avatar: 'YT',
    avatarColor: '#a78bfa',
    skills: ['React', 'Vue.js', 'Node.js', 'TypeScript', 'Python', 'MongoDB', 'Docker'],
    domain: 'Full-Stack',
    experience: 5,
    hourlyRate: 88,
    status: 'on_project',
    currentProject: 'SaaS Onboarding Suite',
    projectEndDate: '2026-09-01',
    availableFrom: '2026-09-02',
    bio: 'Full-stack generalist comfortable owning features end-to-end. Enjoys prototyping at speed with great UI.',
    track: 'professional',
  },
]

// ─── Domain Config ────────────────────────────────────────────────────────────

const DOMAIN_CONFIG: Record<Domain, { color: string; Icon: React.ComponentType<{ size?: number; color?: string }> }> = {
  Frontend:    { color: '#60a5fa', Icon: Monitor },
  Backend:     { color: '#818cf8', Icon: Server },
  Mobile:      { color: '#34d399', Icon: Smartphone },
  DevOps:      { color: '#fb923c', Icon: GitBranch },
  Database:    { color: '#fbbf24', Icon: Database },
  Design:      { color: '#f472b6', Icon: Palette },
  'Full-Stack':{ color: '#a78bfa', Icon: Layers },
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
        background: `linear-gradient(135deg, ${color}99, ${color})`,
        fontSize: size * 0.3,
        border: `1.5px solid ${color}55`,
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
          background: 'rgba(74,222,128,0.08)',
          border: '1px solid rgba(74,222,128,0.25)',
          color: '#4ade80',
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
          background: 'rgba(251,191,36,0.08)',
          border: '1px solid rgba(251,191,36,0.25)',
          color: '#fbbf24',
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
          background: 'rgba(156,163,175,0.08)',
          border: '1px solid rgba(156,163,175,0.2)',
          color: '#9ca3af',
        }}
      >
        <span style={{ fontSize: 8 }}>⬛</span> On Project · Free {formatShortDate(resource.availableFrom)}
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
          background: 'rgba(167,139,250,0.12)',
          border: '1px solid rgba(167,139,250,0.3)',
          color: '#c4b5fd',
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
        background: 'rgba(251,191,36,0.1)',
        border: '1px solid rgba(251,191,36,0.3)',
        color: '#fbbf24',
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
  const { color } = DOMAIN_CONFIG[resource.domain]
  const dimmed = selectedSkill !== null && !resource.skills.includes(selectedSkill)
  const MAX_SKILLS = 6

  return (
    <div
      className="glass-card rounded-xl p-5 flex flex-col gap-4 transition-all duration-200 hover:border-[#DC143C]"
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
          <p className="text-mono-label truncate" style={{ fontSize: '10px', color: '#9ca3af' }}>
            {resource.email}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {/* Domain chip */}
            <span
              className="text-mono-label px-2 py-0.5 rounded"
              style={{
                fontSize: '9px',
                background: `${color}18`,
                border: `1px solid ${color}40`,
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
              color: selectedSkill === skill ? '#DC143C' : '#d1d5db',
              border: selectedSkill === skill ? '1px solid rgba(220,20,60,0.5)' : undefined,
              background: selectedSkill === skill ? 'rgba(220,20,60,0.08)' : undefined,
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
      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: '#9ca3af' }}>
        {resource.bio}
      </p>

      {/* Bottom: exp + rate + availability */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--input-bg)]">
        <div className="flex items-center gap-3">
          <span className="text-mono-label" style={{ fontSize: '11px', color: '#9ca3af' }}>
            {resource.experience} yr exp
          </span>
          <span className="text-mono-label font-bold" style={{ fontSize: '11px', color: '#DC143C' }}>
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
      ? '#4ade80'
      : resource.status === 'ending_soon'
      ? '#fbbf24'
      : '#6b7280'

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all shrink-0"
      style={{
        background: highlighted
          ? 'rgba(220,20,60,0.1)'
          : 'var(--input-bg)',
        border: highlighted
          ? '1px solid rgba(220,20,60,0.4)'
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
  resources,
  selectedSkill,
  collapsed,
  onToggle,
  today,
}: {
  domain: Domain
  resources: Resource[]
  selectedSkill: string | null
  collapsed: boolean
  onToggle: () => void
  today: Date
}) {
  const { color, Icon } = DOMAIN_CONFIG[domain]

  // Skills cloud: unique skills + count
  const skillCounts = useMemo(() => {
    const map: Record<string, number> = {}
    resources.forEach(r => r.skills.forEach(s => { map[s] = (map[s] ?? 0) + 1 }))
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [resources])

  return (
    <div
      className="glass-card rounded-xl overflow-hidden"
      style={{ borderColor: collapsed ? 'var(--input-bg)' : `${color}25` }}
    >
      {/* Domain header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-[var(--row-hover-bg)]"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${color}18`, border: `1px solid ${color}30` }}
          >
            <Icon size={15} color={color} />
          </div>
          <span className="text-primary-ui font-bold text-sm">{domain}</span>
          <span
            className="text-mono-label px-2 py-0.5 rounded-full"
            style={{
              fontSize: '10px',
              background: `${color}18`,
              border: `1px solid ${color}30`,
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
                    background: selectedSkill === skill ? 'rgba(220,20,60,0.12)' : 'var(--input-bg)',
                    border: selectedSkill === skill
                      ? '1px solid rgba(220,20,60,0.45)'
                      : `1px solid ${color}22`,
                    color: selectedSkill === skill ? '#DC143C' : '#d1d5db',
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
  const today = new Date()

  const [view, setView] = useState<'member' | 'domain'>('member')
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [collapsedDomains, setCollapsedDomains] = useState<Set<Domain>>(new Set())

  // ── All skills (deduplicated, sorted) ────────────────────────────────────
  const allSkills = useMemo(() => {
    const set = new Set<string>()
    MOCK_RESOURCES.forEach(r => r.skills.forEach(s => set.add(s)))
    return Array.from(set).sort()
  }, [])

  // ── Filtered resources ───────────────────────────────────────────────────
  const filteredResources = useMemo(() => {
    const q = search.toLowerCase()
    return MOCK_RESOURCES.filter(r => {
      const matchSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.skills.some(s => s.toLowerCase().includes(q))
      return matchSearch
    })
  }, [search])

  // ── Domain groups ────────────────────────────────────────────────────────
  const domainGroups = useMemo(() => {
    const map: Partial<Record<Domain, Resource[]>> = {}
    filteredResources.forEach(r => {
      if (!map[r.domain]) map[r.domain] = []
      map[r.domain]!.push(r)
    })
    return map
  }, [filteredResources])

  // ── Skill info bar data ──────────────────────────────────────────────────
  const skillInfoBar = useMemo(() => {
    if (!selectedSkill) return null
    const matching = MOCK_RESOURCES.filter(r => r.skills.includes(selectedSkill))
    const availableNow = matching.filter(r => r.status === 'available').length
    // Find earliest available date (for non-available resources)
    const futureDates = matching
      .filter(r => r.status !== 'available' && r.availableFrom)
      .map(r => new Date(r.availableFrom!).getTime())
    const earliest =
      futureDates.length > 0
        ? new Date(Math.min(...futureDates)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : null
    return { count: matching.length, availableNow, earliest }
  }, [selectedSkill])

  // ── Domain collapse logic for selected skill ─────────────────────────────
  const effectiveCollapsed = useMemo(() => {
    if (!selectedSkill) return collapsedDomains
    const domainsWithSkill = new Set(
      MOCK_RESOURCES.filter(r => r.skills.includes(selectedSkill)).map(r => r.domain)
    )
    const result = new Set<Domain>()
    Object.keys(DOMAIN_CONFIG).forEach(d => {
      const domain = d as Domain
      if (!domainsWithSkill.has(domain)) result.add(domain)
    })
    return result
  }, [selectedSkill, collapsedDomains])

  function toggleDomain(d: Domain) {
    setCollapsedDomains(prev => {
      const next = new Set(prev)
      next.has(d) ? next.delete(d) : next.add(d)
      return next
    })
  }

  function toggleSkill(skill: string) {
    setSelectedSkill(prev => (prev === skill ? null : skill))
  }

  // ── Stat counts ──────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: MOCK_RESOURCES.length,
    available: MOCK_RESOURCES.filter(r => r.status === 'available').length,
    endingSoon: MOCK_RESOURCES.filter(r => r.status === 'ending_soon').length,
    onProject: MOCK_RESOURCES.filter(r => r.status === 'on_project').length,
  }), [])

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

      {/* ── Stat Chips ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'TOTAL RESOURCES', value: stats.total, color: '#DC143C', icon: Users },
          { label: 'AVAILABLE NOW', value: stats.available, color: '#4ade80', icon: Zap },
          { label: 'ENDING SOON', value: stats.endingSoon, color: '#fbbf24', icon: null },
          { label: 'ON PROJECT', value: stats.onProject, color: '#9ca3af', icon: null },
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
                    background: '#DC143C',
                    color: '#fff',
                    border: '1px solid #DC143C',
                    fontFamily: 'JetBrains Mono, monospace',
                    letterSpacing: '0.06em',
                  }
                : {
                    background: 'var(--input-bg)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                    fontFamily: 'JetBrains Mono, monospace',
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
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search by name or skill..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9 py-2.5 text-sm w-full"
          />
        </div>

        {/* Skill chips row */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {allSkills.map(skill => (
            <button
              key={skill}
              onClick={() => toggleSkill(skill)}
              className="shrink-0 text-mono-label px-2.5 py-1 rounded transition-all"
              style={{
                fontSize: '10px',
                background: selectedSkill === skill ? '#DC143C' : 'var(--input-bg)',
                border:
                  selectedSkill === skill
                    ? '1px solid #DC143C'
                    : '1px solid var(--border)',
                color: selectedSkill === skill ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {skill}
            </button>
          ))}
        </div>
      </div>

      {/* ── Skill Info Bar ────────────────────────────────────────────────── */}
      {selectedSkill && skillInfoBar && (
        <div
          className="rounded-lg px-4 py-3 mb-6 flex flex-wrap items-center gap-3"
          style={{
            background: 'rgba(220,20,60,0.07)',
            border: '1px solid rgba(220,20,60,0.35)',
          }}
        >
          <span
            className="text-mono-label"
            style={{ fontSize: '11px', color: '#DC143C', letterSpacing: '0.06em' }}
          >
            <span className="font-bold text-primary-ui">{skillInfoBar.count}</span> developers have{' '}
            <span className="font-bold" style={{ color: '#DC143C' }}>
              {selectedSkill}
            </span>
          </span>
          <span
            className="text-mono-label px-2.5 py-0.5 rounded"
            style={{
              fontSize: '10px',
              background: 'rgba(74,222,128,0.1)',
              border: '1px solid rgba(74,222,128,0.3)',
              color: '#4ade80',
            }}
          >
            {skillInfoBar.availableNow} available now
          </span>
          {skillInfoBar.earliest && (
            <span
              className="text-mono-label px-2.5 py-0.5 rounded"
              style={{
                fontSize: '10px',
                background: 'rgba(251,191,36,0.1)',
                border: '1px solid rgba(251,191,36,0.3)',
                color: '#fbbf24',
              }}
            >
              Next available: {skillInfoBar.earliest}
            </span>
          )}
          <button
            onClick={() => setSelectedSkill(null)}
            className="ml-auto text-mono-label text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            ✕ Clear
          </button>
        </div>
      )}

      {/* ── BY MEMBER VIEW ────────────────────────────────────────────────── */}
      {view === 'member' && (
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
      {view === 'domain' && (
        <div className="space-y-4">
          {(Object.keys(DOMAIN_CONFIG) as Domain[])
            .filter(d => domainGroups[d] && domainGroups[d]!.length > 0)
            .map(domain => (
              <DomainSection
                key={domain}
                domain={domain}
                resources={domainGroups[domain]!}
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
