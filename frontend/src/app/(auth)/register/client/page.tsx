'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Loader2, Building2, ArrowLeft, ArrowRight,
  ClipboardList, Users, UserCheck, FlaskConical,
  PackageCheck, BarChart3, ChevronRight, Zap,
  CheckCircle2, ShieldCheck, Clock, Star, Headphones,
} from 'lucide-react'
import { authApi } from '@/lib/api'
import { MorphBlob } from '@/components/ui/MorphBlob'
import { ParticleNetwork, WireframeCube, OrbitalRing, FloatingGlyph } from '@/components/ui/SceneBackground'
import { useTheme } from '@/lib/theme'
import { Sun, Moon } from 'lucide-react'
import { useAuthStore } from '@/lib/store'

const DELIVERY_STEPS = [
  {
    num: '01',
    icon: ClipboardList,
    title: 'Submit Your Enquiry',
    desc: 'Tell us about your project — scope, timeline, and goals. No commitment needed at this stage.',
    color: '#60a5fa',
  },
  {
    num: '02',
    icon: Users,
    title: 'Manager & Tech Lead Review',
    desc: 'A dedicated group of project managers and tech leads analyse your requirements and identify the exact resources needed.',
    color: '#818cf8',
  },
  {
    num: '03',
    icon: UserCheck,
    title: 'Freelancer Onboarding',
    desc: 'We hand-pick and onboard the right specialists from our vetted talent pool and assign them to your project.',
    color: '#f97316',
  },
  {
    num: '04',
    icon: FlaskConical,
    title: 'QA on Every Deliverable',
    desc: 'Each deliverable passes a dedicated QA review before it ever reaches you — no half-baked work, ever.',
    color: '#eab308',
  },
  {
    num: '05',
    icon: PackageCheck,
    title: 'Delivery & Sign-off',
    desc: 'Approved deliverables are handed off to you with documentation. You review and sign off on each milestone.',
    color: '#4ade80',
  },
  {
    num: '06',
    icon: BarChart3,
    title: 'Track Progress in Real Time',
    desc: 'Your client dashboard shows live worklogs, task completion, freelancer activity, and project progress — 24/7.',
    color: '#2dd4bf',
  },
]

const CLIENT_PERKS = [
  { icon: ShieldCheck, text: 'Vetted freelancers — manager-approved before assignment' },
  { icon: FlaskConical, text: 'QA on every deliverable before handoff' },
  { icon: BarChart3, text: 'Live dashboard: worklogs, tasks & progress' },
  { icon: Headphones, text: 'Dedicated account manager throughout the project' },
]

