'use client'

import Link from 'next/link'
import {
  ArrowRight, CheckCircle, Code2, Palette, Server, Smartphone,
  DollarSign, Clock, Shield, Star, Users, Briefcase, ChevronRight,
  Globe, X, ExternalLink, Sun, Moon,
} from 'lucide-react'
import { CrimsonCube } from '@/components/ui/CrimsonCube'
import { MorphBlob } from '@/components/ui/MorphBlob'
import { ParticleNetwork, WireframeCube, OrbitalRing, FloatingGlyph } from '@/components/ui/SceneBackground'
import { useCurrencySymbol } from '@/lib/store'
import { useTheme } from '@/lib/theme'

const skills = [
  'React / Next.js', 'Node.js / NestJS', 'Python / Django', 'Flutter / React Native',
  'UI/UX Design', 'DevOps / AWS', 'PostgreSQL', 'TypeScript',
  'Figma', 'Vue.js', 'Laravel / PHP', 'Docker / Kubernetes',
]

const benefits = [
  { icon: <DollarSign size={20} />, title: 'Competitive Pay',    desc: 'Set your own hourly rate. Get paid on time, every time — with full payment history.' },
  { icon: <Clock size={20} />,     title: 'Flexible Hours',      desc: 'Work from anywhere, on your own schedule. Take projects that fit your availability.' },
  { icon: <Shield size={20} />,    title: 'Secure Contracts',    desc: 'Every engagement is tracked, logged, and documented. No scope creep, no disputes.' },
  { icon: <Briefcase size={20} />, title: 'Premium Clients',     desc: 'Access a curated pool of vetted clients with real budgets and real projects.' },
  { icon: <Star size={20} />,      title: 'Build Your Profile',  desc: 'Your skills and portfolio grow with every project. Stand out in the talent pool.' },
  { icon: <Users size={20} />,     title: 'Community Access',    desc: 'Join a network of elite engineers. Get peer reviews, referrals, and collaborations.' },
]

const steps = [
  { num: '01', title: 'Submit Your Profile', desc: 'Fill in your skills, experience, hourly rate, and portfolio. Takes less than 5 minutes.' },
  { num: '02', title: 'Get Verified',        desc: 'Our admin team reviews your profile and skills. Approval typically within 24 hours.' },
  { num: '03', title: 'Match With Projects', desc: 'Get matched with projects that fit your expertise. Review briefs and accept what you want.' },
  { num: '04', title: 'Deliver & Get Paid',  desc: 'Log your work daily, hit milestones, and receive payment automatically on completion.' },
]

const specializations = [
  { icon: <Code2 size={16} />,     label: 'Frontend' },
  { icon: <Server size={16} />,    label: 'Backend' },
  { icon: <Palette size={16} />,   label: 'Design' },
  { icon: <Smartphone size={16} />,label: 'Mobile' },
  { icon: <Globe size={16} />,     label: 'Full-Stack' },
  { icon: <Shield size={16} />,    label: 'DevOps' },
]

