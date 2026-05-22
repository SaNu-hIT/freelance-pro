'use client'

import Link from 'next/link'
import { ArrowRight, Code2, Building2, Sun, Moon, ArrowLeft } from 'lucide-react'
import { CrimsonCube } from '@/components/ui/CrimsonCube'
import { useTheme } from '@/lib/theme'

export default function RegisterPage() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-theme shrink-0" style={{ background: 'var(--bg-sidebar)' }}>
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-75 transition-opacity">
          <CrimsonCube size={20} />
          <span className="text-sm font-bold tracking-widest uppercase text-primary-ui" style={{ fontFamily: 'JetBrains Mono,monospace' }}>FREELANCE_PRO</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold tracking-widest transition-all"
            style={{ fontFamily: 'JetBrains Mono,monospace', color: '#DC143C', background: 'var(--crimson-dim)', border: '1px solid var(--border-crimson)' }}
          >
            {theme === 'dark' ? <><Sun size={11} /><span>LIGHT</span></> : <><Moon size={11} /><span>DARK</span></>}
          </button>
          <Link href="/login"
            className="px-3 py-1.5 rounded text-[10px] font-bold tracking-widest border border-theme text-secondary-ui transition-all hover:text-primary-ui"
            style={{ fontFamily: 'JetBrains Mono,monospace' }}>
            ← LOGIN
          </Link>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex items-center justify-center px-6 py-16 relative overflow-hidden">

        {/* Subtle grid */}
        <div className="grid-overlay pointer-events-none absolute inset-0 opacity-50" />

        {/* Blobs */}
        <div className="blob" style={{ width: 500, height: 500, background: '#8B0000', top: -150, right: -150 }} />
        <div className="blob" style={{ width: 350, height: 350, background: '#1a3a6b', bottom: -100, left: -100, animationDelay: '3s' }} />

        <div className="relative z-10 w-full max-w-2xl">

          {/* Heading */}
          <div className="text-center mb-12">
            <p className="text-mono-label text-[#DC143C] mb-4 text-[10px] tracking-[0.3em]">CREATE YOUR ACCOUNT</p>
            <h1 className="text-display font-bold text-primary-ui mb-4" style={{ fontSize: 'clamp(2.5rem,6vw,4.5rem)', lineHeight: 1 }}>
              WHO ARE <span className="text-gradient-hero">YOU?</span>
            </h1>
            <p className="text-base text-secondary-ui max-w-sm mx-auto">
              Choose your path to get started with the right setup for you.
            </p>
          </div>

          {/* Role cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Freelancer */}
            <Link href="/register/freelancer"
              className="glass-card group rounded-2xl p-8 flex flex-col gap-5 transition-all duration-200 hover:border-[rgba(220,20,60,0.45)] hover:-translate-y-1"
              style={{ background: 'var(--bg-surface)' }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-colors"
                style={{ background: 'var(--crimson-dim)', border: '1px solid var(--border-crimson)' }}>
                <Code2 size={26} className="text-[#DC143C]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-primary-ui">Freelancer</h2>
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-bold tracking-widest"
                    style={{ fontFamily: 'JetBrains Mono,monospace', background: 'var(--crimson-dim)', border: '1px solid var(--border-crimson)', color: '#DC143C' }}>
                    PROFESSIONAL
                  </span>
                </div>
                <p className="text-sm text-secondary-ui leading-relaxed">
                  Apply as a vetted professional or intern. Get matched with premium projects and build your track record.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-[#DC143C] group-hover:gap-3 transition-all">
                Get Started <ArrowRight size={15} />
              </div>
            </Link>

            {/* Client */}
            <Link href="/register/client"
              className="glass-card group rounded-2xl p-8 flex flex-col gap-5 transition-all duration-200 hover:border-[rgba(96,165,250,0.45)] hover:-translate-y-1"
              style={{ background: 'var(--bg-surface)' }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-colors"
                style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)' }}>
                <Building2 size={26} style={{ color: '#60a5fa' }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-primary-ui">Client</h2>
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-bold tracking-widest"
                    style={{ fontFamily: 'JetBrains Mono,monospace', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)', color: '#60a5fa' }}>
                    HIRE TALENT
                  </span>
                </div>
                <p className="text-sm text-secondary-ui leading-relaxed">
                  Post your project and get matched with vetted specialists. Track progress, review deliverables, and pay on milestones.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-bold group-hover:gap-3 transition-all" style={{ color: '#60a5fa' }}>
                Get Started <ArrowRight size={15} />
              </div>
            </Link>
          </div>

          <p className="text-center mt-8 text-sm text-muted-ui">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold transition-colors hover:opacity-80" style={{ color: '#DC143C' }}>
              Sign in
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}
