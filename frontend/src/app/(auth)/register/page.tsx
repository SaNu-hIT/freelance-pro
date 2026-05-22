'use client'

import Link from 'next/link'
import { ArrowRight, Code2, Building2 } from 'lucide-react'
import { CrimsonCube } from '@/components/ui/CrimsonCube'
import { MorphBlob } from '@/components/ui/MorphBlob'

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <div className="grid-overlay pointer-events-none absolute inset-0 z-0" />
      <MorphBlob color="#8B0000" size={600} top="-150px" right="-150px" delay="1s" />
      <MorphBlob color="#4A0000" size={400} bottom="-80px" left="-80px" />

      <div className="relative z-10 w-full max-w-2xl mx-4">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <CrimsonCube size={32} />
          <span className="text-display text-[#DC143C] text-xl font-bold tracking-widest uppercase" style={{ textShadow: '0 0 20px #DC143C66' }}>
            FREELANCE_PRO
          </span>
        </div>

        {/* Heading */}
        <div className="text-center mb-10">
          <p className="text-mono-label text-xs tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>CREATE YOUR ACCOUNT</p>
          <h1 className="text-display text-5xl font-bold text-primary-ui mb-4">
            WHO ARE <span style={{ background: 'linear-gradient(to bottom, #ffffff 30%, #DC143C 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>YOU?</span>
          </h1>
          <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
            Choose your path to get started with the right setup for you.
          </p>
        </div>

        {/* Role cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Freelancer card */}
          <Link
            href="/register/freelancer"
            className="glass-card rounded-2xl p-8 flex flex-col gap-5 group hover:border-[rgba(220,20,60,0.5)] transition-all duration-300 cursor-pointer"
            style={{ borderColor: 'rgba(220,20,60,0.2)' }}
          >
            <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'rgba(220,20,60,0.12)' }}>
              <Code2 size={28} className="text-[#DC143C]" />
            </div>
            <div>
              <p className="text-mono-label text-xs tracking-widest mb-2" style={{ color: 'rgba(220,20,60,0.8)' }}>I&apos;M A FREELANCER</p>
              <h2 className="text-primary-ui text-xl font-bold mb-3">Join the Network</h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Create your professional profile, showcase your skills, and get matched with premium client projects.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {['Get Matched', 'Set Your Rate', 'Track Earnings'].map(t => (
                <span key={t} className="text-xs px-3 py-1 rounded-full" style={{ background: 'rgba(220,20,60,0.08)', border: '1px solid rgba(220,20,60,0.2)', color: 'var(--text-secondary)' }}>{t}</span>
              ))}
            </div>
            <div className="flex items-center gap-2 font-bold text-sm text-[#DC143C] mt-auto group-hover:gap-3 transition-all">
              Apply as Freelancer <ArrowRight size={16} />
            </div>
          </Link>

          {/* Client card */}
          <Link
            href="/register/client"
            className="glass-card rounded-2xl p-8 flex flex-col gap-5 group hover:border-[rgba(96,165,250,0.5)] transition-all duration-300 cursor-pointer"
            style={{ borderColor: 'rgba(96,165,250,0.2)' }}
          >
            <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'rgba(96,165,250,0.12)' }}>
              <Building2 size={28} style={{ color: '#60a5fa' }} />
            </div>
            <div>
              <p className="text-mono-label text-xs tracking-widest mb-2" style={{ color: 'rgba(96,165,250,0.8)' }}>I&apos;M A CLIENT</p>
              <h2 className="text-primary-ui text-xl font-bold mb-3">Hire Top Talent</h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Submit projects, track progress in real time, and work with vetted specialists who deliver on time.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {['Post Projects', 'Track Progress', 'Pay Securely'].map(t => (
                <span key={t} className="text-xs px-3 py-1 rounded-full" style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)', color: 'var(--text-secondary)' }}>{t}</span>
              ))}
            </div>
            <div className="flex items-center gap-2 font-bold text-sm mt-auto group-hover:gap-3 transition-all" style={{ color: '#60a5fa' }}>
              Register as Client <ArrowRight size={16} />
            </div>
          </Link>
        </div>

        <p className="text-center mt-8 text-sm text-mono-label" style={{ color: 'var(--text-muted)' }}>
          ALREADY HAVE AN ACCOUNT?{' '}
          <Link href="/login" className="text-[#DC143C] hover:text-primary-ui transition-colors underline underline-offset-2">
            SIGN IN
          </Link>
        </p>
      </div>
    </div>
  )
}
