'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { SiteHeader, Wordmark } from '@/components/brand/SiteHeader'
import { Showcase } from '@/components/brand/Showcase'
import { useCurrencySymbol } from '@/lib/store'

const skills = [
  'React / Next.js', 'Node.js / NestJS', 'Python / Django', 'Flutter / React Native',
  'UI/UX Design', 'DevOps / AWS', 'PostgreSQL', 'TypeScript',
  'Figma', 'Vue.js', 'Laravel / PHP', 'Docker / Kubernetes',
]

const benefits = [
  { title: 'Competitive Pay',    desc: 'Set your own hourly rate. Get paid on time, every time — with full payment history.' },
  { title: 'Flexible Hours',     desc: 'Work from anywhere, on your own schedule. Take projects that fit your availability.' },
  { title: 'Secure Contracts',   desc: 'Every engagement is tracked, logged, and documented. No scope creep, no disputes.' },
  { title: 'Premium Clients',    desc: 'Access a curated pool of vetted clients with real budgets and real projects.' },
  { title: 'Build Your Profile', desc: 'Your skills and portfolio grow with every project. Stand out in the talent pool.' },
  { title: 'Community Access',   desc: 'Join a network of elite engineers. Get peer reviews, referrals, and collaborations.' },
]

const steps = [
  { no: '01 / 04', title: 'Submit Your Profile', desc: 'Fill in your skills, experience, hourly rate, and portfolio. Takes less than 5 minutes.', img: '/brand/cap-strategy.webp' },
  { no: '02 / 04', title: 'Get Verified',        desc: 'Our admin team reviews your profile and skills. Approval typically within 24 hours.', img: '/brand/cap-engineering.webp' },
  { no: '03 / 04', title: 'Match With Projects', desc: 'Get matched with projects that fit your expertise. Review briefs and accept what you want.', img: '/brand/cap-digital.webp' },
  { no: '04 / 04', title: 'Deliver & Get Paid',  desc: 'Log your work daily, hit milestones, and receive payment automatically on completion.', img: '/brand/cap-ai.webp' },
]

const specializations = ['Frontend', 'Backend', 'Design', 'Mobile', 'Full-Stack', 'DevOps']

