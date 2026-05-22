'use client'

import { useState, FormEvent, KeyboardEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Loader2, X, Plus, ArrowLeft, Code2, CheckCircle2,
  Upload, Shield, Clock, Star, ChevronRight, Zap,
  Briefcase, GraduationCap, ArrowRight, FileCheck,
  Users, BadgeCheck,
} from 'lucide-react'
import { authApi } from '@/lib/api'
import { MorphBlob } from '@/components/ui/MorphBlob'
import { useTheme } from '@/lib/theme'
import { Sun, Moon } from 'lucide-react'
import { useAuthStore } from '@/lib/store'

const SUGGESTED_SKILLS = [
  // Frontend
  'React', 'Next.js', 'Vue.js', 'Angular', 'TypeScript', 'JavaScript', 'Tailwind CSS', 'HTML/CSS',
  // Backend
  'Node.js', 'NestJS', 'Python', 'Django', 'FastAPI', 'PHP', 'Laravel', 'Ruby on Rails', 'Go', 'Java', 'Spring Boot',
  // CMS & eCommerce
  'WordPress', 'Shopify', 'WooCommerce', 'Webflow', 'Wix', 'Squarespace', 'Shopify Theme Dev', 'Shopify Apps',
  // Databases
  'PostgreSQL', 'MongoDB', 'MySQL', 'Redis', 'Supabase',
  // Mobile
  'Flutter', 'React Native', 'iOS', 'Android', 'SwiftUI', 'Firebase', 'Firestore Database', 'Google Maps API', 'Push Notifications', 'Mobile App UI Development',
  // Cloud & DevOps
  'AWS', 'Docker', 'Kubernetes', 'CI/CD', 'DevOps', 'Google Cloud', 'Azure', 'Vercel',
  // Design
  'Figma', 'UI/UX Design', 'Adobe XD', 'Framer',
  // AI & Vibe Coding
  'Vibe Coding', 'AI Integration', 'OpenAI API', 'LangChain', 'Prompt Engineering', 'Cursor', 'Bolt.new',
  // Other
  'GraphQL', 'REST APIs', 'Stripe Integration', 'SEO', 'Web Scraping',
]

const ONBOARDING_STEPS = [
  {
    num: '01',
    icon: Code2,
    title: 'Create Your Profile',
    desc: 'Set up your account with skills, rate, and a short bio. Takes less than 3 minutes.',
    color: '#DC143C',
  },
  {
    num: '02',
    icon: Upload,
    title: 'Submit Portfolio',
    desc: 'Upload links to your previous work — GitHub repos, live projects, case studies, or Dribbble shots.',
    color: '#f97316',
  },
  {
    num: '03',
    icon: FileCheck,
    title: 'Manager Review',
    desc: 'Our project managers personally review your portfolio and verify your expertise before approval.',
    color: '#eab308',
  },
  {
    num: '04',
    icon: BadgeCheck,
    title: 'Get Matched & Earn',
    desc: 'Once approved, you\'re added to the active talent pool and matched with relevant projects.',
    color: '#4ade80',
  },
]

