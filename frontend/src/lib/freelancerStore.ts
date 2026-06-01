import { create } from 'zustand'
import { freelancersApi } from './api'

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

  getAvailability: (profileId: string) => AvailabilityConfig
  fetchAvailability: (profileId: string) => Promise<void>
  setAvailability: (profileId: string, config: AvailabilityConfig) => Promise<void>
}

export const useFreelancerStore = create<FreelancerStore>()((set, get) => ({
  availability: {},

  getAvailability: (profileId) =>
    get().availability[profileId] ?? DEFAULT_AVAILABILITY,

  fetchAvailability: async (profileId) => {
    try {
      const res = await freelancersApi.getAvailability(profileId)
      if (res.data) {
        set(s => ({ availability: { ...s.availability, [profileId]: res.data as AvailabilityConfig } }))
      }
    } catch {
      // keep DEFAULT_AVAILABILITY on error
    }
  },

  setAvailability: async (profileId, config) => {
    // Optimistic update
    set(s => ({ availability: { ...s.availability, [profileId]: config } }))
    try {
      await freelancersApi.updateAvailability(profileId, config as unknown as Record<string, unknown>)
    } catch {
      // already updated locally; silently fail
    }
  },
}))
