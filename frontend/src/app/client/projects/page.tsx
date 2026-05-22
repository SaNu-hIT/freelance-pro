'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { projectsApi } from '@/lib/api'
import { Project } from '@/lib/types'
import { CheckCircle, X, Upload, AlertTriangle } from 'lucide-react'
import { useCurrencySymbol } from '@/lib/store'

const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    title: 'E-Commerce Platform Redesign',
    description: 'Full redesign of the client shopping experience including product listings and checkout flow.',
    budget: 4500,
    deadline: new Date(Date.now() + 3 * 86400000).toISOString(),
    status: 'in_progress',
    priority: 'high',
    clientId: 'c1',
    assignedFreelancer: { id: 'f1', userId: 'u1', user: { id: 'u1', name: 'Alex Johnson', email: 'alex@example.com', role: 'freelancer', createdAt: '' }, skills: ['React', 'TypeScript'], experience: 3, hourlyRate: 75, status: 'active' },
    progress: 65,
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Mobile App Backend API',
    description: 'REST API development for the iOS/Android app including authentication and data sync.',
    budget: 3200,
    deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
    status: 'pending_approval',
    priority: 'medium',
    clientId: 'c1',
    assignedFreelancer: { id: 'f2', userId: 'u2', user: { id: 'u2', name: 'Sam Rivera', email: 'sam@example.com', role: 'freelancer', createdAt: '' }, skills: ['Node.js', 'PostgreSQL'], experience: 5, hourlyRate: 90, status: 'active' },
    progress: 100,
    createdAt: new Date(Date.now() - 35 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Dashboard Analytics Module',
    description: 'Analytics dashboard with charts, data export, and KPI tracking.',
    budget: 2100,
    deadline: new Date(Date.now() - 10 * 86400000).toISOString(),
    status: 'completed',
    priority: 'high',
    clientId: 'c1',
    progress: 100,
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const INIT_FORM = {
  title: '',
  description: '',
  budget: '',
  deadline: '',
  requirements: '',
}

function fmtDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

function isOverdue(iso: string) {
  return iso && new Date(iso) < new Date()
}

export default function ClientProjectsPage() {
  const curr = useCurrencySymbol()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState(INIT_FORM)
  const [errors, setErrors] = useState<Partial<typeof INIT_FORM>>({})
  const [dragging, setDragging] = useState(false)
  const [modal, setModal] = useState<Project | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await projectsApi.getAll()
        setProjects(res.data?.data ?? res.data ?? MOCK_PROJECTS)
      } catch {
        setProjects(MOCK_PROJECTS)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function validate() {
    const e: Partial<typeof INIT_FORM> = {}
    if (!form.title.trim()) e.title = 'Title is required'
    if (!form.description.trim()) e.description = 'Description is required'
    if (!form.budget || parseFloat(form.budget) <= 0) e.budget = 'Budget is required'
    if (!form.deadline) e.deadline = 'Deadline is required'
    if (!form.requirements.trim()) e.requirements = 'Requirements are required'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setSubmitting(true)
    try {
      const payload = { ...form, budget: parseFloat(form.budget) }
      const res = await projectsApi.create(payload as unknown as Record<string, unknown>)
      const newProj = res.data?.data ?? res.data
      setProjects(prev => [newProj, ...prev])
    } catch {
      // add mock entry
      const mockNew: Project = {
        id: `proj-${Date.now()}`,
        title: form.title,
        description: form.description,
        budget: parseFloat(form.budget),
        deadline: form.deadline,
        status: 'new',
        priority: 'medium',
        clientId: 'c1',
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setProjects(prev => [mockNew, ...prev])
    } finally {
      setSubmitting(false)
      setSuccess(true)
      setForm(INIT_FORM)
      setTimeout(() => setSuccess(false), 3500)
    }
  }

  return (
    <DashboardLayout allowedRoles={['client']}>
      <div className="space-y-6">
        {/* Submit New Project */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-display text-xl text-gradient mb-5">SUBMIT NEW PROJECT</h2>

          {success && (
            <div className="flex items-center gap-2 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] rounded p-3 mb-4">
              <CheckCircle size={16} className="text-green-400" />
              <span className="text-green-400 text-sm font-semibold">Project submitted successfully!</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            {/* Title */}
            <div className="col-span-2 md:col-span-1">
              <label className="label-field">Project Title</label>
              <input
                className="input-field"
                placeholder="e.g. E-Commerce Platform"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
              {errors.title && <p className="text-[#DC143C] text-[11px] mt-1">{errors.title}</p>}
            </div>

            {/* Budget */}
            <div>
              <label className="label-field">Budget ({curr})</label>
              <input
                type="number"
                min={0}
                step={100}
                className="input-field"
                placeholder="e.g. 5000"
                value={form.budget}
                onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
              />
              {errors.budget && <p className="text-[#DC143C] text-[11px] mt-1">{errors.budget}</p>}
            </div>

            {/* Description */}
            <div className="col-span-2">
              <label className="label-field">Description</label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Describe your project..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
              {errors.description && <p className="text-[#DC143C] text-[11px] mt-1">{errors.description}</p>}
            </div>

            {/* Deadline */}
            <div>
              <label className="label-field">Timeline / Deadline</label>
              <input
                type="date"
                className="input-field"
                value={form.deadline}
                onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              />
              {errors.deadline && <p className="text-[#DC143C] text-[11px] mt-1">{errors.deadline}</p>}
            </div>

            {/* Requirements */}
            <div className="col-span-2">
              <label className="label-field">Requirements</label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Technical requirements, deliverables, preferences..."
                value={form.requirements}
                onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))}
              />
              {errors.requirements && <p className="text-[#DC143C] text-[11px] mt-1">{errors.requirements}</p>}
            </div>

            {/* File Upload */}
            <div className="col-span-2">
              <label className="label-field">Attachments <span className="text-[#3d0000]">optional</span></label>
              <div
                className={`border-2 border-dashed rounded-lg p-5 text-center transition-all cursor-pointer ${
                  dragging ? 'border-[#DC143C] bg-[rgba(220,20,60,0.08)]' : 'border-[rgba(220,20,60,0.2)] hover:border-[rgba(220,20,60,0.4)]'
                }`}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false) }}
              >
                <Upload size={22} className="mx-auto mb-2 text-[var(--text-muted)]" />
                <p className="text-mono-label text-[10px]">DRAG & DROP FILES</p>
                <p className="text-[#3d0000] text-[11px] mt-1">PDFs, images, design files</p>
              </div>
            </div>

            <div className="col-span-2">
              <button type="submit" disabled={submitting} className="btn-primary rounded disabled:opacity-50">
                {submitting ? 'SUBMITTING...' : 'SUBMIT PROJECT'}
              </button>
            </div>
          </form>
        </div>

        {/* Projects Table */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-mono-label text-xs tracking-widest">MY PROJECTS</h2>
            <span className="text-mono-label text-[10px]">{projects.length} TOTAL</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 bg-[var(--input-bg)] rounded animate-pulse" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <p className="text-mono-label text-center py-10">NO PROJECTS YET</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Submitted</th>
                  <th>Deadline</th>
                  <th>Budget</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(p => (
                  <tr key={p.id}>
                    <td className="text-primary-ui font-semibold max-w-[180px] truncate">{p.title}</td>
                    <td className="text-mono-label text-[11px]">{fmtDate(p.createdAt)}</td>
                    <td className={`text-mono-label text-[11px] ${isOverdue(p.deadline) ? 'text-[#DC143C]' : ''}`}>
                      {isOverdue(p.deadline) && <AlertTriangle size={10} className="inline mr-1" />}
                      {fmtDate(p.deadline)}
                    </td>
                    <td className="text-primary-ui">{curr}{p.budget.toLocaleString()}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="progress-bar w-16">
                          <div className="progress-fill" style={{ width: `${p.progress}%` }} />
                        </div>
                        <span className="text-mono-label text-[10px]">{p.progress}%</span>
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => setModal(p)}
                        className="btn-ghost text-[10px] py-1.5 px-3 rounded"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(3,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={() => setModal(null)}
        >
          <div
            className="glass-card rounded-xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-display text-xl text-primary-ui">{modal.title}</h2>
                <p className="text-mono-label text-[10px] mt-1">PROJECT DETAILS</p>
              </div>
              <button onClick={() => setModal(null)} className="text-[var(--text-muted)] hover:text-primary-ui transition-colors">
                <X size={20} />
              </button>
            </div>

            <p className="text-[var(--track-bg)] text-sm">{modal.description}</p>

            {modal.assignedFreelancer && (
              <div className="glass-card-dark rounded-lg p-3">
                <p className="text-mono-label text-[10px] mb-1">ASSIGNED FREELANCER</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#8B0000] flex items-center justify-center text-primary-ui text-xs font-bold uppercase">
                    {modal.assignedFreelancer.user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-primary-ui text-sm font-semibold">{modal.assignedFreelancer.user.name}</p>
                    <p className="text-[var(--text-muted)] text-xs">{modal.assignedFreelancer.user.email}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-[#DC143C] text-sm font-bold">{curr}{modal.assignedFreelancer.hourlyRate}/hr</p>
                    <p className="text-mono-label text-[10px]">{modal.assignedFreelancer.experience} yrs exp</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {modal.assignedFreelancer.skills.map(s => (
                    <span key={s} className="px-2 py-0.5 rounded text-[11px]" style={{ background: 'rgba(220,20,60,0.1)', border: '1px solid rgba(220,20,60,0.3)', color: '#DC143C' }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card-dark rounded p-3">
                <p className="text-mono-label text-[10px] mb-1">STATUS</p>
                <StatusBadge status={modal.status} />
              </div>
              <div className="glass-card-dark rounded p-3">
                <p className="text-mono-label text-[10px] mb-1">PRIORITY</p>
                <p className="text-primary-ui text-sm font-semibold uppercase">{modal.priority}</p>
              </div>
              <div className="glass-card-dark rounded p-3">
                <p className="text-mono-label text-[10px] mb-1">BUDGET</p>
                <p className="text-primary-ui font-semibold">{curr}{modal.budget.toLocaleString()}</p>
              </div>
              <div className="glass-card-dark rounded p-3">
                <p className="text-mono-label text-[10px] mb-1">DEADLINE</p>
                <p className={`text-sm font-semibold ${isOverdue(modal.deadline) ? 'text-[#DC143C]' : 'text-primary-ui'}`}>
                  {fmtDate(modal.deadline)}
                </p>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-mono-label text-[10px]">OVERALL PROGRESS</span>
                <span className="text-mono-label text-[10px] text-[#DC143C]">{modal.progress}%</span>
              </div>
              <div className="progress-bar h-2">
                <div className="progress-fill" style={{ width: `${modal.progress}%` }} />
              </div>
            </div>

            {/* Worklogs Summary */}
            <div className="glass-card-dark rounded-lg p-3">
              <p className="text-mono-label text-[10px] mb-2">WORKLOGS SUMMARY</p>
              <p className="text-[var(--track-bg)] text-sm">Total logs submitted for this project appear here.</p>
            </div>

            <button onClick={() => setModal(null)} className="btn-ghost w-full text-xs py-2.5 rounded">CLOSE</button>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
