import { create } from 'zustand'
import { skillGroupsApi } from './api'
import { apiError } from './utils'

export interface SkillGroup {
  id: string
  name: string
  color: string
  skills: string[]
  order: number
}

// Mirrors the backend seed; used to recreate the groups on "Reset defaults"
export const DEFAULT_SKILL_GROUPS: SkillGroup[] = [
  { id: 'mobile',    name: 'Mobile Development', color: 'var(--fg)', order: 0, skills: ['Flutter', 'Dart', 'React Native', 'Expo', 'iOS', 'Android', 'Firebase', 'Firestore'] },
  { id: 'frontend',  name: 'Frontend',            color: 'var(--fg)', order: 1, skills: ['React', 'Vue.js', 'Angular', 'TypeScript', 'Tailwind CSS', 'CSS', 'Next.js', 'GraphQL', 'Figma'] },
  { id: 'backend',   name: 'Backend',             color: 'var(--fg)', order: 2, skills: ['Node.js', 'NestJS', 'Python', 'Django', 'FastAPI', 'PHP', 'Laravel', 'REST API', 'GraphQL'] },
  { id: 'ecommerce', name: 'E-Commerce / CMS',    color: 'var(--fg)', order: 3, skills: ['WordPress', 'Shopify', 'WooCommerce', 'Magento', 'Webflow', 'Strapi', 'Contentful'] },
  { id: 'devops',    name: 'Cloud / DevOps',      color: 'var(--fg)', order: 4, skills: ['AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD'] },
  { id: 'database',  name: 'Database',            color: 'var(--fg)', order: 5, skills: ['PostgreSQL', 'MongoDB', 'Redis', 'MySQL', 'Firebase', 'Firestore'] },
  { id: 'design',    name: 'Design',              color: 'var(--fg)', order: 6, skills: ['Figma', 'UI/UX', 'Adobe XD', 'CSS'] },
]

interface SkillTaxonomyStore {
  groups:  SkillGroup[]
  loading: boolean
  error:   string | null

  fetch:   () => Promise<void>
  clearError: () => void

  addGroup:             (name: string) => Promise<void>
  removeGroup:          (id: string)   => Promise<void>
  renameGroup:          (id: string, name: string) => Promise<void>
  setGroupColor:        (id: string, color: string) => Promise<void>
  addSkillToGroup:      (groupId: string, skill: string) => Promise<void>
  removeSkillFromGroup: (groupId: string, skill: string) => Promise<void>
  reset:                () => Promise<void>
}

const GROUP_COLORS = [
  'var(--fg)', 'var(--fg)', 'var(--fg)', 'var(--fg)',
  'var(--fg)', 'var(--fg)', 'var(--fg)', 'var(--fg)',
  'var(--fg)', 'var(--fg)',
]

export const useSkillTaxonomyStore = create<SkillTaxonomyStore>()((set, get) => {
  // Optimistically apply a change to one group, then replace it with the server's copy.
  // On failure put the group back as it was and surface the error.
  async function editGroup(id: string, change: (g: SkillGroup) => SkillGroup, request: () => Promise<{ data: SkillGroup }>, fallback: string) {
    const before = get().groups.find(g => g.id === id)
    if (!before) return
    set(s => ({ groups: s.groups.map(g => g.id === id ? change(g) : g), error: null }))
    try {
      const res = await request()
      set(s => ({ groups: s.groups.map(g => g.id === id ? res.data : g) }))
    } catch (err) {
      set(s => ({ groups: s.groups.map(g => g.id === id ? before : g), error: apiError(err, fallback) }))
    }
  }

  return {
    groups:  [],
    loading: false,
    error:   null,

    fetch: async () => {
      set({ loading: true, error: null })
      try {
        const res = await skillGroupsApi.getAll()
        // The backend seeds the default groups on startup, so an empty list is real
        set({ groups: res.data as SkillGroup[], loading: false })
      } catch (err) {
        set({ loading: false, error: apiError(err, 'Could not load skill groups') })
      }
    },

    clearError: () => set({ error: null }),

    addGroup: async (name) => {
      const color = GROUP_COLORS[get().groups.length % GROUP_COLORS.length]
      set({ error: null })
      try {
        const res = await skillGroupsApi.create({ name: name.trim(), color, skills: [] })
        set(s => ({ groups: [...s.groups, res.data] }))
      } catch (err) {
        set({ error: apiError(err, 'Could not add the group') })
      }
    },

    removeGroup: async (id) => {
      const index = get().groups.findIndex(g => g.id === id)
      if (index === -1) return
      const removed = get().groups[index]
      set(s => ({ groups: s.groups.filter(g => g.id !== id), error: null }))
      try {
        await skillGroupsApi.delete(id)
      } catch (err) {
        set(s => {
          const groups = [...s.groups]
          groups.splice(Math.min(index, groups.length), 0, removed)
          return { groups, error: apiError(err, 'Could not delete the group') }
        })
      }
    },

    renameGroup: (id, name) =>
      editGroup(id, g => ({ ...g, name }), () => skillGroupsApi.update(id, { name }), 'Could not rename the group'),

    setGroupColor: (id, color) =>
      editGroup(id, g => ({ ...g, color }), () => skillGroupsApi.update(id, { color }), 'Could not change the group colour'),

    addSkillToGroup: async (groupId, skill) => {
      const trimmed = skill.trim()
      if (!trimmed) return
      await editGroup(
        groupId,
        g => g.skills.includes(trimmed) ? g : { ...g, skills: [...g.skills, trimmed] },
        () => skillGroupsApi.addSkill(groupId, trimmed),
        'Could not add the skill',
      )
    },

    removeSkillFromGroup: (groupId, skill) =>
      editGroup(
        groupId,
        g => ({ ...g, skills: g.skills.filter(sk => sk !== skill) }),
        () => skillGroupsApi.removeSkill(groupId, skill),
        'Could not remove the skill',
      ),

    reset: async () => {
      // Delete all existing groups, then recreate the defaults
      set({ loading: true, error: null })
      try {
        await Promise.all(get().groups.map(g => skillGroupsApi.delete(g.id)))
        const res = await skillGroupsApi.getAll()
        const existing: SkillGroup[] = res.data
        if (existing.length === 0) {
          const created = await Promise.all(
            DEFAULT_SKILL_GROUPS.map(g => skillGroupsApi.create({ name: g.name, color: g.color, skills: g.skills }))
          )
          set({ groups: created.map(r => r.data), loading: false })
        } else {
          set({ groups: existing, loading: false })
        }
      } catch (err) {
        const error = apiError(err, 'Could not reset the skill groups')
        // Some deletes may have gone through; show what the server has now
        await get().fetch()
        set(s => ({ error: s.error ?? error }))
      }
    },
  }
})
