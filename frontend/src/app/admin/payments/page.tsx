'use client'

import { useEffect, useState } from 'react'
import { Pencil, X, DollarSign, ChevronDown, Plus } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { paymentsApi, projectsApi, freelancersApi } from '@/lib/api'
import { FreelancerProfile, Payment, PaymentStatus, Project } from '@/lib/types'
import { useCurrencySymbol } from '@/lib/store'
import { apiError } from '@/lib/utils'
import ErrorBanner from '@/components/ui/ErrorBanner'

const STATUS_STYLES: Record<PaymentStatus, { bg: string; border: string; color: string; label: string }> = {
  paid: { bg: 'rgb(var(--fg-rgb) / 0.1)', border: 'rgb(var(--fg-rgb) / 0.3)', color: 'var(--fg)', label: 'Paid' },
  pending: { bg: 'rgb(var(--fg-rgb) / 0.1)', border: 'rgb(var(--fg-rgb) / 0.3)', color: 'var(--fg)', label: 'Pending' },
  partial: { bg: 'rgb(var(--fg-rgb) / 0.1)', border: 'rgb(var(--fg-rgb) / 0.3)', color: 'var(--fg)', label: 'Partial' },
}

interface EditForm {
  amount: string
  deductions: string
  status: PaymentStatus
  notes: string
}

interface CreateForm {
  projectId: string
  freelancerId: string
  amount: string
  deductions: string
  notes: string
}

const EMPTY_CREATE: CreateForm = { projectId: '', freelancerId: '', amount: '', deductions: '', notes: '' }

