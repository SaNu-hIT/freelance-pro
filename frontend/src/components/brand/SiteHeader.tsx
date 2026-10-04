'use client'

import Link from 'next/link'
import { ArrowRight, Sun, Moon } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { useAuthStore } from '@/lib/store'
import type { UserRole } from '@/lib/types'

const roleHome: Record<UserRole, string> = { admin: '/admin', freelancer: '/freelancer', client: '/client' }

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`wordmark ${className}`}>
      BLACKORWHITE<span className="wordmark-sub">FREELANCE PRO</span>
    </span>
  )
}

interface NavLink { label: string; href: string }

// Fixed header with mix-blend-mode: difference, so it flips black/white
// against whatever scrolls underneath, as on the BLACKORWHITE site.
export function SiteHeader({ links, cta }: { links: NavLink[]; cta?: NavLink }) {
  const { theme, toggleTheme } = useTheme()
  const { user, isAuthenticated, _hasHydrated } = useAuthStore()
  const signedIn = _hasHydrated && isAuthenticated && !!user

  return (
    <header className="site-header">
      <Link href="/" aria-label="Blackorwhite home"><Wordmark /></Link>

      <nav className="hidden md:flex items-center gap-8" aria-label="Primary">
        {links.map(l => (
          l.href.startsWith('#')
            ? <a key={l.href} href={l.href} className="site-nav-link">{l.label}</a>
            : <Link key={l.href} href={l.href} className="site-nav-link">{l.label}</Link>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="site-nav-link hidden sm:inline-flex items-center gap-1.5"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <><Sun size={11} />LIGHT</> : <><Moon size={11} />DARK</>}
        </button>
        {signedIn ? (
          <Link href={roleHome[user.role] ?? '/login'} className="site-header-btn">DASHBOARD <ArrowRight size={11} /></Link>
        ) : <>
        <Link href="/login" className="site-nav-link">LOGIN</Link>
        {cta && (
          cta.href.startsWith('#')
            ? <a href={cta.href} className="site-header-btn">{cta.label} <ArrowRight size={11} /></a>
            : <Link href={cta.href} className="site-header-btn">{cta.label} <ArrowRight size={11} /></Link>
        )}
        </>}
      </div>
    </header>
  )
}