export default function HomePage() {
  const curr = useCurrencySymbol()

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      <SiteHeader
        links={[
          { label: 'How it works', href: '#how-it-works' },
          { label: 'Skills', href: '#skills' },
          { label: 'For clients', href: '/clients' },
        ]}
        cta={{ label: 'Join', href: '/register/freelancer' }}
      />

      <main className="site-main">

        {/* 01 · Hero ─────────────────────────────────────────── */}
        <section className="force-dark relative min-h-screen flex items-center justify-center text-center overflow-hidden page-x">
          <video className="bg-video" autoPlay muted loop playsInline poster="/brand/hero-poster.webp" aria-hidden="true">
            <source src="/brand/hero-loop.mp4" type="video/mp4" />
          </video>
          <div className="bg-scrim" aria-hidden="true" />
          <p className="hero-meta hidden md:block" style={{ top: '6.5rem', left: 'clamp(1.2rem,4vw,3.5rem)' }}>For elite freelancers</p>
          <p className="hero-meta hidden md:block" style={{ top: '6.5rem', right: 'clamp(1.2rem,4vw,3.5rem)' }}>Vetted network</p>
          <p className="hero-meta hidden md:block" style={{ bottom: '2.4rem', left: 'clamp(1.2rem,4vw,3.5rem)' }}>Kerala / India — Global</p>
          <p className="hero-meta hidden md:block" style={{ bottom: '2.4rem', right: 'clamp(1.2rem,4vw,3.5rem)' }}>Est. 2026</p>

          <div className="relative z-10 max-w-5xl pt-24 pb-28">
            <h1 className="text-display-xl reveal-lines">
              <span><span>YOUR SKILLS.</span></span>
              <span><span className="text-accent font-normal">your terms.</span></span>
              <span><span>YOUR INCOME.</span></span>
            </h1>
            <p className="lede mt-10 max-w-xl mx-auto">
              A platform built for serious professionals. Premium clients, challenging projects,
              and pay that arrives on time, every time.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-10">
              <Link href="/register/freelancer" className="btn-primary py-3 px-6">
                Apply Now <ArrowRight size={14} />
              </Link>
              <a href="#how-it-works" className="btn-ghost py-3 px-6">See How It Works</a>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-10 mt-14">
              {[
                { num: '100+',        label: 'Active Freelancers' },
                { num: `${curr}2.4M`, label: 'Paid Out' },
                { num: '94%',         label: 'On-Time Rate' },
              ].map(({ num, label }) => (
                <div key={label}>
                  <p className="text-display text-3xl">{num}</p>
                  <p className="text-mono-label mt-2">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="scroll-cue" aria-hidden="true"><span className="cue-line" />SCROLL</div>
        </section>

        {/* Specializations strip ─────────────────────────────── */}
        <div className="border-y border-theme py-5 page-x flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="text-mono-label">We hire for</span>
          {specializations.map(s => (
            <span key={s} className="text-mono-label" style={{ color: 'var(--fg)' }}>{s}</span>
          ))}
        </div>

        {/* 02 · Benefits ─────────────────────────────────────── */}
        <section className="section-y page-x">
          <div className="max-w-5xl mb-14">
            <span className="chapter-no">02 — Why join</span>
            <h2 className="text-display-xl">Built for<br />professionals.</h2>
            <p className="lede mt-6 measure">Everything a serious freelancer needs, and nothing that gets in the way.</p>
          </div>
          <div className="border-t border-theme">
            {benefits.map((b, i) => (
              <div key={b.title} className="grid grid-cols-1 md:grid-cols-[6rem_1fr_1.4fr] gap-2 md:gap-8 py-7 border-b border-theme items-baseline">
                <span className="text-mono-label">{String.fromCharCode(65 + i)} / 06</span>
                <h3 className="text-2xl md:text-4xl">{b.title}</h3>
                <p className="text-secondary-ui leading-relaxed">— {b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 03 · How it works: pinned horizontal showcase ─────── */}
        <Showcase
          id="how-it-works"
          items={steps}
          head={
            <>
              <span className="chapter-no">03 — Process</span>
              <h2 className="text-display text-5xl md:text-7xl">How it<br />works.</h2>
              <p className="lede mt-6">Four steps from profile to paid. Keep scrolling.</p>
            </>
          }
        />

        {/* 04 · Skills ───────────────────────────────────────── */}
        <section id="skills" className="section-y page-x">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <span className="chapter-no">04 — In demand</span>
              <h2 className="text-display text-5xl md:text-7xl">Skills we<br />need now.</h2>
              <p className="lede mt-6 mb-10 measure">
                If your skill is listed, there&apos;s a project waiting for you right now.
              </p>
              <Link href="/register/freelancer" className="btn-primary py-3 px-6">
                Apply With Your Skills <ArrowRight size={14} />
              </Link>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 border-t border-theme">
              {skills.map(skill => (
                <li key={skill} className="py-4 border-b border-theme text-secondary-ui">— {skill}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* 05 · CTA ──────────────────────────────────────────── */}
        <section className="section-y page-x text-center border-y border-theme">
          <div className="max-w-4xl mx-auto">
            <span className="chapter-no center">05 — Start today</span>
            <h2 className="text-display-xl">Ready to join<br /><span className="text-accent font-normal">the</span> network?</h2>
            <p className="lede mt-8">Your profile takes five minutes. Approval within 24 hours.</p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-10">
              <Link href="/register/freelancer" className="btn-primary py-3 px-8">
                Create Your Profile <ArrowRight size={14} />
              </Link>
              <Link href="/login" className="btn-ghost py-3 px-6">Already have an account?</Link>
            </div>
          </div>
        </section>

        {/* 06 · Clients ──────────────────────────────────────── */}
        <section className="section-y page-x">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
            <div className="lg:max-w-2xl">
              <span className="chapter-no">06 — For clients</span>
              <h2 className="text-display text-4xl md:text-6xl">Looking to hire<br />freelancers?</h2>
              <p className="lede mt-6">
                Submit your idea or request a callback. We&apos;ll match you with the right
                specialists from our vetted network within 48 hours.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <Link href="/clients" className="btn-primary py-3 px-8 invert">
                Submit a Project <ArrowRight size={14} />
              </Link>
              <Link href="/clients#get-started" className="btn-ghost py-3 px-6">Request a Callback</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-theme page-x py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
        <Link href="/"><Wordmark /></Link>
        <div className="flex items-center gap-8">
          <Link href="/clients" className="site-nav-link">For clients</Link>
          <Link href="/login" className="site-nav-link">Launch app</Link>
        </div>
        <p className="text-mono-label">© 2026 Blackorwhite</p>
      </footer>
    </div>
  )
}