export default function AdminPaymentsPage() {
  const curr = useCurrencySymbol()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all')
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [form, setForm] = useState<EditForm>({ amount: '', deductions: '', status: 'pending', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editError, setEditError] = useState('')
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE)
  const [createError, setCreateError] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [freelancers, setFreelancers] = useState<FreelancerProfile[]>([])
  const [optionsLoading, setOptionsLoading] = useState(false)

  const loadPayments = async () => {
    const res = await paymentsApi.getAll()
    setPayments(res.data?.data ?? res.data ?? [])
  }

  useEffect(() => {
    const load = async () => {
      try {
        await loadPayments()
      } catch (err) {
        setError(apiError(err, 'Could not load payments'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const openCreate = async () => {
    setCreateForm(EMPTY_CREATE)
    setCreateError('')
    setCreating(true)
    if (projects.length > 0 && freelancers.length > 0) return
    setOptionsLoading(true)
    try {
      const [pRes, fRes] = await Promise.all([projectsApi.getAll(), freelancersApi.getAll()])
      setProjects(pRes.data?.data ?? pRes.data ?? [])
      const fData: FreelancerProfile[] = fRes.data?.data ?? fRes.data ?? []
      setFreelancers(fData.filter(f => f.onboardingStage === 'approved'))
    } catch (err) {
      setCreateError(apiError(err, 'Could not load projects and freelancers'))
    } finally {
      setOptionsLoading(false)
    }
  }

  const handleCreate = async () => {
    const amount = parseFloat(createForm.amount)
    const deductions = parseFloat(createForm.deductions) || 0
    if (!createForm.projectId || !createForm.freelancerId) {
      setCreateError('Choose a project and a freelancer')
      return
    }
    if (!(amount > 0)) {
      setCreateError('Enter an amount greater than zero')
      return
    }
    setSaving(true)
    setCreateError('')
    try {
      await paymentsApi.create({
        projectId: createForm.projectId,
        freelancerId: createForm.freelancerId,
        amount,
        deductions,
        ...(createForm.notes.trim() ? { notes: createForm.notes.trim() } : {}),
      })
      setCreating(false)
      // The create response has no project/freelancer attached, so reload the list
      try {
        await loadPayments()
      } catch (err) {
        setError(apiError(err, 'Payment created, but the list could not be refreshed'))
      }
    } catch (err) {
      setCreateError(apiError(err, 'Could not create the payment'))
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (p: Payment) => {
    setEditError('')
    setEditingPayment(p)
    setForm({
      amount: String(p.amount),
      deductions: String(p.deductions),
      status: p.status,
      notes: p.notes ?? '',
    })
  }

  const handleSave = async () => {
    if (!editingPayment) return
    setSaving(true)
    const amount = parseFloat(form.amount) || 0
    const deductions = parseFloat(form.deductions) || 0
    const payload = { amount, deductions, status: form.status, notes: form.notes }
    setEditError('')
    try {
      const res = await paymentsApi.update(editingPayment.id, payload)
      setPayments(prev => prev.map(p => p.id === editingPayment.id ? res.data : p))
      setEditingPayment(null)
    } catch (err) {
      setEditError(apiError(err, 'Could not update the payment'))
    } finally {
      setSaving(false)
    }
  }

  const filtered = payments.filter(p => statusFilter === 'all' || p.status === statusFilter)

  const totalDisbursed = payments.filter(p => p.status === 'paid').reduce((a, p) => a + p.netAmount, 0)
  const totalPending = payments.filter(p => p.status === 'pending' || p.status === 'partial').reduce((a, p) => a + p.netAmount, 0)
  const thisMonth = payments.filter(p => {
    const d = new Date(p.createdAt)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).reduce((a, p) => a + p.netAmount, 0)

  return (
    <DashboardLayout allowedRoles={['admin']}>
      {/* Header */}
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-mono-label mb-1">FINANCIAL</p>
          <h1 className="text-display text-4xl text-primary-ui">PAYMENTS</h1>
          <p className="text-mono-label mt-1" style={{ color: 'var(--text-muted)' }}>Manage disbursements and payment status</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm rounded py-2.5 px-4">
          <Plus size={14} />
          New Payment
        </button>
      </div>

      {error && (
        <div className="mb-6">
          <ErrorBanner message={error} onClose={() => setError('')} />
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="glass-card metric-card rounded-xl flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-[var(--skeleton)] flex items-center justify-center shrink-0">
            <DollarSign size={18} style={{ color: 'var(--fg)' }} />
          </div>
          <div>
            <p className="text-mono-label mb-1">TOTAL DISBURSED</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>
              {curr}{totalDisbursed.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="glass-card metric-card rounded-xl flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-[var(--skeleton)] flex items-center justify-center shrink-0">
            <DollarSign size={18} style={{ color: 'var(--fg)' }} />
          </div>
          <div>
            <p className="text-mono-label mb-1">PENDING</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>
              {curr}{totalPending.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="glass-card metric-card rounded-xl flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-[var(--skeleton)] flex items-center justify-center shrink-0">
            <DollarSign size={18} className="text-crimson" />
          </div>
          <div>
            <p className="text-mono-label mb-1">THIS MONTH</p>
            <p className="text-2xl font-bold text-crimson">
              {curr}{thisMonth.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-5">
        {(['all', 'paid', 'pending', 'partial'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded text-xs transition-all ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
            style={statusFilter !== s ? { padding: '8px 16px' } : {}}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Payments Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse flex gap-4 py-3">
                <div className="h-4 bg-[var(--skeleton)] rounded w-28" />
                <div className="h-4 bg-[var(--skeleton)] rounded flex-1" />
                <div className="h-4 bg-[var(--skeleton)] rounded w-24" />
                <div className="h-4 bg-[var(--skeleton)] rounded w-20" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-mono-label text-lg" style={{ color: 'var(--text-muted)' }}>NO PAYMENTS FOUND</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Freelancer</th>
                  <th>Project</th>
                  <th>Amount</th>
                  <th>Deductions</th>
                  <th>Net Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const sc = STATUS_STYLES[p.status]
                  return (
                    <tr key={p.id}>
                      <td>
                        <p className="text-primary-ui text-sm font-medium">{p.freelancer?.user.name ?? `#${p.freelancerId}`}</p>
                        <p className="text-mono-label" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {p.freelancer?.user.email ?? ''}
                        </p>
                      </td>
                      <td>
                        <span className="text-sm max-w-[160px] truncate block" style={{ color: 'var(--text-secondary)' }}>
                          {p.project?.title ?? `#${p.projectId}`}
                        </span>
                      </td>
                      <td>
                        <span className="text-primary-ui font-medium">{curr}{p.amount.toLocaleString()}</span>
                      </td>
                      <td>
                        <span style={{ color: p.deductions > 0 ? 'var(--fg)' : 'rgb(var(--fg-rgb) / .55)' }}>
                          {p.deductions > 0 ? `-${curr}${p.deductions.toLocaleString()}` : '—'}
                        </span>
                      </td>
                      <td>
                        <span className="text-crimson font-bold">{curr}{p.netAmount.toLocaleString()}</span>
                      </td>
                      <td>
                        <span className="text-mono-label" style={{ fontSize: '11px' }}>
                          {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: '2-digit' })}
                        </span>
                      </td>
                      <td>
                        <span
                          className="text-mono-label px-2 py-1 rounded"
                          style={{ fontSize: '10px', background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color }}
                        >
                          {sc.label.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => openEdit(p)}
                          className="btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-3 rounded"
                        >
                          <Pencil size={12} />
                          Edit
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[rgb(var(--bg-rgb)/.92)]" onClick={() => setEditingPayment(null)} />
          <div className="glass-card rounded-xl p-8 relative z-10 w-full max-w-lg" style={{ borderColor: 'rgb(var(--fg-rgb) / 0.4)' }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-mono-label mb-0.5">EDIT PAYMENT</p>
                <h2 className="text-primary-ui font-bold text-lg">
                  {editingPayment.freelancer?.user.name}
                </h2>
                <p className="text-mono-label mt-0.5" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {editingPayment.project?.title}
                </p>
              </div>
              <button onClick={() => setEditingPayment(null)} className="p-2 rounded glass-card-dark">
                <X size={16} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Amount ({curr})</label>
                  <input
                    type="number"
                    className="input-field"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="label-field">Deductions ({curr})</label>
                  <input
                    type="number"
                    className="input-field"
                    value={form.deductions}
                    onChange={e => setForm(f => ({ ...f, deductions: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Net preview */}
              <div className="glass-card-dark rounded-lg p-4 flex items-center justify-between">
                <p className="text-mono-label">NET AMOUNT</p>
                <p className="text-crimson font-bold text-xl">
                  {curr}{((parseFloat(form.amount) || 0) - (parseFloat(form.deductions) || 0)).toLocaleString()}
                </p>
              </div>

              <div>
                <label className="label-field">Status</label>
                <div className="relative">
                  <select
                    className="input-field appearance-none pr-8"
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as PaymentStatus }))}
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="partial">Partial</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div>
                <label className="label-field">Notes</label>
                <textarea
                  className="input-field resize-none"
                  rows={3}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional payment notes..."
                />
              </div>
            </div>

            {editError && (
              <div className="mt-5">
                <ErrorBanner title="Payment not saved" message={editError} onClose={() => setEditError('')} />
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 rounded text-sm py-3">
                {saving ? 'Saving...' : 'Update Payment'}
              </button>
              <button onClick={() => setEditingPayment(null)} className="btn-ghost rounded text-sm py-3 px-6">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[rgb(var(--bg-rgb)/.92)]" onClick={() => setCreating(false)} />
          <div className="glass-card rounded-xl p-8 relative z-10 w-full max-w-lg" style={{ borderColor: 'rgb(var(--fg-rgb) / 0.4)' }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-mono-label mb-0.5">NEW PAYMENT</p>
                <h2 className="text-primary-ui font-bold text-lg">Record a payment</h2>
                <p className="text-mono-label mt-0.5" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  New payments start as Pending; edit one to mark it paid
                </p>
              </div>
              <button onClick={() => setCreating(false)} className="p-2 rounded glass-card-dark">
                <X size={16} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="label-field">Project</label>
                <div className="relative">
                  <select
                    className="input-field appearance-none pr-8"
                    value={createForm.projectId}
                    disabled={optionsLoading}
                    onChange={e => setCreateForm(f => ({ ...f, projectId: e.target.value }))}
                  >
                    <option value="">{optionsLoading ? 'Loading…' : 'Select a project'}</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div>
                <label className="label-field">Freelancer</label>
                <div className="relative">
                  <select
                    className="input-field appearance-none pr-8"
                    value={createForm.freelancerId}
                    disabled={optionsLoading}
                    onChange={e => setCreateForm(f => ({ ...f, freelancerId: e.target.value }))}
                  >
                    <option value="">{optionsLoading ? 'Loading…' : 'Select a freelancer'}</option>
                    {freelancers.map(f => <option key={f.id} value={f.id}>{f.user.name}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Amount ({curr})</label>
                  <input
                    type="number"
                    className="input-field"
                    value={createForm.amount}
                    onChange={e => setCreateForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="label-field">Deductions ({curr})</label>
                  <input
                    type="number"
                    className="input-field"
                    value={createForm.deductions}
                    onChange={e => setCreateForm(f => ({ ...f, deductions: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Net preview */}
              <div className="glass-card-dark rounded-lg p-4 flex items-center justify-between">
                <p className="text-mono-label">NET AMOUNT</p>
                <p className="text-crimson font-bold text-xl">
                  {curr}{((parseFloat(createForm.amount) || 0) - (parseFloat(createForm.deductions) || 0)).toLocaleString()}
                </p>
              </div>

              <div>
                <label className="label-field">Notes</label>
                <textarea
                  className="input-field resize-none"
                  rows={3}
                  value={createForm.notes}
                  onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional payment notes..."
                />
              </div>
            </div>

            {createError && (
              <div className="mt-5">
                <ErrorBanner title="Payment not created" message={createError} onClose={() => setCreateError('')} />
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button onClick={handleCreate} disabled={saving || optionsLoading} className="btn-primary flex-1 rounded text-sm py-3">
                {saving ? 'Saving...' : 'Create Payment'}
              </button>
              <button onClick={() => setCreating(false)} className="btn-ghost rounded text-sm py-3 px-6">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