export default function HomePage() {
  const curr = useCurrencySymbol()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 px-8 md:px-12 py-4 flex items-center justify-between border-b border-theme"
        style={{ background: 'var(--bg-sidebar)', backdropFilter: 'blur(12px)' }}
      >
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <CrimsonCube size={22} />
          <span className="text-display text-[#DC143C] font-bold text-sm tracking-widest uppercase hidden sm:block">
            FREELANCE_PRO
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <a href="#how-it-works" className="text-mono-label hover:text-primary-ui transition-colors text-[10px] tracking-widest">HOW IT WORKS</a>
          <a href="#skills"       className="text-mono-label hover:text-primary-ui transition-colors text-[10px] tracking-widest">SKILLS</a>
          <Link href="/clients"   className="text-mono-label transition-colors text-[10px] tracking-widest" style={{ color: '#DC143C' }}>FOR CLIENTS →</Link>
        </nav>

        <div className="flex items-center gap-2">
          {/* Theme toggle with text */}
          <button
            onClick={toggleTheme}
            className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase transition-all px-3 py-2 rounded"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: '#DC143C',
              background: 'var(--crimson-dim)',
              border: '1px solid var(--border-crimson)',
            }}
          >
            {theme === 'dark'
              ? <><Sun size={12} /><span>LIGHT</span></>
              : <><Moon size={12} /><span>DARK</span></>
            }
          </button>

          <Link
            href="/login"
            className="text-[11px] font-semibold px-4 py-2 rounded transition-all"
            style={{ border: '1px solid var(--border-crimson)', color: '#DC143C', background: 'var(--crimson-dim)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em' }}
          >
            LOGIN
          </Link>
          <Link href="/register/freelancer" className="btn-primary flex items-center gap-1.5 text-xs py-2 px-4 rounded">
            JOIN <ArrowRight size={12} />
          </Link>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="min-h-screen flex items-center pt-24 pb-20 relative overflow-hidden">
        {/* base grid */}
        <div className="grid-overlay pointer-events-none absolute inset-0 z-0" />

        {/* canvas particle network */}
        <ParticleNetwork count={65} dotColor="220,20,60" lineColor="220,20,60" className="z-0" />

        {/* depth blobs behind everything */}
        <MorphBlob color="#8B0000" size={700} top="-200px" right="-200px" />
        <MorphBlob color="#3D0000" size={450} bottom="-150px" left="-150px" delay="2s" />

        {/* rotating wireframe cubes */}
        <WireframeCube size={200} color="rgba(220,20,60,0.18)" duration={28} delay="0s"
          style={{ top: '10%', right: '6%', zIndex: 1 }} />
        <WireframeCube size={100} color="rgba(220,20,60,0.22)" duration={18} delay="-6s"
          style={{ top: '55%', right: '22%', zIndex: 1 }} />
        <WireframeCube size={60}  color="rgba(220,20,60,0.28)" duration={14} delay="-3s"
          style={{ bottom: '12%', right: '40%', zIndex: 1 }} />

        {/* orbital rings */}
        <OrbitalRing size={520} color="rgba(220,20,60,0.08)" tiltX={70} duration={18} delay="0s"
          style={{ top: '-80px', right: '-120px', zIndex: 1 }} />
        <OrbitalRing size={300} color="rgba(139,0,0,0.12)" tiltX={60} duration={11} delay="-4s"
          style={{ bottom: '5%', left: '-60px', zIndex: 1 }} />

        {/* floating hex glyphs */}
        <FloatingGlyph size={110} color="rgba(220,20,60,0.14)" duration={20} delay="0s"
          style={{ top: '18%', right: '30%', zIndex: 1 }} />
        <FloatingGlyph size={60}  color="rgba(220,20,60,0.18)" duration={14} delay="-5s" spin={false}
          style={{ bottom: '20%', right: '10%', zIndex: 1 }} />

        <div className="max-w-7xl mx-auto px-8 md:px-12 w-full relative z-10">
          <div className="max-w-3xl">

            <div className="inline-flex items-center gap-2 mb-8 px-3 py-1.5 rounded-full border border-theme text-[10px] font-bold tracking-widest uppercase" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#DC143C', background: 'var(--crimson-dim)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#DC143C] animate-pulse" />
              FOR ELITE FREELANCERS
            </div>

            <h1 className="text-display leading-none mb-8" style={{ fontSize: 'clamp(3.5rem, 9vw, 7rem)' }}>
              <span className="block text-gradient-hero">YOUR SKILLS.</span>
              <span className="block text-primary-ui">YOUR TERMS.</span>
              <span className="block text-gradient-hero">YOUR INCOME.</span>
            </h1>

            <p className="text-base md:text-lg leading-relaxed max-w-xl mb-10 text-secondary-ui">
              Join a platform built for serious professionals. Get matched with premium clients,
              work on challenging projects, and get paid what you&apos;re worth — on time, every time.
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-14">
              <Link href="/register/freelancer" className="btn-primary flex items-center gap-2 py-3 px-6 rounded text-sm">
                Apply Now <ArrowRight size={15} />
              </Link>
              <a href="#how-it-works" className="btn-ghost py-3 px-6 rounded text-sm">
                See How It Works
              </a>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-8 pt-8 border-t border-theme">
              {[
                { num: '100+',        label: 'Active Freelancers' },
                { num: `${curr}2.4M`, label: 'Paid Out' },
                { num: '94%',         label: 'On-Time Rate' },
              ].map(({ num, label }) => (
                <div key={label}>
                  <p className="text-2xl font-bold text-display text-primary-ui">{num}</p>
                  <p className="text-mono-label mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Specializations bar ──────────────────────────────────── */}
      <div className="border-y border-theme py-5" style={{ background: 'var(--bg-sidebar)' }}>
        <div className="max-w-7xl mx-auto px-8 md:px-12 flex flex-wrap items-center gap-3">
          <span className="text-mono-label mr-2">WE HIRE FOR:</span>
          {specializations.map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-theme text-sm font-medium text-secondary-ui" style={{ background: 'var(--bg-elevated)' }}>
              <span className="text-[#DC143C]">{icon}</span>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Benefits ────────────────────────────────────────────── */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-8 md:px-12">

          <div className="text-center mb-16">
            <p className="text-mono-label text-[#DC143C] mb-4 flex items-center justify-center gap-2">
              <span className="w-8 h-px bg-[#DC143C]" /> WHY JOIN <span className="w-8 h-px bg-[#DC143C]" />
            </p>
            <h2 className="text-display text-4xl md:text-5xl font-bold text-primary-ui">
              BUILT FOR <span className="text-gradient-hero">PROFESSIONALS</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {benefits.map(({ icon, title, desc }) => (
              <div key={title} className="glass-card p-6 rounded-xl group hover:border-[rgba(220,20,60,0.4)] transition-all duration-200">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 text-[#DC143C] shrink-0 transition-colors"
                  style={{ background: 'var(--crimson-dim)', border: '1px solid var(--border-crimson)' }}>
                  {icon}
                </div>
                <h3 className="text-primary-ui font-bold text-sm mb-2 uppercase tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{title}</h3>
                <p className="text-sm leading-relaxed text-secondary-ui">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 relative border-y border-theme" style={{ background: 'var(--bg-sidebar)' }}>
        <MorphBlob color="#4A0000" size={400} top="-80px" left="0px" delay="1s" />
        <div className="max-w-7xl mx-auto px-8 md:px-12 relative z-10">

          <div className="text-center mb-16">
            <p className="text-mono-label text-[#DC143C] mb-4 flex items-center justify-center gap-2">
              <span className="w-8 h-px bg-[#DC143C]" /> PROCESS <span className="w-8 h-px bg-[#DC143C]" />
            </p>
            <h2 className="text-display text-4xl md:text-5xl font-bold text-primary-ui">
              HOW IT <span className="text-gradient-hero">WORKS</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map((step, i) => (
              <div key={step.num} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px z-0" style={{ background: 'rgba(220,20,60,0.2)' }} />
                )}
                <div className="glass-card p-6 rounded-xl relative z-10 h-full">
                  <p className="text-display text-3xl font-bold mb-4" style={{ color: 'rgba(220,20,60,0.3)' }}>{step.num}</p>
                  <h3 className="text-primary-ui font-bold text-sm mb-2 uppercase tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{step.title}</h3>
                  <p className="text-sm leading-relaxed text-secondary-ui">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── In-Demand Skills ─────────────────────────────────────── */}
      <section id="skills" className="py-24">
        <div className="max-w-7xl mx-auto px-8 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            <div>
              <p className="text-mono-label text-[#DC143C] mb-4 flex items-center gap-2">
                <span className="w-8 h-px bg-[#DC143C]" /> IN DEMAND
              </p>
              <h2 className="text-display text-4xl md:text-5xl font-bold mb-6 text-primary-ui">
                SKILLS WE <span className="text-gradient-hero">NEED NOW</span>
              </h2>
              <p className="text-base leading-relaxed mb-8 text-secondary-ui">
                We&apos;re actively matching clients with specialists across the full technology stack.
                If your skill is listed, there&apos;s a project waiting for you right now.
              </p>
              <Link href="/register/freelancer" className="btn-primary inline-flex items-center gap-2 rounded text-sm py-3 px-6">
                Apply With Your Skills <ChevronRight size={15} />
              </Link>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {skills.map((skill) => (
                <div key={skill}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-theme cursor-default transition-all hover:border-[rgba(220,20,60,0.4)]"
                  style={{ background: 'var(--bg-surface)' }}>
                  <CheckCircle size={13} className="text-[#DC143C] shrink-0" />
                  <span className="text-sm font-medium text-primary-ui">{skill}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── Freelancer CTA ───────────────────────────────────────── */}
      <section className="py-20 relative overflow-hidden border-y border-theme" style={{ background: 'var(--bg-elevated)' }}>
        <div className="absolute inset-0 grid-overlay opacity-40" />
        <MorphBlob color="#8B0000" size={500} top="-100px" right="-80px" />
        <WireframeCube size={130} color="rgba(220,20,60,0.15)" duration={24} delay="-2s"
          style={{ bottom: '-20px', left: '8%', zIndex: 1 }} />
        <FloatingGlyph size={80} color="rgba(220,20,60,0.12)" duration={18} delay="-7s" spin
          style={{ top: '10%', left: '2%', zIndex: 1 }} />

        <div className="max-w-3xl mx-auto px-8 md:px-12 text-center relative z-10">
          <p className="text-mono-label text-[#DC143C] mb-4 flex items-center justify-center gap-2">
            <span className="w-8 h-px bg-[#DC143C]" /> START TODAY <span className="w-8 h-px bg-[#DC143C]" />
          </p>
          <h2 className="text-display text-4xl md:text-5xl font-bold mb-5 text-primary-ui">
            READY TO JOIN THE <span className="text-gradient-hero">NETWORK?</span>
          </h2>
          <p className="text-base mb-10 text-secondary-ui leading-relaxed">
            Your profile takes 5 minutes to set up. Approval within 24 hours.
            Your next project is waiting.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/register/freelancer" className="btn-primary flex items-center gap-2 py-3 px-8 rounded text-sm">
              Create Your Profile <ArrowRight size={16} />
            </Link>
            <Link href="/login" className="btn-ghost py-3 px-6 rounded text-sm">
              Already have an account?
            </Link>
          </div>
        </div>
      </section>

      {/* ── Client Callout ───────────────────────────────────────── */}
      <section className="py-20 relative overflow-hidden" style={{ background: 'var(--bg-sidebar)' }}>
        <MorphBlob color="#1a3a6b" size={400} top="-60px" right="-60px" delay="1s" />
        <div className="max-w-7xl mx-auto px-8 md:px-12 relative z-10">
          <div className="rounded-2xl p-10 md:p-12 flex flex-col lg:flex-row items-center justify-between gap-10 border"
            style={{ background: 'rgba(96,165,250,0.05)', borderColor: 'rgba(96,165,250,0.2)' }}>

            <div className="lg:max-w-xl">
              <p className="text-mono-label mb-3 flex items-center gap-2" style={{ color: '#60a5fa' }}>
                <span className="w-8 h-px inline-block" style={{ background: '#60a5fa' }} /> FOR CLIENTS
              </p>
              <h2 className="text-display text-3xl md:text-4xl font-bold text-primary-ui mb-4">
                LOOKING TO HIRE FREELANCERS?
              </h2>
              <p className="text-base leading-relaxed text-secondary-ui">
                Have a project in mind? Submit your idea or request a callback — we&apos;ll match you
                with the right specialists from our vetted network within 48 hours.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <Link href="/clients"
                className="flex items-center justify-center gap-2 font-bold text-xs py-3 px-8 rounded-lg transition-all"
                style={{ background: '#3b82f6', color: '#fff', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em' }}>
                SUBMIT A PROJECT <ArrowRight size={14} />
              </Link>
              <Link href="/clients#get-started"
                className="btn-ghost flex items-center justify-center gap-2 text-xs py-3 px-6 rounded-lg"
                style={{ whiteSpace: 'nowrap' }}>
                REQUEST A CALLBACK
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-theme" style={{ background: 'var(--bg-sidebar)' }}>
        <div className="max-w-7xl mx-auto px-8 md:px-12 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <CrimsonCube size={18} />
            <span className="text-display text-[#DC143C] text-xs font-bold tracking-widest uppercase">FREELANCE_PRO</span>
          </Link>

          <div className="flex items-center gap-5 text-muted-ui">
            <a href="#" className="hover:text-primary-ui transition-colors"><Globe size={16} /></a>
            <a href="#" className="hover:text-primary-ui transition-colors"><X size={16} /></a>
            <a href="#" className="hover:text-primary-ui transition-colors"><ExternalLink size={16} /></a>
          </div>
        </div>

        <div className="border-t border-theme px-8 md:px-12 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-mono-label text-muted-ui">© 2025 FREELANCE_PRO. ALL RIGHTS RESERVED.</p>
          <div className="flex items-center gap-6">
            <Link href="/clients" className="text-mono-label text-muted-ui hover:text-primary-ui transition-colors">FOR CLIENTS</Link>
            <Link href="/login"   className="text-mono-label text-muted-ui hover:text-primary-ui transition-colors">LAUNCH APP</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
