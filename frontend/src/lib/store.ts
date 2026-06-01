import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { settingsApi } from './api'
import { UserRole } from './types'

// ── Currency symbols ──────────────────────────────────────────
export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  AUD: 'A$',
}

export interface SettingsState {
  currency: string
  timezone: string
  maintenanceMode: boolean
  newRegistrations: boolean
  requireApproval: boolean
  _loaded: boolean
  setCurrency: (c: string) => Promise<void>
  setPlatformSettings: (s: Partial<Omit<SettingsState, 'setCurrency' | 'setPlatformSettings' | 'fetchSettings' | '_loaded'>>) => Promise<void>
  fetchSettings: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  currency: 'USD',
  timezone: 'UTC+5:30',
  maintenanceMode: false,
  newRegistrations: true,
  requireApproval: true,
  _loaded: false,

  fetchSettings: async () => {
    try {
      const res = await settingsApi.get()
      if (res.data) {
        const { currency, timezone, maintenanceMode, newRegistrations, requireApproval } = res.data
        set({ currency, timezone, maintenanceMode, newRegistrations, requireApproval, _loaded: true })
      }
    } catch {
      set({ _loaded: true })
    }
  },

  setCurrency: async (currency) => {
    set({ currency })
    try { await settingsApi.update({ currency }) } catch {}
  },

  setPlatformSettings: async (s) => {
    set(s as Partial<SettingsState>)
    try { await settingsApi.update(s as Parameters<typeof settingsApi.update>[0]) } catch {}
  },
}))

/** Returns the symbol for the currently selected currency, e.g. "₹" */
export function useCurrencySymbol() {
  return useSettingsStore(s => CURRENCY_SYMBOLS[s.currency] ?? s.currency)
}

interface User {
  id: string
  name: string
  email: string
  role: UserRole
  profileImage?: string
  createdAt?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  _hasHydrated: boolean
  login: (user: User, token: string) => void
  logout: () => void
  setUser: (user: User) => void
  setHasHydrated: (v: boolean) => void
}

// Auth stays in localStorage — it's a session token, appropriate for local storage
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
      setUser: (user) => set({ user }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'auth-store',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
