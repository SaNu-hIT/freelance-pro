'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Loader2, ShieldCheck, Code2, Building2,
  ArrowRight, AlertCircle, BarChart3, CheckCircle2,
  Users, Clock,
} from 'lucide-react'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { UserRole } from '@/lib/types'

const roleRoutes: Record<UserRole, string> = {
  admin: '/admin',
  freelancer: '/freelancer',
  client: '/client',
}

const DEMO_ACCOUNTS = [
  {
    label: 'Admin',
    email: 'admin@freelancepro.com',
    password: 'Admin@123',
    role: 'admin' as UserRole,
    icon: ShieldCheck,
    desc: 'Full platform control',
    color: '#DC143C',
  },
  {
    label: 'Freelancer',
    email: 'alex@freelancepro.dev',
    password: 'Test@123',
    role: 'freelancer' as UserRole,
    icon: Code2,
    desc: 'Projects & worklogs',
    color: '#c084fc',
  },
  {
    label: 'Client',
    email: 'acme@corp.com',
    password: 'Test@123',
    role: 'client' as UserRole,
    icon: Building2,
    desc: 'Track your projects',
    color: '#60a5fa',
  },
]

const PLATFORM_FEATURES = [
  { icon: BarChart3, text: 'Live project dashboards with real-time progress tracking' },
  { icon: Users, text: 'Managed freelancer teams vetted by project managers' },
  { icon: CheckCircle2, text: 'QA-reviewed deliverables before every handoff' },
  { icon: Clock, text: 'Detailed worklogs and time tracking per task' },
]

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const doLogin = async (e: string, p: string) => {
    const res = await authApi.login(e, p)
    const { user, token } = res.data
    login(user, token)
    router.push(roleRoutes[user.role as UserRole] ?? '/admin')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await doLogin(email, password)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDemo = async (account: typeof DEMO_ACCOUNTS[0]) => {
    setError('')
    setDemoLoading(account.label)
    try {
      await doLogin(account.email, account.password)
    } catch {
      setError('Demo login failed — make sure the backend is running.')
    } finally {
      setDemoLoading(null)
    }
  }

  const busy = loading || !!demoLoading

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex flex-col w-[42%] relative overflow-hidden"
        style={{ background: 'var(--row-hover-bg)', borderRight: '1px solid var(--border)' }}>

        {/* Subtle top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(220,20,60,0.5), transparent)' }} />

        <div className="flex flex-col justify-between h-full px-12 py-14">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 shrink-0" style={{
              background: '#DC143C',
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            }} />
            <span className="font-bold text-primary-ui tracking-widest text-sm" style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.18em' }}>
              FREELANCE_PRO
            </span>
          </Link>

          {/* Main content */}
          <div>
            <p className="text-xs mb-3 font-medium" style={{ color: 'rgba(220,20,60,0.7)', letterSpacing: '0.12em', fontFamily: 'JetBrains Mono, monospace' }}>
              FREELANCER MANAGEMENT PLATFORM
            </p>
            <h2 className="text-3xl font-bold text-primary-ui mb-4 leading-snug">
              Manage your entire<br />freelance operation<br />in one place
            </h2>
            <p className="text-sm leading-relaxed mb-10" style={{ color: 'var(--text-muted)', maxWidth: 320 }}>
              Projects, worklogs, payments, and team management — structured, transparent, and fully tracked.
            </p>

            {/* Feature list */}
            <div className="space-y-4 mb-12">
              {PLATFORM_FEATURES.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: 'rgba(220,20,60,0.1)', border: '1px solid rgba(220,20,60,0.2)' }}>
                    <Icon size={13} style={{ color: '#DC143C' }} />
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{text}</p>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-8 border-t" style={{ borderColor: 'var(--input-bg)' }}>
              {[
                { val: '50+', label: 'Projects' },
                { val: '100+', label: 'Freelancers' },
                { val: '99%', label: 'Uptime' },
              ].map(({ val, label }) => (
                <div key={label}>
                  <div className="text-xl font-bold text-primary-ui mb-0.5">{val}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: '#4ade80' }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#4ade80' }} />
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em' }}>
              All systems operational
            </span>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Form ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">

        {/* Subtle background dot */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 70% 30%, rgba(220,20,60,0.04) 0%, transparent 60%)',
        }} />

        <div className="w-full max-w-[420px] relative z-10">

          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2.5 mb-10 lg:hidden hover:opacity-80 transition-opacity">
            <div className="w-6 h-6 shrink-0" style={{ background: '#DC143C', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
            <span className="font-bold text-primary-ui text-sm tracking-widest" style={{ fontFamily: 'JetBrains Mono, monospace' }}>FREELANCE_PRO</span>
          </Link>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-primary-ui mb-1.5">Sign in to your account</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Enter your credentials to access your dashboard
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 px-4 py-3 rounded-lg flex items-start gap-2.5 text-sm"
              style={{ background: 'rgba(220,20,60,0.07)', border: '1px solid rgba(220,20,60,0.25)', color: '#f87171' }}>
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium" style={{ color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                  Password
                </label>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: '#DC143C', color: '#fff', marginTop: 4 }}
            >
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> Signing in...</>
                : <><ArrowRight size={15} /> Sign in</>
              }
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: 'var(--input-bg)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              or try a demo account
            </span>
            <div className="flex-1 h-px" style={{ background: 'var(--input-bg)' }} />
          </div>

          {/* Demo accounts */}
          <div className="grid grid-cols-3 gap-2.5 mb-8">
            {DEMO_ACCOUNTS.map(acc => {
              const Icon = acc.icon
              const isActive = demoLoading === acc.label
              return (
                <button
                  key={acc.label}
                  onClick={() => handleDemo(acc)}
                  disabled={busy}
                  className="flex flex-col items-center gap-2 rounded-lg py-4 px-2 text-left transition-all duration-150 disabled:cursor-not-allowed"
                  style={{
                    background: isActive ? `${acc.color}12` : 'var(--row-hover-bg)',
                    border: `1px solid ${isActive ? `${acc.color}50` : 'var(--input-bg)'}`,
                    opacity: demoLoading && !isActive ? 0.35 : 1,
                  }}
                  onMouseEnter={e => {
                    if (!busy) {
                      e.currentTarget.style.background = `${acc.color}0e`
                      e.currentTarget.style.borderColor = `${acc.color}45`
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'var(--row-hover-bg)'
                      e.currentTarget.style.borderColor = 'var(--input-bg)'
                    }
                  }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `${acc.color}15`, border: `1px solid ${acc.color}35` }}>
                    {isActive
                      ? <Loader2 size={14} className="animate-spin" style={{ color: acc.color }} />
                      : <Icon size={14} style={{ color: acc.color }} strokeWidth={1.8} />
                    }
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-semibold text-primary-ui mb-0.5">{acc.label}</div>
                    <div className="text-xs leading-tight" style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                      {acc.desc}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link href="/register" className="font-medium transition-colors hover:text-primary-ui" style={{ color: '#DC143C' }}>
              Register here
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}
