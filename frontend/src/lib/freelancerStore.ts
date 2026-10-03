import { create } from 'zustand'
import { freelancersApi } from './api'
import { apiError } from './utils'

/* ── Availability types ───────────────────────────────────── */
export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export interface DaySlot {
  enabled: boolean
  from: string   // '09:00'
  to:   string   // '17:00'
}

export interface AvailabilityConfig {
  hoursPerWeek: number
  timezone: string
  schedule: Record<DayKey, DaySlot>
}

export const DEFAULT_AVAILABILITY: AvailabilityConfig = {
  hoursPerWeek: 40,
  timezone: 'UTC+5:30',
  schedule: {
    mon: { enabled: true,  from: '09:00', to: '18:00' },
    tue: { enabled: true,  from: '09:00', to: '18:00' },
    wed: { enabled: true,  from: '09:00', to: '18:00' },
    thu: { enabled: true,  from: '09:00', to: '18:00' },
    fri: { enabled: true,  from: '09:00', to: '18:00' },
    sat: { enabled: false, from: '10:00', to: '14:00' },
    sun: { enabled: false, from: '10:00', to: '14:00' },
  },
}

/* ── Store ────────────────────────────────────────────────── */
interface FreelancerStore {
  /** Local cache: freelancerProfileId → AvailabilityConfig */
  availability: Record<string, AvailabilityConfig>
  /** Last load/save failure, cleared on the next attempt */
  error: string | null

  getAvailability: (profileId: string) => AvailabilityConfig
  fetchAvailability: (profileId: string) => Promise<void>
  /** Rejects (after reverting the local copy) when the save fails */
  setAvailability: (profileId: string, config: AvailabilityConfig) => Promise<void>
}

export const useFreelancerStore = create<FreelancerStore>()((set, get) => ({
  availability: {},
  error: null,

  getAvailability: (profileId) =>
    get().availability[profileId] ?? DEFAULT_AVAILABILITY,

  fetchAvailability: async (profileId) => {
    set({ error: null })
    try {
      const res = await freelancersApi.getAvailability(profileId)
      if (res.data) {
        set(s => ({ availability: { ...s.availability, [profileId]: res.data as AvailabilityConfig } }))
      }
    } catch (err) {
      set({ error: apiError(err, 'Could not load availability') })
    }
  },

  setAvailability: async (profileId, config) => {
    const previous = get().availability[profileId]
    // Optimistic update, reverted if the save fails
    set(s => ({ availability: { ...s.availability, [profileId]: config }, error: null }))
    try {
      const res = await freelancersApi.updateAvailability(profileId, config as unknown as Record<string, unknown>)
      const saved = res.data?.availability as AvailabilityConfig | undefined
      if (saved) set(s => ({ availability: { ...s.availability, [profileId]: saved } }))
    } catch (err) {
      set(s => {
        const availability = { ...s.availability }
        if (previous) availability[profileId] = previous
        else delete availability[profileId]
        return { availability, error: apiError(err, 'Could not save availability') }
      })
      throw err
    }
  },
}))
