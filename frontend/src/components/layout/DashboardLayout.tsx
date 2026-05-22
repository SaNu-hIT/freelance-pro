'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Bell, Sun, Moon } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { UserRole } from '@/lib/types'
import { Sidebar } from './Sidebar'
import { MorphBlob } from '@/components/ui/MorphBlob'
import { useTheme } from '@/lib/theme'

const roleRedirects: Record<UserRole, string> = {
  admin: '/admin',
  freelancer: '/freelancer',
  client: '/client',
}

interface DashboardLayoutProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
}

export function DashboardLayout({ children, allowedRoles }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, _hasHydrated } = useAuthStore()
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    if (!_hasHydrated) return
    if (!isAuthenticated || !user) {
      router.replace('/login')
      return
    }
    if (!allowedRoles.includes(user.role)) {
      router.replace(roleRedirects[user.role])
    }
  }, [_hasHydrated, isAuthenticated, user, allowedRoles, router])

  // Show nothing until the persisted store has loaded from localStorage
  if (!_hasHydrated) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#DC143C', borderTopColor: 'transparent' }} />
        <span className="text-mono-label" style={{ color: 'rgba(220,20,60,0.6)', fontSize: 10 }}>LOADING...</span>
      </div>
    </div>
  )

  if (!isAuthenticated || !user) return null

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).toUpperCase()

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <div className="grid-overlay pointer-events-none fixed inset-0 z-0" />
      <MorphBlob color="#8B0000" size={500} top="-100px" left="-100px" />
      <MorphBlob color="#4A0000" size={400} bottom="-80px" right="-80px" delay="3s" />

      <Sidebar role={user.role} pathname={pathname} />

      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <header className="glass-card-dark border-b border-theme px-8 py-4 flex items-center justify-between shrink-0">
          <div />
          <div className="flex items-center gap-4">
            <span className="text-mono-label text-xs tracking-widest text-muted-ui">{dateStr}</span>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="relative p-2 rounded-md transition-all hover:scale-105"
              style={{
                color: 'var(--text-secondary)',
                background: 'var(--crimson-dim)',
                border: '1px solid var(--border-crimson)',
              }}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark'
                ? <Sun size={16} className="text-[#DC143C]" />
                : <Moon size={16} className="text-[#DC143C]" />
              }
            </button>

            <button className="relative p-2 rounded text-secondary-ui hover:text-primary-ui transition-colors">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#DC143C]" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#8B0000] flex items-center justify-center text-white text-xs font-bold uppercase">
                {user.name.charAt(0)}
              </div>
              <span className="text-sm font-medium text-primary-ui">{user.name}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  )
}
