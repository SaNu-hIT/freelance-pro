'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight, Send, Phone, CheckCircle, Zap, Users, ShieldCheck,
  BarChart3, Clock, FolderKanban, Globe, X, ExternalLink, Sparkles,
} from 'lucide-react'
import { SiteHeader, Wordmark } from '@/components/brand/SiteHeader'
import { MorphBlob } from '@/components/ui/MorphBlob'
import api from '@/lib/api'
import { useCurrencySymbol } from '@/lib/store'
import { apiError } from '@/lib/utils'
import ErrorBanner from '@/components/ui/ErrorBanner'

type IdeaForm = {
  name: string
  email: string
  phone: string
  projectTitle: string
  description: string
  budgetRange: string
  timeline: string
}

type CallbackForm = {
  name: string
  phone: string
  email: string
  preferredCallbackTime: string
}

const howItWorks = [
  { num: '01', icon: <Send size={20} />, title: 'Submit Your Idea', desc: 'Describe your project in plain language. No technical jargon needed — we handle the translation.' },
  { num: '02', icon: <Users size={20} />, title: 'Get Matched', desc: 'We curate the right team members from our network based on your project requirements and budget.' },
  { num: '03', icon: <FolderKanban size={20} />, title: 'Track Progress', desc: 'Real-time updates, daily worklogs, and milestone reports — full visibility at every stage.' },
  { num: '04', icon: <CheckCircle size={20} />, title: 'Ship & Scale', desc: 'Receive your deliverable, approve payment, and scale up with the same team if needed.' },
]

const valueProps = [
  { icon: <Zap size={22} />, title: 'Fast Matching', desc: 'Get matched with the right team members within 24-48 hours of submitting your brief.' },
  { icon: <ShieldCheck size={22} />, title: 'Vetted Talent', desc: 'Every team member is manually reviewed and verified before joining our network.' },
  { icon: <BarChart3 size={22} />, title: 'Full Transparency', desc: 'Live dashboards, worklog tracking, and milestone updates — no black boxes.' },
  { icon: <Clock size={22} />, title: 'On-Time Delivery', desc: '94% on-time delivery rate. We monitor timelines and flag risks before they become problems.' },
]

const timelines = [
  'ASAP (< 2 weeks)', '2–4 weeks', '1–3 months', '3–6 months', '6+ months', 'Flexible',
]

const callbackTimes = [
  'Morning (9am–12pm)', 'Afternoon (12pm–5pm)', 'Evening (5pm–8pm)', 'Anytime',
]

