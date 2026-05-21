'use client'

import Link from 'next/link'
import {
  ArrowRight, CheckCircle, Code2, Palette, Server, Smartphone,
  DollarSign, Clock, Shield, Star, Users, Briefcase, ChevronRight,
  Globe, X, ExternalLink,
} from 'lucide-react'
import { CrimsonCube } from '@/components/ui/CrimsonCube'
import { MorphBlob } from '@/components/ui/MorphBlob'
import { useCurrencySymbol } from '@/lib/store'

const skills = [
  'React / Next.js', 'Node.js / NestJS', 'Python / Django', 'Flutter / React Native',
  'UI/UX Design', 'DevOps / AWS', 'PostgreSQL', 'TypeScript',
  'Figma', 'Vue.js', 'Laravel / PHP', 'Docker / Kubernetes',
]

const benefits = [
  {
    icon: <DollarSign size={22} />,
    title: 'Competitive Pay',
    desc: 'Set your own hourly rate. Get paid on time, every time — with full payment history and automated calculations.',
  },
  {
    icon: <Clock size={22} />,
    title: 'Flexible Hours',
    desc: 'Work from anywhere, on your own schedule. Take projects that fit your availability and expertise.',
  },
  {
    icon: <Shield size={22} />,
    title: 'Secure Contracts',
    desc: 'Every engagement is tracked, logged, and documented. No scope creep, no disputes — just clear deliverables.',
  },
  {
    icon: <Briefcase size={22} />,
    title: 'Premium Clients',
    desc: 'Access a curated pool of vetted clients with real budgets and real projects — no time-wasters.',
  },
  {
    icon: <Star size={22} />,
    title: 'Build Your Profile',
    desc: 'Your skills, ratings, and portfolio grow with every completed project. Stand out in the talent pool.',
  },
  {
    icon: <Users size={22} />,
    title: 'Community Access',
    desc: 'Join a network of elite engineers and designers. Get peer reviews, referrals, and collaboration opportunities.',
  },
]

const steps = [
  { num: '01', title: 'Submit Your Profile', desc: 'Fill in your skills, experience, hourly rate, and portfolio. Takes less than 5 minutes.' },
  { num: '02', title: 'Get Verified', desc: 'Our admin team reviews your profile and skills. Approval typically within 24 hours.' },
  { num: '03', title: 'Match With Projects', desc: 'Get matched with projects that fit your expertise. Review briefs and accept what interests you.' },
  { num: '04', title: 'Deliver & Get Paid', desc: 'Log your work daily, hit milestones, and receive payment automatically on completion.' },
]

const specializations = [
  { icon: <Code2 size={20} />, label: 'Frontend' },
  { icon: <Server size={20} />, label: 'Backend' },
  { icon: <Palette size={20} />, label: 'Design' },
  { icon: <Smartphone size={20} />, label: 'Mobile' },
  { icon: <Globe size={20} />, label: 'Full-Stack' },
  { icon: <Shield size={20} />, label: 'DevOps' },
]

