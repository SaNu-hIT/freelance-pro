import { create } from 'zustand'
import { skillGroupsApi } from './api'

export interface SkillGroup {
  id: string
  name: string
  color: string
  skills: string[]
  order: number
}

// Shown immediately while the real fetch is in-flight
export const DEFAULT_SKILL_GROUPS: SkillGroup[] = [
  { id: 'mobile',    name: 'Mobile Development', color: '#34d399', order: 0, skills: ['Flutter', 'Dart', 'React Native', 'Expo', 'iOS', 'Android', 'Firebase', 'Firestore'] },
  { id: 'frontend',  name: 'Frontend',            color: '#60a5fa', order: 1, skills: ['React', 'Vue.js', 'Angular', 'TypeScript', 'Tailwind CSS', 'CSS', 'Next.js', 'GraphQL', 'Figma'] },
  { id: 'backend',   name: 'Backend',             color: '#818cf8', order: 2, skills: ['Node.js', 'NestJS', 'Python', 'Django', 'FastAPI', 'PHP', 'Laravel', 'REST API', 'GraphQL'] },
  { id: 'ecommerce', name: 'E-Commerce / CMS',    color: '#a78bfa', order: 3, skills: ['WordPress', 'Shopify', 'WooCommerce', 'Magento', 'Webflow', 'Strapi', 'Contentful'] },
  { id: 'devops',    name: 'Cloud / DevOps',      color: '#fb923c', order: 4, skills: ['AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD'] },
  { id: 'database',  name: 'Database',            color: '#fbbf24', order: 5, skills: ['PostgreSQL', 'MongoDB', 'Redis', 'MySQL', 'Firebase', 'Firestore'] },
  { id: 'design',    name: 'Design',              color: '#f472b6', order: 6, skills: ['Figma', 'UI/UX', 'Adobe XD', 'CSS'] },
]

interface SkillTaxonomyStore {
  groups:  SkillGroup[]
  loading: boolean
  error:   string | null

  fetch:   () => Promise<void>

  addGroup:             (name: string) => Promise<void>
  removeGroup:          (id: string)   => Promise<void>
  renameGroup:          (id: string, name: string) => Promise<void>
  setGroupColor:        (id: string, color: string) => Promise<void>
  addSkillToGroup:      (groupId: string, skill: string) => Promise<void>
  removeSkillFromGroup: (groupId: string, skill: string) => Promise<void>
  reset:                () => Promise<void>
}

const GROUP_COLORS = [
  '#60a5fa', '#818cf8', '#34d399', '#fb923c',
  '#fbbf24', '#f472b6', '#a78bfa', '#4ade80',
  '#f87171', '#38bdf8',
]

export const useSkillTaxonomyStore = create<SkillTaxonomyStore>()((set, get) => ({
  groups:  DEFAULT_SKILL_GROUPS,
  loading: false,
  error:   null,

  fetch: async () => {
    set({ loading: true, error: null })
    try {
      const res = await skillGroupsApi.getAll()
      const data: SkillGroup[] = res.data
      set({ groups: data.length > 0 ? data : DEFAULT_SKILL_GROUPS, loading: false })
    } catch {
      // Keep defaults on error (API might be down / unauthenticated)
      set({ loading: false })
    }
  },

  addGroup: async (name) => {
    const color = GROUP_COLORS[get().groups.length % GROUP_COLORS.length]
    try {
      const res = await skillGroupsApi.create({ name: name.trim(), color, skills: [] })
      set(s => ({ groups: [...s.groups, res.data] }))
    } catch {
      // Optimistic fallback
      set(s => ({
        groups: [...s.groups, { id: `tmp-${Date.now()}`, name: name.trim(), color, skills: [], order: s.groups.length }],
      }))
    }
  },

  removeGroup: async (id) => {
    set(s => ({ groups: s.groups.filter(g => g.id !== id) }))
    try { await skillGroupsApi.delete(id) } catch {}
  },

  renameGroup: async (id, name) => {
    set(s => ({ groups: s.groups.map(g => g.id === id ? { ...g, name } : g) }))
    try { await skillGroupsApi.update(id, { name }) } catch {}
  },

  setGroupColor: async (id, color) => {
    set(s => ({ groups: s.groups.map(g => g.id === id ? { ...g, color } : g) }))
    try { await skillGroupsApi.update(id, { color }) } catch {}
  },

  addSkillToGroup: async (groupId, skill) => {
    const trimmed = skill.trim()
    if (!trimmed) return
    set(s => ({
      groups: s.groups.map(g =>
        g.id === groupId && !g.skills.includes(trimmed)
          ? { ...g, skills: [...g.skills, trimmed] }
          : g,
      ),
    }))
    try { await skillGroupsApi.addSkill(groupId, trimmed) } catch {}
  },

  removeSkillFromGroup: async (groupId, skill) => {
    set(s => ({
      groups: s.groups.map(g =>
        g.id === groupId ? { ...g, skills: g.skills.filter(sk => sk !== skill) } : g,
      ),
    }))
    try { await skillGroupsApi.removeSkill(groupId, skill) } catch {}
  },

  reset: async () => {
    // Delete all existing groups, then re-fetch (backend seeds on empty)
    const ids = get().groups.map(g => g.id)
    set({ groups: DEFAULT_SKILL_GROUPS })
    try {
      await Promise.all(ids.map(id => skillGroupsApi.delete(id)))
      const res = await skillGroupsApi.getAll()
      // After all deleted, backend seed won't re-run automatically —
      // so recreate from defaults
      const existing: SkillGroup[] = res.data
      if (existing.length === 0) {
        const created = await Promise.all(
          DEFAULT_SKILL_GROUPS.map(g => skillGroupsApi.create({ name: g.name, color: g.color, skills: g.skills }))
        )
        set({ groups: created.map(r => r.data) })
      } else {
        set({ groups: existing })
      }
    } catch {}
  },
}))
