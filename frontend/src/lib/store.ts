import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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
  currency: string          // e.g. 'INR'
  timezone: string
  maintenanceMode: boolean
  newRegistrations: boolean
  requireApproval: boolean
  setCurrency: (c: string) => void
  setPlatformSettings: (s: Partial<Omit<SettingsState, 'setCurrency' | 'setPlatformSettings'>>) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      currency: 'USD',
      timezone: 'UTC+5:30',
      maintenanceMode: false,
      newRegistrations: true,
      requireApproval: true,
      setCurrency: (currency) => set({ currency }),
      setPlatformSettings: (s) => set(s),
    }),
    { name: 'platform-settings' }
  )
)

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
