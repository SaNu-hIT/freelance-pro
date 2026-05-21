'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useAuthStore, useCurrencySymbol } from '@/lib/store'
import { CheckCircle, X } from 'lucide-react'

const INITIAL_PROFILE = {
  bio: 'Full-stack developer with a passion for building scalable, user-friendly applications. Specializing in React, Node.js, and cloud architecture.',
  skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'AWS', 'Docker', 'GraphQL'],
  experience: 5,
  hourlyRate: 85,
  skillInput: '',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default function FreelancerProfilePage() {
  const { user } = useAuthStore()
  const curr = useCurrencySymbol()
  const [profile, setProfile] = useState(INITIAL_PROFILE)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  function addSkill(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && profile.skillInput.trim()) {
      e.preventDefault()
      const skill = profile.skillInput.trim().replace(/,$/, '')
      if (!profile.skills.includes(skill)) {
        setProfile(p => ({ ...p, skills: [...p.skills, skill], skillInput: '' }))
      } else {
        setProfile(p => ({ ...p, skillInput: '' }))
      }
    }
  }

  function removeSkill(skill: string) {
    setProfile(p => ({ ...p, skills: p.skills.filter(s => s !== skill) }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <DashboardLayout allowedRoles={['freelancer']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-display text-3xl text-gradient">MY PROFILE</h1>
          <p className="text-mono-label text-[11px] mt-1">MANAGE YOUR PROFESSIONAL PROFILE</p>
        </div>

        <div className="grid grid-cols-2 gap-6 items-start">
          {/* Left: Profile Card */}
          <div className="glass-card rounded-xl p-6 flex flex-col items-center gap-4">
            {/* Avatar */}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-black text-display relative"
              style={{ background: 'linear-gradient(135deg, #8B0000, #DC143C)' }}
            >
              {initials}
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-[#0a0a0c]" />
            </div>

            <div className="text-center">
              <h2 className="text-white font-bold text-xl">{user?.name ?? '—'}</h2>
              <p className="text-[rgba(240,240,242,0.4)] text-sm mt-0.5">{user?.email ?? '—'}</p>
            </div>

            {/* Role badge */}
            <span className="status-badge status-progress text-[11px]">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
              FREELANCER
            </span>

            {/* Info grid */}
            <div className="w-full space-y-3 mt-2">
              <div className="glass-card-dark rounded-lg p-3 flex justify-between items-center">
                <span className="text-mono-label text-[10px]">MEMBER SINCE</span>
                <span className="text-white text-sm">{user?.createdAt ? fmtDate(user.createdAt) : 'May 2024'}</span>
              </div>
              <div className="glass-card-dark rounded-lg p-3 flex justify-between items-center">
                <span className="text-mono-label text-[10px]">EXPERIENCE</span>
                <span className="text-[#DC143C] font-bold">{profile.experience} years</span>
              </div>
              <div className="glass-card-dark rounded-lg p-3 flex justify-between items-center">
                <span className="text-mono-label text-[10px]">HOURLY RATE</span>
                <span className="text-[#DC143C] font-bold">{curr}{profile.hourlyRate}/hr</span>
              </div>
              <div className="glass-card-dark rounded-lg p-3 flex justify-between items-center">
                <span className="text-mono-label text-[10px]">STATUS</span>
                <span className="status-badge status-completed text-[10px]">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
                  Active
                </span>
              </div>
            </div>

            {/* Skills display */}
            <div className="w-full">
              <p className="text-mono-label text-[10px] mb-2">SKILLS</p>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map(skill => (
                  <span
                    key={skill}
                    className="px-2.5 py-1 rounded text-xs font-semibold"
                    style={{ background: 'rgba(220,20,60,0.1)', border: '1px solid rgba(220,20,60,0.3)', color: '#DC143C' }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Edit Form */}
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-mono-label text-xs tracking-widest mb-5">EDIT PROFILE</h2>

            {saved && (
              <div className="flex items-center gap-2 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] rounded p-3 mb-4">
                <CheckCircle size={16} className="text-green-400" />
                <span className="text-green-400 text-sm font-semibold">Profile saved successfully!</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-5">
              {/* Bio */}
              <div>
                <label className="label-field">Bio</label>
                <textarea
                  className="input-field"
                  rows={4}
                  placeholder="Tell clients about yourself..."
                  value={profile.bio}
                  onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                />
              </div>

              {/* Skills */}
              <div>
                <label className="label-field">Skills (press Enter or comma to add)</label>
                <input
                  className="input-field mb-2"
                  placeholder="e.g. React, TypeScript, Node.js"
                  value={profile.skillInput}
                  onChange={e => setProfile(p => ({ ...p, skillInput: e.target.value }))}
                  onKeyDown={addSkill}
                />
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map(skill => (
                    <span
                      key={skill}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold"
                      style={{ background: 'rgba(220,20,60,0.1)', border: '1px solid rgba(220,20,60,0.3)', color: '#DC143C' }}
                    >
                      {skill}
                      <button type="button" onClick={() => removeSkill(skill)} className="hover:text-white transition-colors">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Experience */}
                <div>
                  <label className="label-field">Experience (years)</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    className="input-field"
                    value={profile.experience}
                    onChange={e => setProfile(p => ({ ...p, experience: parseInt(e.target.value) }))}
                  />
                </div>

                {/* Hourly Rate */}
                <div>
                  <label className="label-field">Hourly Rate ($)</label>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    className="input-field"
                    value={profile.hourlyRate}
                    onChange={e => setProfile(p => ({ ...p, hourlyRate: parseFloat(e.target.value) }))}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full rounded disabled:opacity-50"
              >
                {saving ? 'SAVING...' : 'SAVE PROFILE'}
              </button>
            </form>
          </div>
        </div>

        {/* About Me */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-mono-label text-xs tracking-widest mb-3">ABOUT ME</h2>
          <p className="text-[rgba(255,255,255,0.75)] leading-relaxed text-sm">
            {profile.bio || <span className="text-[rgba(240,240,242,0.4)] italic">No bio set yet. Edit your profile to add one.</span>}
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