export default function FreelancerRegisterPage() {
  const router = useRouter()
  const { login: storeLogin } = useAuthStore()
  const { theme, toggleTheme } = useTheme()

  const [track, setTrack] = useState<'freelancer' | 'intern'>('freelancer')
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [experience, setExperience] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [bio, setBio] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [depositAck, setDepositAck] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const addSkill = (skill: string) => {
    const s = skill.trim()
    if (s && !skills.includes(s)) setSkills(prev => [...prev, s])
    setSkillInput('')
  }
  const removeSkill = (skill: string) => setSkills(prev => prev.filter(s => s !== skill))
  const handleSkillKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill(skillInput) }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (skills.length === 0) { setError('Please add at least one skill.'); return }
    if (track === 'intern' && !depositAck) { setError('Please acknowledge the security deposit to continue.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await authApi.register({
        name, email, password, role: 'freelancer',
        skills,
        experience: parseInt(experience) || 0,
        hourlyRate: parseFloat(hourlyRate) || 0,
        bio: `${track === 'intern' ? '[INTERN] ' : ''}${bio}`,
      })
      const { user, token } = res.data
      storeLogin(user, token)
      router.push('/freelancer')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isIntern = track === 'intern'
  const accentColor = isIntern ? '#c084fc' : '#DC143C'
  const accentFaint = isIntern ? 'rgba(192,132,252,0.12)' : 'rgba(220,20,60,0.12)'
  const accentBorder = isIntern ? 'rgba(192,132,252,0.25)' : 'rgba(220,20,60,0.25)'

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <div className="grid-overlay pointer-events-none absolute inset-0 z-0" />
      <MorphBlob color="#8B0000" size={700} top="-200px" left="-200px" />
      <MorphBlob color="#3b0764" size={500} bottom="-150px" right="-100px" delay="4s" />

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
            <Link href="/register" className="flex items-center gap-1.5 text-xs transition-colors hover:text-primary-ui"
              style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em' }}>
              <ArrowLeft size={12} /> BACK
            </Link>
          </div>
        </div>

        {/* Headline */}
        <div className="mb-10">
          <p className="text-mono-label mb-4" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.4em' }}>
            TALENT ONBOARDING
          </p>
          <h2 className="text-display leading-none mb-5" style={{ fontSize: '3.2rem', color: 'var(--text-primary)' }}>
            JOIN THE<br />
            <span style={{
              background: 'linear-gradient(to right, #DC143C, #f97316)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              TALENT
            </span><br />
            NETWORK
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)', maxWidth: 340 }}>
            Join a vetted pool of professionals working on real projects. Your skills are reviewed — not just your resume.
          </p>
        </div>

        {/* How it works */}
        <div className="mb-10">
          <p className="text-mono-label mb-5" style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.35em' }}>
            HOW IT WORKS
          </p>
          <div className="space-y-0">
            {ONBOARDING_STEPS.map((s, i) => {
              const Icon = s.icon
              return (
                <div key={s.num} className="flex gap-4 group">
                  {/* spine */}
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all"
                      style={{ background: `${s.color}18`, border: `1px solid ${s.color}40` }}>
                      <Icon size={14} style={{ color: s.color }} />
                    </div>
                    {i < ONBOARDING_STEPS.length - 1 && (
                      <div className="w-px flex-1 my-1.5" style={{ background: 'var(--border)', minHeight: 24 }} />
                    )}
                  </div>
                  {/* content */}
                  <div className="pb-5">
                    <div className="flex items-center gap-2 mb-1">
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

        {/* Track comparison cards */}
        <div className="mb-8">
          <p className="text-mono-label mb-4" style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.35em' }}>
            AVAILABLE TRACKS
          </p>
          <div className="space-y-3">

            {/* Freelancer track */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(220,20,60,0.06)', border: '1px solid rgba(220,20,60,0.2)' }}>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'rgba(220,20,60,0.15)' }}>
                  <Briefcase size={12} style={{ color: '#DC143C' }} />
                </div>
                <span className="text-sm font-bold text-primary-ui">Professional Freelancer</span>
                <span className="ml-auto text-mono-label px-2 py-0.5 rounded" style={{ fontSize: 9, background: 'rgba(220,20,60,0.12)', border: '1px solid rgba(220,20,60,0.25)', color: '#DC143C' }}>STANDARD</span>
              </div>
              <ul className="space-y-1">
                {[
                  'Portfolio review by senior manager',
                  'Set your own hourly rate',
                  'Work on multiple projects simultaneously',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <CheckCircle2 size={11} className="mt-0.5 shrink-0" style={{ color: 'rgba(220,20,60,0.6)' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Intern track */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(192,132,252,0.06)', border: '1px solid rgba(192,132,252,0.2)' }}>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'rgba(192,132,252,0.15)' }}>
                  <GraduationCap size={12} style={{ color: '#c084fc' }} />
                </div>
                <span className="text-sm font-bold text-primary-ui">Intern Programme</span>
                <span className="ml-auto text-mono-label px-2 py-0.5 rounded" style={{ fontSize: 9, background: 'rgba(192,132,252,0.12)', border: '1px solid rgba(192,132,252,0.25)', color: '#c084fc' }}>6 MONTHS</span>
              </div>
              <ul className="space-y-1 mb-3">
                {[
                  'Guided projects with senior mentorship',
                  'Build a verified track record on real work',
                  '₹10,000 security deposit — fully refunded after 6 months',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <CheckCircle2 size={11} className="mt-0.5 shrink-0" style={{ color: 'rgba(192,132,252,0.6)' }} />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(192,132,252,0.08)', border: '1px solid rgba(192,132,252,0.15)' }}>
                <Shield size={11} className="mt-0.5 shrink-0" style={{ color: '#c084fc' }} />
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  The ₹10,000 deposit ensures commitment and is <span style={{ color: '#c084fc', fontWeight: 600 }}>100% refunded</span> upon successful completion of the 6-month programme.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom trust row */}
        <div className="flex items-center gap-5 mt-auto pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          {[
            { icon: Users, val: '100+', label: 'ACTIVE FREELANCERS' },
            { icon: Star, val: '4.9', label: 'AVG RATING' },
            { icon: Clock, val: '48h', label: 'AVG REVIEW TIME' },
          ].map(({ icon: Icon, val, label }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon size={12} style={{ color: 'rgba(220,20,60,0.6)' }} />
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

          <div className="glass-card rounded-xl p-8" style={{ borderColor: `${accentColor}30` }}>

            {/* Header */}
            <div className="mb-7">
              <h1 className="text-primary-ui text-2xl font-bold mb-1" style={{ fontFamily: 'Cabinet Grotesk, Inter, sans-serif' }}>
                {isIntern ? 'Intern Application' : 'Freelancer Registration'}
              </h1>
              <p className="text-mono-label" style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                {isIntern ? 'START YOUR 6-MONTH PROGRAMME' : 'JOIN THE PROFESSIONAL NETWORK'}
              </p>
            </div>

            {/* Track switcher */}
            <div className="flex gap-2 mb-7 p-1 rounded-xl" style={{ background: 'var(--row-hover-bg)', border: '1px solid var(--border)' }}>
              {([
                { value: 'freelancer', label: 'Professional', icon: Briefcase, color: '#DC143C' },
                { value: 'intern', label: 'Intern', icon: GraduationCap, color: '#c084fc' },
              ] as const).map(opt => {
                const Icon = opt.icon
                const active = track === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setTrack(opt.value); setError('') }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
                    style={{
                      background: active ? `${opt.color}18` : 'transparent',
                      border: active ? `1px solid ${opt.color}50` : '1px solid transparent',
                      color: active ? opt.color : 'var(--text-muted)',
                    }}
                  >
                    <Icon size={13} />
                    {opt.label}
                    {opt.value === 'intern' && (
                      <span className="text-mono-label px-1.5 py-0.5 rounded" style={{ fontSize: 8, background: active ? 'rgba(192,132,252,0.15)' : 'var(--input-bg)', color: active ? '#c084fc' : 'var(--text-muted)', letterSpacing: '0.1em' }}>
                        ₹10K
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-7">
              {[1, 2].map((s, idx) => (
                <div key={s} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                    style={{
                      background: step >= s ? accentColor : 'var(--input-bg)',
                      color: step >= s ? '#fff' : 'var(--text-muted)',
                      border: step >= s ? 'none' : '1px solid var(--border)',
                    }}>
                    {step > s ? <CheckCircle2 size={14} /> : s}
                  </div>
                  <span className="text-mono-label text-xs" style={{ color: step >= s ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                    {s === 1 ? 'ACCOUNT' : 'PROFILE'}
                  </span>
                  {idx < 1 && (
                    <div className="w-10 h-px mx-1 transition-all" style={{ background: step > s ? accentColor : 'var(--border)' }} />
                  )}
                </div>
              ))}
              <div className="ml-auto text-mono-label" style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                STEP {step} / 2
              </div>
            </div>

            {/* Intern info banner */}
            {isIntern && (
              <div className="mb-6 px-4 py-3 rounded-xl flex items-start gap-3"
                style={{ background: 'rgba(192,132,252,0.07)', border: '1px solid rgba(192,132,252,0.2)' }}>
                <Shield size={15} className="mt-0.5 shrink-0" style={{ color: '#c084fc' }} />
                <div>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: '#c084fc' }}>Intern Programme — ₹10,000 Security Deposit</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    A refundable deposit is collected to ensure commitment. It is <strong style={{ color: 'var(--text-primary)' }}>100% returned</strong> after you successfully complete the 6-month internship.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-5 px-4 py-3 rounded-lg flex items-start gap-2 text-sm"
                style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}40`, color: accentColor }}>
                <Zap size={14} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {/* ── Step 1: Account ── */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="label-field">FULL NAME</label>
                  <input className="input-field" placeholder={isIntern ? 'Your full legal name' : 'Alex Rivera'} required value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <label className="label-field">EMAIL ADDRESS</label>
                  <input type="email" className="input-field" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="label-field">PASSWORD</label>
                  <input type="password" className="input-field" placeholder="••••••••" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} />
                  <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>Minimum 6 characters</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!name || !email || !password || password.length < 6) {
                      setError('Please fill in all fields correctly.')
                      return
                    }
                    setError('')
                    setStep(2)
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm mt-2 transition-all"
                  style={{ background: accentColor, color: '#fff' }}
                >
                  Continue to Profile <ChevronRight size={15} />
                </button>
              </div>
            )}

            {/* ── Step 2: Profile ── */}
            {step === 2 && (
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Skills */}
                <div>
                  <label className="label-field">YOUR SKILLS *</label>
                  <div className="input-field flex flex-wrap gap-2 min-h-[46px] cursor-text" onClick={() => document.getElementById('skill-input')?.focus()}>
                    {skills.map(s => (
                      <span key={s} className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium"
                        style={{ background: accentFaint, border: `1px solid ${accentBorder}`, color: isIntern ? '#c084fc' : '#f87171' }}>
                        {s}
                        <button type="button" onClick={() => removeSkill(s)} className="hover:text-primary-ui transition-colors"><X size={11} /></button>
                      </span>
                    ))}
                    <input
                      id="skill-input"
                      value={skillInput}
                      onChange={e => setSkillInput(e.target.value)}
                      onKeyDown={handleSkillKey}
                      placeholder="Add your own skill..."
                      className="flex-1 min-w-[140px] bg-transparent outline-none text-sm text-primary-ui placeholder:text-[var(--text-muted)]"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {SUGGESTED_SKILLS.filter(s => !skills.includes(s)).slice(0, 10).map(s => (
                      <button key={s} type="button" onClick={() => addSkill(s)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-all hover:text-primary-ui"
                        style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                        <Plus size={10} /> {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-field">YEARS OF EXPERIENCE</label>
                    <div className="relative">
                      <input type="number" min="0" max="50" className="input-field pr-10" placeholder="0" value={experience} onChange={e => setExperience(e.target.value)} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-muted)' }}>yrs</span>
                    </div>
                  </div>
                  {!isIntern && (
                    <div>
                      <label className="label-field">HOURLY RATE (USD)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>$</span>
                        <input type="number" min="0" className="input-field pl-7" placeholder="75" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} />
                      </div>
                    </div>
                  )}
                  {isIntern && (
                    <div>
                      <label className="label-field">INTERNSHIP DURATION</label>
                      <input className="input-field" value="6 Months" readOnly style={{ color: '#c084fc', cursor: 'default' }} />
                    </div>
                  )}
                </div>

                {/* Portfolio URL */}
                <div>
                  <label className="label-field flex items-center gap-1.5">
                    <Upload size={10} style={{ color: accentColor }} />
                    PORTFOLIO / PREVIOUS WORK
                    <span style={{ color: 'var(--text-muted)' }}>(REVIEWED BY MANAGER)</span>
                  </label>
                  <input
                    type="url"
                    className="input-field"
                    placeholder="https://github.com/you  or  https://your-portfolio.com"
                    value={portfolioUrl}
                    onChange={e => setPortfolioUrl(e.target.value)}
                  />
                  <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    Our managers review your work before approving your profile. GitHub, Dribbble, Behance, or a live site all work.
                  </p>
                </div>

                <div>
                  <label className="label-field">SHORT BIO</label>
                  <textarea
                    className="input-field resize-none"
                    rows={3}
                    placeholder={isIntern
                      ? 'Tell us about yourself, what you\'re learning, and why you want to join the programme...'
                      : 'Briefly describe your expertise and the kind of projects you enjoy working on...'}
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                  />
                </div>

                {/* Intern deposit acknowledgement */}
                {isIntern && (
                  <div
                    className="flex items-start gap-3 px-4 py-3.5 rounded-xl cursor-pointer transition-all"
                    style={{ background: depositAck ? 'rgba(192,132,252,0.08)' : 'var(--row-hover-bg)', border: `1px solid ${depositAck ? 'rgba(192,132,252,0.35)' : 'var(--input-bg)'}` }}
                    onClick={() => setDepositAck(v => !v)}
                  >
                    <div className="w-5 h-5 rounded flex items-center justify-center mt-0.5 shrink-0 transition-all"
                      style={{ background: depositAck ? '#c084fc' : 'var(--input-bg)', border: depositAck ? 'none' : '1px solid var(--border)' }}>
                      {depositAck && <CheckCircle2 size={13} style={{ color: 'var(--bg-base)' }} strokeWidth={2.5} />}
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      I understand that a <strong style={{ color: '#c084fc' }}>₹10,000 refundable security deposit</strong> is required to join the Intern Programme, and will be fully returned upon completing the 6-month internship.
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 px-5 py-3 rounded-lg text-sm font-semibold transition-all"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                    <ArrowLeft size={13} /> Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || (isIntern && !depositAck)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: accentColor, color: '#fff' }}
                  >
                    {loading
                      ? <><Loader2 size={15} className="animate-spin" /> Creating Account...</>
                      : isIntern
                        ? <><GraduationCap size={15} /> Apply for Internship <ArrowRight size={14} /></>
                        : <><BadgeCheck size={15} /> Create Freelancer Account <ArrowRight size={14} /></>
                    }
                  </button>
                </div>
              </form>
            )}

            <p className="mt-6 text-center text-mono-label" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              ALREADY HAVE AN ACCOUNT?{' '}
              <Link href="/login" className="transition-colors" style={{ color: accentColor }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = accentColor)}>
                SIGN IN →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