export default function ClientsPage() {
  const curr = useCurrencySymbol()
  const budgetRanges = [
    `Under ${curr}1,000`, `${curr}1,000 – ${curr}5,000`, `${curr}5,000 – ${curr}15,000`,
    `${curr}15,000 – ${curr}50,000`, `${curr}50,000+`, 'Not sure yet',
  ]
  const [activeTab, setActiveTab] = useState<'idea' | 'callback'>('idea')
  const [ideaForm, setIdeaForm] = useState<IdeaForm>({
    name: '', email: '', phone: '', projectTitle: '',
    description: '', budgetRange: '', timeline: '',
  })
  const [callbackForm, setCallbackForm] = useState<CallbackForm>({
    name: '', phone: '', email: '', preferredCallbackTime: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitted, setSubmitted] = useState<'idea' | 'callback' | null>(null)

  const handleIdeaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError('')
    try {
      await api.post('/inquiries', { ...ideaForm, type: 'project_idea' })
      setSubmitted('idea')
    } catch (err) {
      setSubmitError(apiError(err, 'We could not send your request. Please try again.'))
    }
    setSubmitting(false)
  }

  const handleCallbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError('')
    try {
      await api.post('/inquiries', { ...callbackForm, type: 'callback' })
      setSubmitted('callback')
    } catch (err) {
      setSubmitError(apiError(err, 'We could not send your request. Please try again.'))
    }
    setSubmitting(false)
  }

  return (
    <div className="site-main min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      <SiteHeader
        links={[{ label: 'Home', href: '/' }, { label: 'For team members', href: '/freelancers' }]}
        cta={{ label: 'Get started', href: '#get-started' }}
      />

      {/* Hero */}
      <section className="min-h-screen flex items-center pt-24 pb-16 relative overflow-hidden">
        <div className="grid-overlay pointer-events-none absolute inset-0 z-0" />
        <MorphBlob color="var(--fg)" size={700} top="-200px" left="-200px" />
        <MorphBlob color="var(--surface)" size={500} bottom="-100px" right="-100px" delay="2s" />

        <div className="max-w-7xl mx-auto px-4 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          <div>
            <p className="text-mono-label text-[var(--fg)] text-xs tracking-widest mb-6 flex items-center gap-2">
              <span className="w-8 h-px bg-[var(--fg)] inline-block" />
              FOR AMBITIOUS CLIENTS
            </p>
            <h1 className="text-display-xl mb-6">
              <span className="block text-primary-ui">TURN YOUR</span>
              <span className="block text-gradient">IDEA INTO</span>
              <span className="block text-primary-ui">REALITY.</span>
            </h1>
            <p className="text-lg leading-relaxed max-w-lg mb-10" style={{ color: 'var(--text-secondary)' }}>
              Tell us what you want to build. We&apos;ll match you with the right specialists, manage the execution, and deliver on time — with full transparency at every step.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a href="#get-started" className="btn-primary flex items-center gap-2 text-base py-3 px-6 rounded">
                Submit Your Project <ArrowRight size={18} />
              </a>
              <a href="#how-it-works" className="btn-ghost text-sm py-3 px-6 rounded">
                See How It Works
              </a>
            </div>
          </div>

          {/* Mini stats */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: '50+', label: 'PROJECTS DELIVERED', color: 'var(--fg)' },
              { value: '94%', label: 'ON-TIME RATE', color: 'var(--fg)' },
              { value: '48h', label: 'AVG MATCH TIME', color: 'var(--fg)' },
              { value: `${curr}2.4M`, label: 'TOTAL BUDGET MANAGED', color: 'var(--fg)' },
            ].map(({ value, label, color }) => (
              <div key={label} className="glass-card metric-card rounded-xl text-center">
                <p className="text-3xl font-bold text-display mb-1" style={{ color }}>{value}</p>
                <p className="text-mono-label text-xs tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 relative" style={{ background: 'var(--bg-sidebar)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-12">
          <div className="text-center mb-16">
            <p className="text-mono-label text-[var(--fg)] text-xs tracking-widest mb-3 flex items-center justify-center gap-2">
              <span className="w-8 h-px bg-[var(--fg)]" />PROCESS<span className="w-8 h-px bg-[var(--fg)]" />
            </p>
            <h2 className="text-display text-primary-ui text-4xl md:text-5xl font-bold">
              FROM IDEA TO <span className="text-gradient">DELIVERY</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((step, i) => (
              <div key={step.num} className="relative">
                {i < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px z-0" style={{ background: 'rgb(var(--fg-rgb) / 0.2)' }} />
                )}
                <div className="glass-card p-6 rounded-xl relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-display text-2xl font-bold" style={{ color: 'rgb(var(--fg-rgb) / 0.25)' }}>{step.num}</span>
                    <span className="text-[var(--fg)]">{step.icon}</span>
                  </div>
                  <h3 className="text-primary-ui font-bold text-base mb-2">{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-12">
          <div className="text-center mb-16">
            <p className="text-mono-label text-[var(--fg)] text-xs tracking-widest mb-3 flex items-center justify-center gap-2">
              <span className="w-8 h-px bg-[var(--fg)]" />WHY US<span className="w-8 h-px bg-[var(--fg)]" />
            </p>
            <h2 className="text-display text-primary-ui text-4xl md:text-5xl font-bold">
              THE <span className="text-gradient">DIFFERENCE</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {valueProps.map(({ icon, title, desc }) => (
              <div key={title} className="glass-card p-6 rounded-xl group hover:border-[rgb(var(--fg-rgb)/0.4)] transition-all">
                <div className="w-11 h-11 rounded-lg bg-[rgb(var(--fg-rgb)/0.1)] flex items-center justify-center text-[var(--fg)] mb-5 group-hover:bg-[rgb(var(--fg-rgb)/0.18)] transition-colors">
                  {icon}
                </div>
                <h3 className="text-primary-ui font-bold text-base mb-2">{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── GET STARTED SECTION — Tabbed Forms ─── */}
      <section id="get-started" className="py-24 relative" style={{ background: 'var(--bg-sidebar)' }}>
        <MorphBlob color="var(--fg)" size={500} top="-100px" right="-100px" />
        <div className="max-w-3xl mx-auto px-4 md:px-12 relative z-10">
          <div className="text-center mb-12">
            <p className="text-mono-label text-[var(--fg)] text-xs tracking-widest mb-3 flex items-center justify-center gap-2">
              <span className="w-8 h-px bg-[var(--fg)]" />REACH OUT<span className="w-8 h-px bg-[var(--fg)]" />
            </p>
            <h2 className="text-display text-primary-ui text-4xl md:text-5xl font-bold mb-4">
              LET&apos;S <span className="text-gradient">TALK</span>
            </h2>
            <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
              Submit your project idea or request a callback — we&apos;ll get back to you within hours.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl overflow-hidden border border-[var(--input-bg)] mb-8">
            <button
              onClick={() => { setActiveTab('idea'); setSubmitted(null); setSubmitError('') }}
              className={`flex-1 py-4 text-sm font-bold tracking-wide transition-all flex items-center justify-center gap-2 ${
                activeTab === 'idea'
                  ? 'bg-[var(--fg)] text-[var(--bg)]'
                  : 'text-[var(--text-secondary)] hover:text-primary-ui hover:bg-[var(--input-bg)]'
              }`}
            >
              <Sparkles size={16} />
              SUBMIT A PROJECT IDEA
            </button>
            <button
              onClick={() => { setActiveTab('callback'); setSubmitted(null); setSubmitError('') }}
              className={`flex-1 py-4 text-sm font-bold tracking-wide transition-all flex items-center justify-center gap-2 ${
                activeTab === 'callback'
                  ? 'bg-[var(--fg)] text-[var(--bg)]'
                  : 'text-[var(--text-secondary)] hover:text-primary-ui hover:bg-[var(--input-bg)]'
              }`}
            >
              <Phone size={16} />
              REQUEST A CALLBACK
            </button>
          </div>

          {/* ── Project Idea Form ── */}
          {activeTab === 'idea' && (
            submitted === 'idea' ? (
              <div className="glass-card rounded-2xl p-12 text-center" style={{ borderColor: 'rgb(var(--fg-rgb) / 0.3)' }}>
                <div className="w-16 h-16 rounded-full bg-[rgb(var(--fg-rgb)/0.1)] flex items-center justify-center mx-auto mb-6">
                  <CheckCircle size={32} className="text-[var(--fg)]" />
                </div>
                <h3 className="text-primary-ui font-bold text-2xl mb-3">Idea Received!</h3>
                <p className="text-base mb-6" style={{ color: 'var(--text-secondary)' }}>
                  We&apos;ve logged your project idea. Our team will review it and reach out within <strong className="text-primary-ui">24 hours</strong>.
                </p>
                <button
                  onClick={() => { setSubmitted(null); setIdeaForm({ name: '', email: '', phone: '', projectTitle: '', description: '', budgetRange: '', timeline: '' }) }}
                  className="btn-ghost rounded text-sm py-2 px-6"
                >
                  Submit Another Idea
                </button>
              </div>
            ) : (
              <form onSubmit={handleIdeaSubmit} className="glass-card rounded-2xl p-8 space-y-5" style={{ borderColor: 'rgb(var(--fg-rgb) / 0.2)' }}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="inq-your-name" className="label-field">Your Name *</label>
                    <input
                      id="inq-your-name"
                      className="input-field"
                      placeholder="John Smith"
                      required
                      value={ideaForm.name}
                      onChange={e => setIdeaForm(f => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="inq-email" className="label-field">Email *</label>
                    <input
                      id="inq-email"
                      type="email"
                      className="input-field"
                      placeholder="john@company.com"
                      required
                      value={ideaForm.email}
                      onChange={e => setIdeaForm(f => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="inq-phone-optional" className="label-field">Phone (optional)</label>
                  <input
                    id="inq-phone-optional"
                    type="tel"
                    className="input-field"
                    placeholder="+1 (555) 000-0000"
                    value={ideaForm.phone}
                    onChange={e => setIdeaForm(f => ({ ...f, phone: e.target.value }))}
                  />
                </div>

                <div>
                  <label htmlFor="inq-project-title" className="label-field">Project Title *</label>
                  <input
                    id="inq-project-title"
                    className="input-field"
                    placeholder="e.g. E-Commerce Platform Rebuild"
                    required
                    value={ideaForm.projectTitle}
                    onChange={e => setIdeaForm(f => ({ ...f, projectTitle: e.target.value }))}
                  />
                </div>

                <div>
                  <label htmlFor="inq-describe-your-idea" className="label-field flex items-center gap-2">
                    <Sparkles size={10} />
                    Describe Your Idea *
                  </label>
                  <textarea
                    id="inq-describe-your-idea"
                    className="input-field resize-none"
                    rows={6}
                    placeholder="Tell us what you want to build. Include your goals, target users, key features, and any technical requirements. The more detail the better — this helps us find the perfect match."
                    required
                    value={ideaForm.description}
                    onChange={e => setIdeaForm(f => ({ ...f, description: e.target.value }))}
                    style={{ minHeight: 150 }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="inq-budget-range" className="label-field">Budget Range *</label>
                    <div className="relative">
                      <select
                        id="inq-budget-range"
                        className="input-field appearance-none cursor-pointer"
                        required
                        value={ideaForm.budgetRange}
                        onChange={e => setIdeaForm(f => ({ ...f, budgetRange: e.target.value }))}
                        style={{ background: 'var(--input-bg)' }}
                      >
                        <option value="" style={{ background: 'var(--bg-surface)' }}>Select range</option>
                        {budgetRanges.map(r => <option key={r} value={r} style={{ background: 'var(--bg-surface)' }}>{r}</option>)}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }}>▾</div>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="inq-timeline" className="label-field">Timeline *</label>
                    <div className="relative">
                      <select
                        id="inq-timeline"
                        className="input-field appearance-none cursor-pointer"
                        required
                        value={ideaForm.timeline}
                        onChange={e => setIdeaForm(f => ({ ...f, timeline: e.target.value }))}
                        style={{ background: 'var(--input-bg)' }}
                      >
                        <option value="" style={{ background: 'var(--bg-surface)' }}>Select timeline</option>
                        {timelines.map(t => <option key={t} value={t} style={{ background: 'var(--bg-surface)' }}>{t}</option>)}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }}>▾</div>
                    </div>
                  </div>
                </div>

                {submitError && <ErrorBanner title="Not sent" message={submitError} onClose={() => setSubmitError('')} />}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-4 rounded-lg text-base"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[rgb(var(--fg-rgb)/.30)] border-t-white rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Submit Project Idea
                    </>
                  )}
                </button>

                <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                  Your information is kept confidential. We&apos;ll respond within 24 hours.
                </p>
              </form>
            )
          )}

          {/* ── Callback Form ── */}
          {activeTab === 'callback' && (
            submitted === 'callback' ? (
              <div className="glass-card rounded-2xl p-12 text-center" style={{ borderColor: 'rgb(var(--fg-rgb) / 0.3)' }}>
                <div className="w-16 h-16 rounded-full bg-[rgb(var(--fg-rgb)/0.1)] flex items-center justify-center mx-auto mb-6">
                  <Phone size={32} className="text-[var(--fg)]" />
                </div>
                <h3 className="text-primary-ui font-bold text-2xl mb-3">Callback Scheduled!</h3>
                <p className="text-base mb-6" style={{ color: 'var(--text-secondary)' }}>
                  We&apos;ve noted your preferred time. Expect a call from our team <strong className="text-primary-ui">within 2 business hours</strong>.
                </p>
                <button
                  onClick={() => { setSubmitted(null); setCallbackForm({ name: '', phone: '', email: '', preferredCallbackTime: '' }) }}
                  className="btn-ghost rounded text-sm py-2 px-6"
                >
                  Submit Another Request
                </button>
              </div>
            ) : (
              <form onSubmit={handleCallbackSubmit} className="glass-card rounded-2xl p-8 space-y-5" style={{ borderColor: 'rgb(var(--fg-rgb) / 0.2)' }}>
                <div className="text-center pb-2">
                  <div className="w-14 h-14 rounded-full bg-[rgb(var(--fg-rgb)/0.1)] flex items-center justify-center mx-auto mb-4">
                    <Phone size={28} className="text-[var(--fg)]" />
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Prefer to talk? Leave your number and we&apos;ll call you back at your preferred time.
                  </p>
                </div>

                <div>
                  <label htmlFor="inq-your-name-2" className="label-field">Your Name *</label>
                  <input
                    id="inq-your-name-2"
                    className="input-field"
                    placeholder="John Smith"
                    required
                    value={callbackForm.name}
                    onChange={e => setCallbackForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>

                <div>
                  <label htmlFor="inq-phone-number" className="label-field">Phone Number *</label>
                  <input
                    id="inq-phone-number"
                    type="tel"
                    className="input-field"
                    placeholder="+1 (555) 000-0000"
                    required
                    value={callbackForm.phone}
                    onChange={e => setCallbackForm(f => ({ ...f, phone: e.target.value }))}
                  />
                </div>

                <div>
                  <label htmlFor="inq-email-optional" className="label-field">Email (optional)</label>
                  <input
                    id="inq-email-optional"
                    type="email"
                    className="input-field"
                    placeholder="john@company.com"
                    value={callbackForm.email}
                    onChange={e => setCallbackForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>

                <div>
                  <p id="inq-callback-time" className="label-field">Preferred Callback Time *</p>
                  <div role="group" aria-labelledby="inq-callback-time" className="grid grid-cols-2 gap-3">
                    {callbackTimes.map(time => (
                      <button
                        key={time}
                        type="button"
                        aria-pressed={callbackForm.preferredCallbackTime === time}
                        onClick={() => setCallbackForm(f => ({ ...f, preferredCallbackTime: time }))}
                        className={`py-3 px-4 rounded-lg border text-sm font-medium transition-all ${
                          callbackForm.preferredCallbackTime === time
                            ? 'border-[var(--fg)] bg-[rgb(var(--fg-rgb)/0.12)] text-primary-ui'
                            : 'border-[var(--track-bg)] text-[var(--text-secondary)] hover:border-[rgb(var(--fg-rgb)/0.3)] hover:text-primary-ui'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                {submitError && <ErrorBanner title="Not sent" message={submitError} onClose={() => setSubmitError('')} />}

                <button
                  type="submit"
                  disabled={submitting || !callbackForm.preferredCallbackTime}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-4 rounded-lg text-base"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[rgb(var(--fg-rgb)/.30)] border-t-white rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Phone size={18} />
                      Request Callback
                    </>
                  )}
                </button>

                <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                  We typically call back within 2 business hours during working days.
                </p>
              </form>
            )
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="glass-card-dark border-t border-[var(--input-bg)]">
        <div className="max-w-7xl mx-auto px-4 md:px-12 py-8 flex items-center justify-between">
          <Link href="/" className="hover:opacity-75 transition-opacity"><Wordmark className="text-[var(--fg)]" /></Link>
          <div className="flex items-center gap-4" style={{ color: 'var(--text-muted)' }}>
            <a href="#" className="hover:text-primary-ui transition-colors p-1.5"><Globe size={18} /></a>
            <a href="#" className="hover:text-primary-ui transition-colors p-1.5"><X size={18} /></a>
            <a href="#" className="hover:text-primary-ui transition-colors p-1.5"><ExternalLink size={18} /></a>
          </div>
        </div>
        <div className="border-t border-[var(--input-bg)] px-4 md:px-12 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-mono-label text-xs tracking-widest" style={{ color: 'var(--text-muted)' }}>© 2026 BLACKORWHITE. ALL RIGHTS RESERVED.</p>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-mono-label text-xs tracking-widest hover:text-primary-ui transition-colors" style={{ color: 'var(--text-muted)' }}>HOME</Link>
            <Link href="/freelancers" className="text-mono-label text-xs tracking-widest hover:text-primary-ui transition-colors" style={{ color: 'var(--text-muted)' }}>FOR TEAM MEMBERS</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
