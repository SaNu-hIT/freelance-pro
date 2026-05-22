'use client'

import { useState } from 'react'
import {
  User, Lock, Bell, Globe, Shield, Palette,
  Save, CheckCircle2, ChevronRight, Mail, Phone,
  Building2, AlertTriangle,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useAuthStore, useSettingsStore, type SettingsState } from '@/lib/store'

type SettingsStoreField<K extends keyof SettingsState> = SettingsState[K]

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'platform', label: 'Platform', icon: Globe },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
]

export default function AdminSettingsPage() {
  const { user } = useAuthStore()
  // Read platform settings directly from the persisted store — no local copy
  // so the values survive reloads without any useState hydration race.
  const {
    currency, timezone,
    maintenanceMode, newRegistrations, requireApproval,
    setPlatformSettings,
  } = useSettingsStore()

  const [active, setActive] = useState('profile')
  const [saved, setSaved] = useState(false)

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('FreelancePro Inc.')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [notifs, setNotifs] = useState({
    newProject: true,
    newFreelancer: true,
    worklogSubmit: true,
    paymentAlert: true,
    weeklyReport: false,
    systemAlerts: true,
  })

  // Write directly to the store on every change — no intermediate local state.
  // The SaveBar is just UI feedback; the store (and localStorage) is always up-to-date.
  function setPlatformField<K extends 'currency' | 'timezone' | 'maintenanceMode' | 'newRegistrations' | 'requireApproval'>(
    key: K,
    value: SettingsStoreField<K>,
  ) {
    setPlatformSettings({ [key]: value })
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <DashboardLayout allowedRoles={['admin']}>
      <div className="flex gap-6 h-full">

        {/* Sidebar nav */}
        <div className="w-52 shrink-0">
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--input-bg)]">
              <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>SETTINGS</p>
            </div>
            <nav className="p-2 space-y-0.5">
              {SECTIONS.map(s => {
                const Icon = s.icon
                const isActive = active === s.id
                const isDanger = s.id === 'danger'
                return (
                  <button
                    key={s.id}
                    onClick={() => setActive(s.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all"
                    style={{
                      background: isActive ? (isDanger ? 'rgba(220,20,60,0.1)' : 'rgba(220,20,60,0.1)') : 'transparent',
                      color: isActive ? (isDanger ? '#f87171' : '#DC143C') : isDanger ? 'rgba(248,113,113,0.6)' : 'var(--text-secondary)',
                      border: isActive ? `1px solid ${isDanger ? 'rgba(248,113,113,0.25)' : 'rgba(220,20,60,0.25)'}` : '1px solid transparent',
                    }}
                  >
                    <Icon size={14} />
                    <span className="flex-1 text-left">{s.label}</span>
                    {isActive && <ChevronRight size={12} />}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-5">

          {/* ── Profile ── */}
          {active === 'profile' && (
            <>
              <div className="glass-card rounded-xl p-6">
                <h2 className="text-primary-ui font-bold text-base mb-5 flex items-center gap-2">
                  <User size={16} style={{ color: '#DC143C' }} /> Profile Information
                </h2>
                <div className="flex items-center gap-5 mb-6 pb-6 border-b border-[var(--input-bg)]">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-primary-ui shrink-0"
                    style={{ background: 'rgba(220,20,60,0.2)', border: '2px solid rgba(220,20,60,0.4)' }}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-primary-ui font-semibold">{name}</p>
                    <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>Administrator</p>
                    <button className="text-xs px-3 py-1.5 rounded-lg transition-all"
                      style={{ background: 'rgba(220,20,60,0.1)', border: '1px solid rgba(220,20,60,0.25)', color: '#DC143C' }}>
                      Change Avatar
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-field flex items-center gap-1.5"><User size={10} /> Full Name</label>
                    <input className="input-field" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div>
                    <label className="label-field flex items-center gap-1.5"><Mail size={10} /> Email Address</label>
                    <input type="email" className="input-field" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <label className="label-field flex items-center gap-1.5"><Phone size={10} /> Phone</label>
                    <input type="tel" className="input-field" placeholder="+1 (555) 000-0000" value={phone} onChange={e => setPhone(e.target.value)} />
                  </div>
                  <div>
                    <label className="label-field flex items-center gap-1.5"><Building2 size={10} /> Organisation</label>
                    <input className="input-field" value={company} onChange={e => setCompany(e.target.value)} />
                  </div>
                </div>
              </div>
              <SaveBar saved={saved} onSave={handleSave} />
            </>
          )}

          {/* ── Security ── */}
          {active === 'security' && (
            <>
              <div className="glass-card rounded-xl p-6">
                <h2 className="text-primary-ui font-bold text-base mb-5 flex items-center gap-2">
                  <Lock size={16} style={{ color: '#DC143C' }} /> Change Password
                </h2>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="label-field">Current Password</label>
                    <input type="password" className="input-field" placeholder="••••••••" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                  </div>
                  <div>
                    <label className="label-field">New Password</label>
                    <input type="password" className="input-field" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                  </div>
                  <div>
                    <label className="label-field">Confirm New Password</label>
                    <input type="password" className="input-field" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="glass-card rounded-xl p-6">
                <h2 className="text-primary-ui font-bold text-base mb-1 flex items-center gap-2">
                  <Shield size={16} style={{ color: '#DC143C' }} /> Two-Factor Authentication
                </h2>
                <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Add an extra layer of security to your account.</p>
                <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--row-hover-bg)', border: '1px solid var(--border)' }}>
                  <div>
                    <p className="text-sm font-medium text-primary-ui">Authenticator App</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Use Google Authenticator or similar</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(156,163,175,0.12)', border: '1px solid rgba(156,163,175,0.25)', color: '#9ca3af' }}>Not enabled</span>
                </div>
              </div>
              <SaveBar saved={saved} onSave={handleSave} />
            </>
          )}

          {/* ── Notifications ── */}
          {active === 'notifications' && (
            <>
              <div className="glass-card rounded-xl p-6">
                <h2 className="text-primary-ui font-bold text-base mb-5 flex items-center gap-2">
                  <Bell size={16} style={{ color: '#DC143C' }} /> Notification Preferences
                </h2>
                <div className="space-y-3">
                  {(Object.entries(notifs) as [keyof typeof notifs, boolean][]).map(([key, val]) => {
                    const labels: Record<keyof typeof notifs, { title: string; desc: string }> = {
                      newProject: { title: 'New project created', desc: 'When a client creates a new project' },
                      newFreelancer: { title: 'New freelancer registration', desc: 'When a freelancer registers and needs approval' },
                      worklogSubmit: { title: 'Worklog submitted', desc: 'When a freelancer submits a worklog' },
                      paymentAlert: { title: 'Payment activity', desc: 'When payments are made or pending' },
                      weeklyReport: { title: 'Weekly summary report', desc: 'Digest of platform activity every Monday' },
                      systemAlerts: { title: 'System alerts', desc: 'Critical system notifications and errors' },
                    }
                    const info = labels[key]
                    return (
                      <div key={key} className="flex items-center justify-between p-4 rounded-xl"
                        style={{ background: 'var(--row-hover-bg)', border: '1px solid var(--border)' }}>
                        <div>
                          <p className="text-sm font-medium text-primary-ui">{info.title}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{info.desc}</p>
                        </div>
                        <button
                          onClick={() => setNotifs(prev => ({ ...prev, [key]: !prev[key] }))}
                          className="relative w-10 h-5 rounded-full transition-all shrink-0"
                          style={{ background: val ? '#DC143C' : 'var(--track-bg)' }}>
                          <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                            style={{ left: val ? '22px' : '2px' }} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
              <SaveBar saved={saved} onSave={handleSave} />
            </>
          )}

          {/* ── Platform ── */}
          {active === 'platform' && (
            <>
              <div className="glass-card rounded-xl p-6">
                <h2 className="text-primary-ui font-bold text-base mb-5 flex items-center gap-2">
                  <Globe size={16} style={{ color: '#DC143C' }} /> Platform Settings
                </h2>
                <div className="space-y-4">
                  {([
                    { key: 'newRegistrations' as const, title: 'Allow new registrations', desc: 'Let new freelancers and clients sign up' },
                    { key: 'requireApproval' as const, title: 'Require freelancer approval', desc: 'New freelancers must be approved before accessing projects' },
                    { key: 'maintenanceMode' as const, title: 'Maintenance mode', desc: 'Take the platform offline for maintenance' },
                  ]).map(({ key, title, desc }) => {
                    const val = { newRegistrations, requireApproval, maintenanceMode }[key]
                    const isDanger = key === 'maintenanceMode'
                    return (
                      <div key={key} className="flex items-center justify-between p-4 rounded-xl"
                        style={{ background: isDanger ? 'rgba(220,20,60,0.04)' : 'var(--row-hover-bg)', border: `1px solid ${isDanger ? 'rgba(220,20,60,0.15)' : 'var(--input-bg)'}` }}>
                        <div>
                          <p className="text-sm font-medium" style={{ color: isDanger ? '#f87171' : '#fff' }}>{title}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                        </div>
                        <button
                          onClick={() => setPlatformField(key, !val)}
                          className="relative w-10 h-5 rounded-full transition-all shrink-0"
                          style={{ background: val ? '#DC143C' : 'var(--track-bg)' }}>
                          <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                            style={{ left: val ? '22px' : '2px' }} />
                        </button>
                      </div>
                    )
                  })}

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="label-field">Default Timezone</label>
                      <select className="input-field appearance-none" value={timezone}
                        onChange={e => setPlatformField('timezone', e.target.value)}>
                        {['UTC', 'UTC+5:30', 'UTC-5', 'UTC+1', 'UTC+8'].map(tz => (
                          <option key={tz} value={tz} style={{ background: 'var(--bg-surface)' }}>{tz}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label-field">Default Currency</label>
                      <select className="input-field appearance-none" value={currency}
                        onChange={e => setPlatformField('currency', e.target.value)}>
                        {['USD', 'EUR', 'GBP', 'INR', 'AUD'].map(c => (
                          <option key={c} value={c} style={{ background: 'var(--bg-surface)' }}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <SaveBar saved={saved} onSave={handleSave} />
            </>
          )}

          {/* ── Danger Zone ── */}
          {active === 'danger' && (
            <div className="glass-card rounded-xl p-6" style={{ borderColor: 'rgba(220,20,60,0.25)' }}>
              <h2 className="text-base font-bold mb-1 flex items-center gap-2" style={{ color: '#f87171' }}>
                <AlertTriangle size={16} /> Danger Zone
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                These actions are irreversible. Proceed with caution.
              </p>
              <div className="space-y-3">
                {[
                  { title: 'Clear all worklogs', desc: 'Permanently delete all worklog records from the platform', btn: 'Clear Worklogs' },
                  { title: 'Reset platform data', desc: 'Wipe all projects, freelancers, and payments. Cannot be undone.', btn: 'Reset Data' },
                  { title: 'Delete admin account', desc: 'Permanently remove your admin account from the system', btn: 'Delete Account' },
                ].map(({ title, desc, btn }) => (
                  <div key={title} className="flex items-center justify-between p-4 rounded-xl"
                    style={{ background: 'rgba(220,20,60,0.04)', border: '1px solid rgba(220,20,60,0.15)' }}>
                    <div>
                      <p className="text-sm font-medium text-primary-ui">{title}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                    </div>
                    <button className="text-xs px-3 py-2 rounded-lg shrink-0 ml-4 transition-all"
                      style={{ background: 'rgba(220,20,60,0.1)', border: '1px solid rgba(220,20,60,0.3)', color: '#f87171' }}
                      onClick={() => alert('This action is disabled in demo mode.')}>
                      {btn}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  )
}

function SaveBar({ saved, onSave }: { saved: boolean; onSave: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 rounded-xl"
      style={{ background: 'var(--row-hover-bg)', border: '1px solid var(--border)' }}>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {saved ? 'Changes saved.' : 'You have unsaved changes.'}
      </p>
      <button
        onClick={onSave}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
        style={{ background: saved ? 'rgba(74,222,128,0.15)' : '#DC143C', color: saved ? '#4ade80' : '#fff', border: saved ? '1px solid rgba(74,222,128,0.35)' : 'none' }}>
        {saved ? <><CheckCircle2 size={14} /> Saved</> : <><Save size={14} /> Save Changes</>}
      </button>
    </div>
  )
}
