'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Loader2, ShieldCheck, Code2, Building2,
  ArrowRight, AlertCircle, BarChart3,
  CheckCircle2, Users, Clock, Sun, Moon,
} from 'lucide-react'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { UserRole } from '@/lib/types'
import { useTheme } from '@/lib/theme'

const roleRoutes: Record<UserRole, string> = {
  admin: '/admin',
  freelancer: '/freelancer',
  client: '/client',
}

const DEMO_ACCOUNTS = [
  { label: 'Admin',      email: 'admin@freelancepro.com',  password: 'Admin@123', role: 'admin'      as UserRole, icon: ShieldCheck, desc: 'Full platform control',  color: '#DC143C' },
  { label: 'Freelancer', email: 'alex@freelancepro.dev',   password: 'Test@123',  role: 'freelancer' as UserRole, icon: Code2,       desc: 'Projects & worklogs',   color: '#c084fc' },
  { label: 'Client',     email: 'acme@corp.com',           password: 'Test@123',  role: 'client'     as UserRole, icon: Building2,   desc: 'Track your projects',   color: '#60a5fa' },
]

const FEATURES = [
  { icon: BarChart3,    text: 'Live dashboards with real-time progress tracking' },
  { icon: Users,        text: 'Managed freelancer teams vetted by project managers' },
  { icon: CheckCircle2, text: 'QA-reviewed deliverables before every handoff' },
  { icon: Clock,        text: 'Detailed worklogs and time tracking per task' },
]

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const { theme, toggleTheme } = useTheme()
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [loading, setLoading]       = useState(false)
  const [demoLoading, setDemoLoading] = useState<string | null>(null)
  const [error, setError]           = useState('')

  const doLogin = async (e: string, p: string) => {
    const res = await authApi.login(e, p)
    const { user, token } = res.data
    login(user, token)
    router.push(roleRoutes[user.role as UserRole] ?? '/admin')
  }

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault()
    setError(''); setLoading(true)
    try { await doLogin(email, password) }
    catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Invalid email or password.')
    } finally { setLoading(false) }
  }

  const handleDemo = async (acc: typeof DEMO_ACCOUNTS[0]) => {
    setError(''); setDemoLoading(acc.label)
    try { await doLogin(acc.email, acc.password) }
    catch { setError('Demo login failed — make sure the backend is running.') }
    finally { setDemoLoading(null) }
  }

  const busy = loading || !!demoLoading

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>

      {/* ── LEFT: Brand panel ─────────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col w-[44%] shrink-0 relative overflow-hidden border-r border-theme"
        style={{ background: 'var(--bg-sidebar)' }}
      >
        {/* Top crimson line */}
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(to right, transparent, #DC143C, transparent)' }} />

        <div className="flex flex-col justify-between h-full px-12 py-12">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 w-fit hover:opacity-75 transition-opacity">
            <div className="w-7 h-7 shrink-0 bg-[#DC143C]" style={{ clipPath: 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)' }} />
            <span className="text-sm font-bold tracking-widest uppercase text-primary-ui" style={{ fontFamily: 'JetBrains Mono,monospace' }}>
              FREELANCE_PRO
            </span>
          </Link>

          {/* Main copy */}
          <div>
            <p className="text-mono-label text-[#DC143C] mb-3 text-[10px] tracking-[0.2em]">FREELANCER MANAGEMENT PLATFORM</p>
            <h2 className="text-3xl font-bold text-primary-ui mb-3 leading-snug">
              Manage your entire<br />freelance operation<br />in one place
            </h2>
            <p className="text-sm leading-relaxed text-muted-ui mb-10 max-w-xs">
              Projects, worklogs, payments, and team management — structured, transparent, and fully tracked.
            </p>

            <div className="space-y-3.5 mb-12">
              {FEATURES.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'var(--crimson-dim)', border: '1px solid var(--border-crimson)' }}>
                    <Icon size={13} className="text-[#DC143C]" />
                  </div>
                  <p className="text-sm text-secondary-ui leading-relaxed">{text}</p>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-theme">
              {[{ val: '50+', label: 'Projects' }, { val: '100+', label: 'Freelancers' }, { val: '99%', label: 'Uptime' }].map(({ val, label }) => (
                <div key={label}>
                  <div className="text-xl font-bold text-primary-ui mb-0.5">{val}</div>
                  <div className="text-xs text-muted-ui">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ade80] opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4ade80]" />
            </span>
            <span className="text-xs text-muted-ui" style={{ fontFamily: 'JetBrains Mono,monospace' }}>All systems operational</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Form ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col">

        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-theme shrink-0" style={{ background: 'var(--bg-sidebar)' }}>
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2 lg:invisible">
            <div className="w-5 h-5 bg-[#DC143C]" style={{ clipPath: 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)' }} />
            <span className="text-xs font-bold tracking-widest text-primary-ui" style={{ fontFamily: 'JetBrains Mono,monospace' }}>FREELANCE_PRO</span>
          </Link>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold tracking-widest transition-all"
              style={{ fontFamily: 'JetBrains Mono,monospace', color: '#DC143C', background: 'var(--crimson-dim)', border: '1px solid var(--border-crimson)' }}
            >
              {theme === 'dark' ? <><Sun size={11} /><span>LIGHT</span></> : <><Moon size={11} /><span>DARK</span></>}
            </button>
            <Link href="/register"
              className="px-3 py-1.5 rounded text-[10px] font-bold tracking-widest transition-all text-secondary-ui border-theme border"
              style={{ fontFamily: 'JetBrains Mono,monospace' }}>
              REGISTER →
            </Link>
          </div>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-[400px]">

            <div className="mb-8">
              <h1 className="text-2xl font-bold text-primary-ui mb-1.5">Welcome back</h1>
              <p className="text-sm text-muted-ui">Sign in to your account to continue</p>
            </div>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-lg flex items-start gap-2.5 text-sm"
                style={{ background: 'rgba(220,20,60,0.07)', border: '1px solid rgba(220,20,60,0.25)', color: '#f87171' }}>
                <AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mb-7">
              <div>
                <label className="block text-xs font-semibold text-secondary-ui mb-1.5 tracking-wide">Email address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="input-field" placeholder="you@example.com" required autoComplete="email" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary-ui mb-1.5 tracking-wide">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="input-field" placeholder="••••••••" required autoComplete="current-password" />
              </div>
              <button type="submit" disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: '#DC143C', marginTop: 6 }}>
                {loading ? <><Loader2 size={15} className="animate-spin" /> Signing in…</> : <><ArrowRight size={15} /> Sign in</>}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px border-t border-theme" />
              <span className="text-xs text-muted-ui whitespace-nowrap" style={{ fontFamily: 'JetBrains Mono,monospace' }}>OR TRY A DEMO</span>
              <div className="flex-1 h-px border-t border-theme" />
            </div>

            {/* Demo cards */}
            <div className="grid grid-cols-3 gap-2.5 mb-8">
              {DEMO_ACCOUNTS.map(acc => {
                const Icon = acc.icon
                const active = demoLoading === acc.label
                return (
                  <button key={acc.label} onClick={() => handleDemo(acc)} disabled={busy}
                    className="flex flex-col items-center gap-2 rounded-xl py-4 px-2 transition-all duration-150 disabled:cursor-not-allowed group"
                    style={{
                      background: active ? `${acc.color}12` : 'var(--bg-elevated)',
                      border: `1px solid ${active ? `${acc.color}50` : 'var(--border)'}`,
                      opacity: demoLoading && !active ? 0.35 : 1,
                    }}
                    onMouseEnter={e => { if (!busy) { e.currentTarget.style.borderColor = `${acc.color}45`; e.currentTarget.style.background = `${acc.color}0d` } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-elevated)' } }}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: `${acc.color}15`, border: `1px solid ${acc.color}30` }}>
                      {active
                        ? <Loader2 size={15} className="animate-spin" style={{ color: acc.color }} />
                        : <Icon size={15} style={{ color: acc.color }} strokeWidth={1.8} />
                      }
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-bold text-primary-ui">{acc.label}</div>
                      <div className="text-[10px] text-muted-ui mt-0.5 leading-tight">{acc.desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>

            <p className="text-center text-sm text-muted-ui">
              No account?{' '}
              <Link href="/register" className="font-semibold transition-colors hover:opacity-80" style={{ color: '#DC143C' }}>
                Register here
              </Link>
            </p>

          </div>
        </div>
      </div>
    </div>
  )
}
