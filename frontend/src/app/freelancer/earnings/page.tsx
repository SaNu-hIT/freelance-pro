'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { paymentsApi, projectsApi } from '@/lib/api'
import { Payment, Project } from '@/lib/types'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, DollarSign, Clock, Minus } from 'lucide-react'
import { useCurrencySymbol } from '@/lib/store'

const MOCK_PAYMENTS: Payment[] = [
  { id: 'p1', projectId: '5', freelancerId: 'f1', amount: 2800, deductions: 280, netAmount: 2520, status: 'paid', createdAt: new Date(Date.now() - 15 * 86400000).toISOString() },
  { id: 'p2', projectId: '1', freelancerId: 'f1', amount: 1500, deductions: 150, netAmount: 1350, status: 'pending', createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: 'p3', projectId: '3', freelancerId: 'f1', amount: 2100, deductions: 210, netAmount: 1890, status: 'partial', createdAt: new Date(Date.now() - 25 * 86400000).toISOString() },
  { id: 'p4', projectId: '2', freelancerId: 'f1', amount: 800, deductions: 80, netAmount: 720, status: 'paid', createdAt: new Date(Date.now() - 45 * 86400000).toISOString() },
]

const MOCK_PROJECTS: Project[] = [
  { id: '1', title: 'E-Commerce Platform Redesign', description: '', budget: 4500, deadline: '', status: 'in_progress', priority: 'high', clientId: 'c1', progress: 65, createdAt: '', updatedAt: '' },
  { id: '2', title: 'Mobile App Backend API', description: '', budget: 3200, deadline: '', status: 'assigned', priority: 'medium', clientId: 'c2', progress: 30, createdAt: '', updatedAt: '' },
  { id: '3', title: 'Dashboard Analytics Module', description: '', budget: 2100, deadline: '', status: 'delayed', priority: 'critical', clientId: 'c1', progress: 80, createdAt: '', updatedAt: '' },
  { id: '5', title: 'Payment Gateway Setup', description: '', budget: 2800, deadline: '', status: 'completed', priority: 'high', clientId: 'c2', progress: 100, createdAt: '', updatedAt: '' },
]

const CHART_DATA = [
  { month: 'Dec', earnings: 0 },
  { month: 'Jan', earnings: 800 },
  { month: 'Feb', earnings: 2100 },
  { month: 'Mar', earnings: 1890 },
  { month: 'Apr', earnings: 2520 },
  { month: 'May', earnings: 1350 },
]

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

const paymentStatusMap: Record<string, { cls: string; label: string }> = {
  paid: { cls: 'status-completed', label: 'Paid' },
  pending: { cls: 'status-pending', label: 'Pending' },
  partial: { cls: 'status-delayed', label: 'Partial' },
}

export default function FreelancerEarningsPage() {
  const curr = useCurrencySymbol()
  const [payments, setPayments] = useState<Payment[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [pRes, projRes] = await Promise.all([
          paymentsApi.getAll(),
          projectsApi.getAll(),
        ])
        setPayments(pRes.data?.data ?? pRes.data ?? MOCK_PAYMENTS)
        setProjects(projRes.data?.data ?? projRes.data ?? MOCK_PROJECTS)
      } catch {
        setPayments(MOCK_PAYMENTS)
        setProjects(MOCK_PROJECTS)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const totalEarned = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.netAmount, 0)
  const pending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.netAmount, 0)
  const totalDeductions = payments.reduce((s, p) => s + p.deductions, 0)
  const thisMonth = CHART_DATA[CHART_DATA.length - 1].earnings

  const stats = [
    { label: 'Total Earned', value: `${curr}${totalEarned.toLocaleString()}`, icon: <TrendingUp size={20} className="text-[#DC143C]" />, color: '#DC143C' },
    { label: 'Pending', value: `${curr}${pending.toLocaleString()}`, icon: <Clock size={20} className="text-amber-400" />, color: '#fbbf24' },
    { label: 'Total Deductions', value: `${curr}${totalDeductions.toLocaleString()}`, icon: <Minus size={20} className="text-[var(--text-muted)]" />, color: 'var(--text-muted)' },
    { label: 'Net This Month', value: `${curr}${thisMonth.toLocaleString()}`, icon: <DollarSign size={20} className="text-green-400" />, color: '#4ade80' },
  ]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="glass-card rounded p-3 text-sm">
          <p className="text-mono-label text-[10px] mb-1">{label}</p>
          <p className="text-[#DC143C] font-bold">{curr}{payload[0].value.toLocaleString()}</p>
        </div>
      )
    }
    return null
  }

  return (
    <DashboardLayout allowedRoles={['freelancer']}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-display text-3xl text-gradient">EARNINGS</h1>
          <p className="text-mono-label text-[11px] mt-1">PAYMENT HISTORY & ANALYTICS</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass-card metric-card rounded-lg h-24 animate-pulse" />
              ))
            : stats.map(s => (
                <div key={s.label} className="glass-card metric-card rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-mono-label text-[10px]">{s.label}</span>
                    {s.icon}
                  </div>
                  <p className="text-primary-ui text-2xl font-bold text-display" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
        </div>

        {/* Bar Chart */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-mono-label text-xs tracking-widest mb-6">MONTHLY EARNINGS</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={CHART_DATA} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(220,20,60,0.1)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${curr}${v}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(220,20,60,0.05)' }} />
              <Bar dataKey="earnings" fill="#DC143C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payments Table */}
        <div className="glass-card rounded-xl p-5">
          <h2 className="text-mono-label text-xs tracking-widest mb-4">PAYMENT HISTORY</h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 bg-[var(--input-bg)] rounded animate-pulse" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <p className="text-mono-label text-center py-10">NO PAYMENTS YET</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Amount</th>
                  <th>Deductions</th>
                  <th>Net</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => {
                  const proj = projects.find(pr => pr.id === p.projectId)
                  const stat = paymentStatusMap[p.status] ?? { cls: 'status-new', label: p.status }
                  return (
                    <tr key={p.id}>
                      <td className="text-primary-ui font-medium">{proj?.title ?? p.projectId}</td>
                      <td className="text-primary-ui">{curr}{p.amount.toLocaleString()}</td>
                      <td className="text-[#DC143C]">-{curr}{p.deductions.toLocaleString()}</td>
                      <td className="text-green-400 font-bold">{curr}{p.netAmount.toLocaleString()}</td>
                      <td>
                        <span className={`status-badge ${stat.cls}`}>
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
                          {stat.label}
                        </span>
                      </td>
                      <td className="text-mono-label text-[11px]">{fmtDate(p.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