export default function HomePage() {
  const curr = useCurrencySymbol()
  return (
    <div className="min-h-screen" style={{ background: '#0a0a0c', color: 'white' }}>

      {/* Header */}
      <header className="glass-card-dark border-b border-[rgba(255,255,255,0.08)] fixed top-0 left-0 right-0 z-50 px-12 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <CrimsonCube size={24} />
          <span className="text-display text-[#DC143C] font-bold text-base tracking-widest uppercase" style={{ textShadow: '0 0 20px #DC143C66' }}>
            FREELANCE_PRO
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="text-mono-label hover:text-white transition-colors text-xs tracking-widest">HOW IT WORKS</a>
          <a href="#skills" className="text-mono-label hover:text-white transition-colors text-xs tracking-widest">SKILLS</a>
          <Link href="/clients" className="text-mono-label hover:text-white transition-colors text-xs tracking-widest" style={{ color: '#DC143C' }}>FOR CLIENTS →</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login"
            className="flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold transition-all"
            style={{ border: '1px solid rgba(220,20,60,0.35)', color: '#DC143C', background: 'rgba(220,20,60,0.06)' }}>
            Login
          </Link>
          <Link href="/register/freelancer" className="btn-primary rounded flex items-center gap-2 text-sm">
            Join Now <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="min-h-screen flex items-center pt-24 pb-16 relative overflow-hidden">
        <div className="grid-overlay pointer-events-none absolute inset-0 z-0" />
        <MorphBlob color="#8B0000" size={600} top="-150px" right="-150px" />
        <MorphBlob color="#3D0000" size={400} bottom="-100px" left="-100px" delay="2s" />

        <div className="max-w-7xl mx-auto px-12 relative z-10">
          <div className="max-w-3xl">
            <p className="text-mono-label text-[#DC143C] text-xs tracking-widest mb-6 flex items-center gap-2">
              <span className="w-8 h-px bg-[#DC143C] inline-block" />
              FOR ELITE FREELANCERS
            </p>
            <h1 className="text-display text-6xl md:text-7xl lg:text-8xl leading-none mb-6">
              <span className="block" style={{ background: 'linear-gradient(to bottom, #ffffff 30%, #DC143C 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>YOUR SKILLS.</span>
              <span className="block text-white">YOUR TERMS.</span>
              <span className="block" style={{ background: 'linear-gradient(to bottom, #ffffff 30%, #DC143C 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>YOUR INCOME.</span>
            </h1>
            <p className="text-lg leading-relaxed max-w-xl mb-10" style={{ color: 'rgba(240,240,242,0.55)' }}>
              Join a platform built for serious professionals. Get matched with premium clients, work on challenging projects, and get paid what you&apos;re worth — on time, every time.
            </p>
            <div className="flex items-center gap-4 mb-12">
              <Link href="/register/freelancer" className="btn-primary flex items-center gap-2 text-base py-3 px-6 rounded">
                Apply Now <ArrowRight size={18} />
              </Link>
              <a href="#how-it-works" className="btn-ghost text-sm py-3 px-6 rounded">
                See How It Works
              </a>
            </div>
            <div className="flex items-center gap-8">
              {[{ num: '100+', label: 'ACTIVE FREELANCERS' }, { num: `${curr}2.4M`, label: 'PAID OUT' }, { num: '94%', label: 'ON-TIME RATE' }].map(({ num, label }) => (
                <div key={label}>
                  <p className="text-white text-2xl font-bold text-display">{num}</p>
                  <p className="text-mono-label text-xs tracking-widest" style={{ color: 'rgba(240,240,242,0.4)' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Specializations bar */}
      <section className="py-8 border-y border-[rgba(255,255,255,0.06)]" style={{ background: '#0e0e11' }}>
        <div className="max-w-7xl mx-auto px-12">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-mono-label text-xs tracking-widest mr-4" style={{ color: 'rgba(240,240,242,0.35)' }}>WE HIRE FOR:</span>
            {specializations.map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-2 glass-card px-4 py-2 rounded-full">
                <span className="text-[#DC143C]">{icon}</span>
                <span className="text-sm font-medium text-white">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-12">
          <div className="text-center mb-16">
            <p className="text-mono-label text-[#DC143C] text-xs tracking-widest mb-3 flex items-center justify-center gap-2">
              <span className="w-8 h-px bg-[#DC143C]" />WHY JOIN<span className="w-8 h-px bg-[#DC143C]" />
            </p>
            <h2 className="text-display text-white text-5xl font-bold">
              BUILT FOR <span style={{ background: 'linear-gradient(to bottom, #ffffff 30%, #DC143C 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>PROFESSIONALS</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {benefits.map(({ icon, title, desc }) => (
              <div key={title} className="glass-card p-6 rounded-xl group hover:border-[rgba(220,20,60,0.4)] transition-all duration-300">
                <div className="w-11 h-11 rounded-lg bg-[rgba(220,20,60,0.1)] flex items-center justify-center text-[#DC143C] mb-5 group-hover:bg-[rgba(220,20,60,0.18)] transition-colors">
                  {icon}
                </div>
                <h3 className="text-white font-bold text-base mb-2">{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(240,240,242,0.5)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 relative" style={{ background: '#0e0e11' }}>
        <MorphBlob color="#4A0000" size={500} top="-100px" left="0px" delay="1s" />
        <div className="max-w-7xl mx-auto px-12 relative z-10">
          <div className="text-center mb-16">
            <p className="text-mono-label text-[#DC143C] text-xs tracking-widest mb-3 flex items-center justify-center gap-2">
              <span className="w-8 h-px bg-[#DC143C]" />PROCESS<span className="w-8 h-px bg-[#DC143C]" />
            </p>
            <h2 className="text-display text-white text-5xl font-bold">
              HOW IT <span style={{ background: 'linear-gradient(to bottom, #ffffff 30%, #DC143C 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>WORKS</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div key={step.num} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px z-0" style={{ background: 'rgba(220,20,60,0.2)' }} />
                )}
                <div className="glass-card p-6 rounded-xl relative z-10">
                  <p className="text-display text-4xl font-bold mb-4" style={{ color: 'rgba(220,20,60,0.25)' }}>{step.num}</p>
                  <h3 className="text-white font-bold text-base mb-2">{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(240,240,242,0.5)' }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* In-Demand Skills */}
      <section id="skills" className="py-24">
        <div className="max-w-7xl mx-auto px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-mono-label text-[#DC143C] text-xs tracking-widest mb-3 flex items-center gap-2">
                <span className="w-8 h-px bg-[#DC143C]" />IN DEMAND
              </p>
              <h2 className="text-display text-white text-5xl font-bold mb-6">
                SKILLS WE <span style={{ background: 'linear-gradient(to bottom, #ffffff 30%, #DC143C 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>NEED NOW</span>
              </h2>
              <p className="text-lg leading-relaxed mb-8" style={{ color: 'rgba(240,240,242,0.5)' }}>
                We&apos;re actively matching clients with specialists across the full technology stack. If your skill is listed, there&apos;s a project waiting for you right now.
              </p>
              <Link href="/register/freelancer" className="btn-primary inline-flex items-center gap-2 rounded text-sm py-3 px-6">
                Apply With Your Skills <ChevronRight size={16} />
              </Link>
            </div>
            <div className="flex flex-wrap gap-3">
              {skills.map((skill) => (
                <div
                  key={skill}
                  className="glass-card px-4 py-2.5 rounded-lg flex items-center gap-2 hover:border-[rgba(220,20,60,0.4)] transition-all group cursor-default"
                >
                  <CheckCircle size={14} className="text-[#DC143C] shrink-0" />
                  <span className="text-sm font-medium text-white">{skill}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Freelancer CTA */}
      <section className="py-20 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a0008 0%, #0a0a0c 60%)' }}>
        <div className="absolute inset-0 grid-overlay opacity-50" />
        <div className="max-w-4xl mx-auto px-12 text-center relative z-10">
          <p className="text-mono-label text-[#DC143C] text-xs tracking-widest mb-4 flex items-center justify-center gap-2">
            <span className="w-8 h-px bg-[#DC143C]" />START TODAY<span className="w-8 h-px bg-[#DC143C]" />
          </p>
          <h2 className="text-display text-5xl md:text-6xl font-bold mb-6 text-white">
            READY TO JOIN THE <span style={{ background: 'linear-gradient(to bottom, #ffffff 30%, #DC143C 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>NETWORK?</span>
          </h2>
          <p className="text-lg mb-10" style={{ color: 'rgba(240,240,242,0.5)' }}>
            Your profile takes 5 minutes to set up. Approval within 24 hours. Your next project is waiting.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register/freelancer" className="btn-primary flex items-center gap-2 text-base py-3 px-8 rounded">
              Create Your Profile <ArrowRight size={18} />
            </Link>
            <Link href="/login" className="btn-ghost text-sm py-3 px-6 rounded">
              Already have an account?
            </Link>
          </div>
        </div>
      </section>

      {/* ── CLIENT CALLOUT ── */}
      <section className="py-20 relative overflow-hidden border-t border-[rgba(255,255,255,0.06)]" style={{ background: '#0e0e11' }}>
        <MorphBlob color="#1a3a6b" size={500} top="-80px" right="-80px" delay="1s" />
        <div className="max-w-7xl mx-auto px-12 relative z-10">
          <div className="glass-card rounded-2xl p-12 flex flex-col lg:flex-row items-center justify-between gap-10" style={{ borderColor: 'rgba(96,165,250,0.2)', background: 'rgba(96,165,250,0.04)' }}>
            <div className="lg:max-w-xl">
              <p className="text-mono-label text-xs tracking-widest mb-3 flex items-center gap-2" style={{ color: '#60a5fa' }}>
                <span className="w-8 h-px inline-block" style={{ background: '#60a5fa' }} />
                FOR CLIENTS
              </p>
              <h2 className="text-display text-4xl font-bold text-white mb-4">
                LOOKING TO HIRE FREELANCERS?
              </h2>
              <p className="text-base leading-relaxed" style={{ color: 'rgba(240,240,242,0.55)' }}>
                Have a project in mind? Submit your idea or request a callback — we&apos;ll match you with the right specialists from our vetted network within 48 hours.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <Link
                href="/clients"
                className="flex items-center justify-center gap-2 font-bold text-sm py-3 px-8 rounded-lg transition-all"
                style={{ background: '#60a5fa', color: '#000', whiteSpace: 'nowrap' }}
              >
                Submit a Project Idea <ArrowRight size={16} />
              </Link>
              <Link
                href="/clients#get-started"
                className="btn-ghost flex items-center justify-center gap-2 text-sm py-3 px-6 rounded-lg"
                style={{ whiteSpace: 'nowrap' }}
              >
                Request a Callback
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="glass-card-dark border-t border-[rgba(255,255,255,0.08)]">
        <div className="max-w-7xl mx-auto px-12 py-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CrimsonCube size={20} />
            <span className="text-display text-[#DC143C] text-sm font-bold tracking-widest uppercase">FREELANCE_PRO</span>
          </div>
          <div className="flex items-center gap-4" style={{ color: 'rgba(240,240,242,0.4)' }}>
            <a href="#" className="hover:text-white transition-colors p-1.5"><Globe size={18} /></a>
            <a href="#" className="hover:text-white transition-colors p-1.5"><X size={18} /></a>
            <a href="#" className="hover:text-white transition-colors p-1.5"><ExternalLink size={18} /></a>
          </div>
        </div>
        <div className="border-t border-[rgba(255,255,255,0.06)] px-12 py-4 flex items-center justify-between">
          <p className="text-mono-label text-xs tracking-widest" style={{ color: 'rgba(240,240,242,0.35)' }}>© 2025 FREELANCE_PRO. ALL RIGHTS RESERVED.</p>
          <div className="flex items-center gap-6">
            <Link href="/clients" className="text-mono-label text-xs tracking-widest hover:text-white transition-colors" style={{ color: 'rgba(240,240,242,0.35)' }}>FOR CLIENTS</Link>
            <Link href="/login" className="text-mono-label text-xs tracking-widest hover:text-white transition-colors" style={{ color: 'rgba(240,240,242,0.35)' }}>LAUNCH APP</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
