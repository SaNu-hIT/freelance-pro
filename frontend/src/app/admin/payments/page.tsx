'use client'

import { useEffect, useState } from 'react'
import { Pencil, X, DollarSign, ChevronDown } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { paymentsApi } from '@/lib/api'
import { Payment, PaymentStatus } from '@/lib/types'
import { useCurrencySymbol } from '@/lib/store'

const MOCK_PAYMENTS: Payment[] = [
  { id: 'p1', projectId: '1', freelancerId: 'f1', amount: 4800, deductions: 240, netAmount: 4560, status: 'paid', notes: 'Sprint 1 completion milestone', createdAt: '2025-05-10T00:00:00Z', freelancer: { id: 'f1', userId: 'u1', skills: [], experience: 4, hourlyRate: 75, status: 'active', user: { id: 'u1', name: 'Alex Rivera', email: 'alex@dev.com', role: 'freelancer', createdAt: '' } }, project: { id: '1', title: 'E-Commerce Platform Rebuild', description: '', budget: 12000, deadline: '2025-06-15', status: 'in_progress', priority: 'high', clientId: 'c1', progress: 68, createdAt: '', updatedAt: '' } },
  { id: 'p2', projectId: '2', freelancerId: 'f2', amount: 2880, deductions: 0, netAmount: 2880, status: 'pending', notes: '', createdAt: '2025-05-12T00:00:00Z', freelancer: { id: 'f2', userId: 'u2', skills: [], experience: 6, hourlyRate: 90, status: 'active', user: { id: 'u2', name: 'Sam Chen', email: 'sam@ux.com', role: 'freelancer', createdAt: '' } }, project: { id: '2', title: 'Mobile App UI Redesign', description: '', budget: 8500, deadline: '2025-05-30', status: 'delayed', priority: 'critical', clientId: 'c2', progress: 34, createdAt: '', updatedAt: '' } },
  { id: 'p3', projectId: '3', freelancerId: 'f3', amount: 4950, deductions: 495, netAmount: 4455, status: 'partial', notes: 'Partial payment — final 10% on delivery', createdAt: '2025-05-14T00:00:00Z', freelancer: { id: 'f3', userId: 'u3', skills: [], experience: 5, hourlyRate: 80, status: 'active', user: { id: 'u3', name: 'Jordan Lee', email: 'jordan@api.com', role: 'freelancer', createdAt: '' } }, project: { id: '3', title: 'API Integration Suite', description: '', budget: 5500, deadline: '2025-07-01', status: 'pending_approval', priority: 'medium', clientId: 'c3', progress: 90, createdAt: '', updatedAt: '' } },
  { id: 'p4', projectId: '4', freelancerId: 'f1', amount: 1080, deductions: 0, netAmount: 1080, status: 'pending', notes: 'Initial kickoff payment', createdAt: '2025-05-15T00:00:00Z', freelancer: { id: 'f1', userId: 'u1', skills: [], experience: 4, hourlyRate: 75, status: 'active', user: { id: 'u1', name: 'Alex Rivera', email: 'alex@dev.com', role: 'freelancer', createdAt: '' } }, project: { id: '4', title: 'Analytics Dashboard', description: '', budget: 7200, deadline: '2025-08-10', status: 'assigned', priority: 'medium', clientId: 'c4', progress: 15, createdAt: '', updatedAt: '' } },
]

const STATUS_STYLES: Record<PaymentStatus, { bg: string; border: string; color: string; label: string }> = {
  paid: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', color: '#4ade80', label: 'Paid' },
  pending: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', color: '#fbbf24', label: 'Pending' },
  partial: { bg: 'rgba(220,20,60,0.1)', border: 'rgba(220,20,60,0.3)', color: '#DC143C', label: 'Partial' },
}

interface EditForm {
  amount: string
  deductions: string
  status: PaymentStatus
  notes: string
}

export default function AdminPaymentsPage() {
  const curr = useCurrencySymbol()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all')
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [form, setForm] = useState<EditForm>({ amount: '', deductions: '', status: 'pending', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await paymentsApi.getAll()
        setPayments(res.data?.data ?? res.data)
      } catch {
        setPayments(MOCK_PAYMENTS)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const openEdit = (p: Payment) => {
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
    const netAmount = amount - deductions
    const payload = { amount, deductions, netAmount, status: form.status, notes: form.notes }
    try {
      const res = await paymentsApi.update(editingPayment.id, payload)
      setPayments(prev => prev.map(p => p.id === editingPayment.id ? res.data : p))
    } catch {
      setPayments(prev => prev.map(p =>
        p.id === editingPayment.id ? { ...p, ...payload } : p
      ))
    } finally {
      setSaving(false)
      setEditingPayment(null)
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
      <div className="mb-8">
        <p className="text-mono-label mb-1">FINANCIAL</p>
        <h1 className="text-display text-4xl text-primary-ui">PAYMENTS</h1>
        <p className="text-mono-label mt-1" style={{ color: 'var(--text-muted)' }}>Manage disbursements and payment status</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="glass-card metric-card rounded-xl flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#3D0000] flex items-center justify-center shrink-0">
            <DollarSign size={18} style={{ color: '#4ade80' }} />
          </div>
          <div>
            <p className="text-mono-label mb-1">TOTAL DISBURSED</p>
            <p className="text-2xl font-bold" style={{ color: '#4ade80' }}>
              {curr}{totalDisbursed.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="glass-card metric-card rounded-xl flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#3D0000] flex items-center justify-center shrink-0">
            <DollarSign size={18} style={{ color: '#fbbf24' }} />
          </div>
          <div>
            <p className="text-mono-label mb-1">PENDING</p>
            <p className="text-2xl font-bold" style={{ color: '#fbbf24' }}>
              {curr}{totalPending.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="glass-card metric-card rounded-xl flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#3D0000] flex items-center justify-center shrink-0">
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
                <div className="h-4 bg-[#3D0000] rounded w-28" />
                <div className="h-4 bg-[#3D0000] rounded flex-1" />
                <div className="h-4 bg-[#3D0000] rounded w-24" />
                <div className="h-4 bg-[#3D0000] rounded w-20" />
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
                        <p className="text-mono-label" style={{ fontSize: '10px', color: '#9ca3af' }}>
                          {p.freelancer?.user.email ?? ''}
                        </p>
                      </td>
                      <td>
                        <span className="text-sm max-w-[160px] truncate block" style={{ color: '#d1d5db' }}>
                          {p.project?.title ?? `#${p.projectId}`}
                        </span>
                      </td>
                      <td>
                        <span className="text-primary-ui font-medium">{curr}{p.amount.toLocaleString()}</span>
                      </td>
                      <td>
                        <span style={{ color: p.deductions > 0 ? '#f87171' : '#9ca3af' }}>
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
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditingPayment(null)} />
          <div className="glass-card rounded-xl p-8 relative z-10 w-full max-w-lg" style={{ borderColor: 'rgba(220,20,60,0.4)' }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-mono-label mb-0.5">EDIT PAYMENT</p>
                <h2 className="text-primary-ui font-bold text-lg">
                  {editingPayment.freelancer?.user.name}
                </h2>
                <p className="text-mono-label mt-0.5" style={{ fontSize: '11px', color: '#9ca3af' }}>
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
    </DashboardLayout>
  )
}