export default function ClientRegisterPage() {
  const router = useRouter()
  const { login: storeLogin } = useAuthStore()
  const { theme, toggleTheme } = useTheme()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [projectDesc, setProjectDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authApi.register({ name, email, password, role: 'client' })
      const { user, token } = res.data
      storeLogin(user, token)
      router.push('/client')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const accent = '#60a5fa'
  const accentFaint = 'rgba(96,165,250,0.12)'
  const accentBorder = 'rgba(96,165,250,0.25)'

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <div className="grid-overlay pointer-events-none absolute inset-0 z-0" />

      {/* canvas particle network */}
      <ParticleNetwork count={60} dotColor="96,165,250" lineColor="96,165,250" className="z-0" />

      {/* depth blobs */}
      <MorphBlob color="#0d2644" size={700} top="-200px" left="-200px" />
      <MorphBlob color="#1a1a4e" size={500} bottom="-150px" right="-100px" delay="4s" />

      {/* rotating wireframe cubes */}
      <WireframeCube size={180} color="rgba(96,165,250,0.18)" duration={26} delay="0s"
        style={{ top: '8%', right: '5%', zIndex: 1 }} />
      <WireframeCube size={90}  color="rgba(96,165,250,0.22)" duration={17} delay="-5s"
        style={{ top: '52%', right: '20%', zIndex: 1 }} />
      <WireframeCube size={55}  color="rgba(96,165,250,0.28)" duration={13} delay="-2s"
        style={{ bottom: '10%', right: '38%', zIndex: 1 }} />

      {/* orbital rings */}
      <OrbitalRing size={500} color="rgba(96,165,250,0.08)" tiltX={68} duration={16} delay="0s"
        style={{ top: '-100px', right: '-130px', zIndex: 1 }} />
      <OrbitalRing size={280} color="rgba(129,140,248,0.12)" tiltX={62} duration={10} delay="-3s"
        style={{ bottom: '4%', left: '-50px', zIndex: 1 }} />

      {/* floating hex glyphs */}
      <FloatingGlyph size={100} color="rgba(96,165,250,0.13)" duration={19} delay="0s"
        style={{ top: '16%', right: '28%', zIndex: 1 }} />
      <FloatingGlyph size={55}  color="rgba(96,165,250,0.18)" duration={13} delay="-4s" spin={false}
        style={{ bottom: '18%', right: '8%', zIndex: 1 }} />

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex flex-col w-[40%] relative z-10 px-12 py-12 overflow-y-auto">

        {/* Logo + back */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7" style={{
              background: '#DC143C',
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            }} />
            <span className="text-display text-primary-ui text-base tracking-widest">FREELANCE_PRO</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold tracking-widest transition-all"
              style={{ fontFamily: 'JetBrains Mono,monospace', color: '#DC143C', background: 'var(--crimson-dim)', border: '1px solid var(--border-crimson)' }}
            >
              {theme === 'dark' ? <><Sun size={11} /><span>LIGHT</span></> : <><Moon size={11} /><span>DARK</span></>}
            </button>
            <Link href="/register"
              className="flex items-center gap-1.5 text-xs transition-colors hover:text-primary-ui"
              style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em' }}>
              <ArrowLeft size={12} /> BACK
            </Link>
          </div>
        </div>

        {/* Headline */}
        <div className="mb-10">
          <p className="text-mono-label mb-4" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.4em' }}>
            CLIENT ONBOARDING
          </p>
          <h2 className="text-display leading-none mb-5" style={{ fontSize: '3.2rem', color: 'var(--text-primary)' }}>
            BUILD YOUR<br />
            <span style={{
              background: 'linear-gradient(to right, #60a5fa, #818cf8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              PRODUCT
            </span><br />
            WITH US
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)', maxWidth: 340 }}>
            From your first enquiry to final delivery — a fully managed process with expert oversight at every step.
          </p>
        </div>

        {/* How it works */}
        <div className="mb-10">
          <p className="text-mono-label mb-5" style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.35em' }}>
            HOW IT WORKS
          </p>
          <div className="space-y-0">
            {DELIVERY_STEPS.map((s, i) => {
              const Icon = s.icon
              return (
                <div key={s.num} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${s.color}18`, border: `1px solid ${s.color}40` }}>
                      <Icon size={14} style={{ color: s.color }} />
                    </div>
                    {i < DELIVERY_STEPS.length - 1 && (
                      <div className="w-px flex-1 my-1.5" style={{ background: 'var(--border)', minHeight: 20 }} />
                    )}
                  </div>
                  <div className="pb-4">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-mono-label" style={{ fontSize: 9, color: s.color, letterSpacing: '0.2em' }}>{s.num}</span>
                      <span className="text-sm font-semibold text-primary-ui">{s.title}</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Client perks */}
        <div className="mb-8 rounded-xl p-5" style={{ background: accentFaint, border: `1px solid ${accentBorder}` }}>
          <p className="text-mono-label mb-4" style={{ fontSize: 9, color: accent, letterSpacing: '0.3em' }}>
            WHAT YOU GET
          </p>
          <div className="space-y-3">
            {CLIENT_PERKS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.25)' }}>
                  <Icon size={12} style={{ color: accent }} />
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard preview note */}
        <div className="rounded-xl px-4 py-3.5 flex items-start gap-3 mb-8"
          style={{ background: 'rgba(45,212,191,0.06)', border: '1px solid rgba(45,212,191,0.2)' }}>
          <BarChart3 size={14} className="mt-0.5 shrink-0" style={{ color: '#2dd4bf' }} />
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: '#2dd4bf' }}>Your Client Dashboard</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              After registration you get instant access to a live dashboard — track freelancer worklogs, task progress, sprint milestones, and QA status all in one place.
            </p>
          </div>
        </div>

        {/* Bottom trust row */}
        <div className="flex items-center gap-5 mt-auto pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          {[
            { icon: Users, val: '50+', label: 'PROJECTS DELIVERED' },
            { icon: Star, val: '4.8', label: 'CLIENT RATING' },
            { icon: Clock, val: '48h', label: 'FIRST RESPONSE' },
          ].map(({ icon: Icon, val, label }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon size={12} style={{ color: 'rgba(96,165,250,0.5)' }} />
              <div>
                <div className="text-primary-ui text-xs font-bold" style={{ fontFamily: 'Cabinet Grotesk, Inter, sans-serif' }}>{val}</div>
                <div className="text-mono-label" style={{ fontSize: 8, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL: Form ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10 overflow-y-auto">
        <div className="w-full max-w-[620px]">

          {/* Mobile logo */}
          <div className="flex items-center justify-between mb-8 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6" style={{ background: '#DC143C', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
              <span className="text-display text-primary-ui text-sm tracking-widest">FREELANCE_PRO</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold tracking-widest"
                style={{ fontFamily: 'JetBrains Mono,monospace', color: '#DC143C', background: 'var(--crimson-dim)', border: '1px solid var(--border-crimson)' }}
              >
                {theme === 'dark' ? <><Sun size={10} /><span>LIGHT</span></> : <><Moon size={10} /><span>DARK</span></>}
              </button>
              <Link href="/register" className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <ArrowLeft size={12} /> Back
              </Link>
            </div>
          </div>

          <div className="glass-card rounded-xl p-8" style={{ borderColor: accentBorder }}>

            {/* Header */}
            <div className="flex items-center gap-3 mb-7">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: accentFaint, border: `1px solid ${accentBorder}` }}>
                <Building2 size={16} style={{ color: accent }} />
              </div>
              <div>
                <h1 className="text-primary-ui text-2xl font-bold" style={{ fontFamily: 'Cabinet Grotesk, Inter, sans-serif' }}>
                  Client Registration
                </h1>
                <p className="text-mono-label" style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                  START YOUR PROJECT JOURNEY
                </p>
              </div>
            </div>

            {/* Process summary chips */}
            <div className="flex flex-wrap gap-2 mb-7">
              {[
                { icon: ClipboardList, label: 'Enquiry', color: '#60a5fa' },
                { icon: ChevronRight, label: '', color: 'var(--text-muted)' },
                { icon: Users, label: 'Manager Review', color: '#818cf8' },
                { icon: ChevronRight, label: '', color: 'var(--text-muted)' },
                { icon: UserCheck, label: 'Team Assigned', color: '#f97316' },
                { icon: ChevronRight, label: '', color: 'var(--text-muted)' },
                { icon: FlaskConical, label: 'QA & Delivery', color: '#4ade80' },
              ].map(({ icon: Icon, label, color }, i) => (
                label
                  ? <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: `${color}12`, border: `1px solid ${color}30`, color }}>
                      <Icon size={11} />
                      {label}
                    </div>
                  : <Icon key={i} size={12} style={{ color, alignSelf: 'center' }} />
              ))}
            </div>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-lg flex items-start gap-2 text-sm"
                style={{ background: 'rgba(220,20,60,0.08)', border: '1px solid rgba(220,20,60,0.35)', color: '#f87171' }}>
                <Zap size={14} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field" style={{ color: 'rgba(96,165,250,0.8)' }}>FULL NAME</label>
                  <input className="input-field" placeholder="Jane Smith" required value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <label className="label-field" style={{ color: 'rgba(96,165,250,0.8)' }}>
                    COMPANY <span style={{ color: 'var(--text-muted)' }}>OPTIONAL</span>
                  </label>
                  <input className="input-field" placeholder="Acme Corp" value={company} onChange={e => setCompany(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="label-field" style={{ color: 'rgba(96,165,250,0.8)' }}>WORK EMAIL</label>
                <input type="email" className="input-field" placeholder="jane@company.com" required value={email} onChange={e => setEmail(e.target.value)} />
              </div>

              <div>
                <label className="label-field" style={{ color: 'rgba(96,165,250,0.8)' }}>PASSWORD</label>
                <input type="password" className="input-field" placeholder="••••••••" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} />
                <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>Minimum 6 characters</p>
              </div>

              {/* Project brief */}
              <div>
                <label className="label-field flex items-center gap-1.5" style={{ color: 'rgba(96,165,250,0.8)' }}>
                  <ClipboardList size={10} style={{ color: accent }} />
                  PROJECT BRIEF
                  <span style={{ color: 'var(--text-muted)' }}>OPTIONAL</span>
                </label>
                <textarea
                  className="input-field resize-none"
                  rows={4}
                  placeholder="Describe your project idea, goals, rough timeline, or tech preferences. Our managers will analyse your requirements and get back to you within 48 hours..."
                  value={projectDesc}
                  onChange={e => setProjectDesc(e.target.value)}
                />
                <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  This goes straight to our project managers and tech leads for resource analysis.
                </p>
              </div>

              {/* What happens next */}
              <div className="rounded-xl p-4 space-y-2.5" style={{ background: 'var(--row-hover-bg)', border: '1px solid var(--border)' }}>
                <p className="text-mono-label" style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.3em' }}>WHAT HAPPENS AFTER YOU REGISTER</p>
                {[
                  { icon: Users, text: 'Managers & tech leads review your brief and scope resources', color: '#818cf8' },
                  { icon: UserCheck, text: 'Right freelancers are onboarded and assigned to your project', color: '#f97316' },
                  { icon: FlaskConical, text: 'Every deliverable passes QA before it reaches you', color: '#eab308' },
                  { icon: BarChart3, text: 'Track everything live in your client dashboard', color: '#2dd4bf' },
                ].map(({ icon: Icon, text, color }) => (
                  <div key={text} className="flex items-center gap-2.5">
                    <Icon size={12} className="shrink-0" style={{ color }} />
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{text}</p>
                  </div>
                ))}
              </div>

              {/* Dashboard access highlight */}
              <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl"
                style={{ background: 'rgba(45,212,191,0.06)', border: '1px solid rgba(45,212,191,0.2)' }}>
                <BarChart3 size={14} className="mt-0.5 shrink-0" style={{ color: '#2dd4bf' }} />
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  After registration you'll have access to a <strong style={{ color: '#2dd4bf' }}>live client dashboard</strong> — view freelancer worklogs, task status, sprint progress, QA reports, and payment history all in one place.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 font-bold text-sm py-3.5 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: accent, color: '#000' }}
              >
                {loading
                  ? <><Loader2 size={15} className="animate-spin" /> Creating Account...</>
                  : <><CheckCircle2 size={15} /> Create Client Account <ArrowRight size={15} /></>
                }
              </button>
            </form>

            <p className="mt-6 text-center text-mono-label" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              ALREADY HAVE AN ACCOUNT?{' '}
              <Link href="/login" className="transition-colors" style={{ color: accent }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = accent)}>
                SIGN IN →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
