'use client'

import Link from 'next/link'
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  UserCheck,
  ClipboardList,
  CreditCard,
  Settings,
  Briefcase,
  DollarSign,
  User,
  Milestone,
  FileText,
  LogOut,
  ChevronRight,
  Inbox,
  UsersRound,
  GitMerge,
  MessageSquare,
} from 'lucide-react'
import { useEffect } from 'react'
import { UserRole } from '@/lib/types'
import { useAuthStore } from '@/lib/store'
import { useChatStore } from '@/lib/chatStore'
import { CrimsonCube } from '@/components/ui/CrimsonCube'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

interface NavSection {
  section: string | null
  items: NavItem[]
}

const adminNav: NavSection[] = [
  {
    section: null,
    items: [
      { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard size={16} /> },
    ],
  },
  {
    section: 'Projects',
    items: [
      { label: 'Projects', href: '/admin/projects', icon: <FolderKanban size={16} /> },
      { label: 'Worklogs', href: '/admin/worklogs', icon: <ClipboardList size={16} /> },
    ],
  },
  {
    section: 'Team',
    items: [
      { label: 'Our Team', href: '/admin/freelancers', icon: <UserCheck size={16} /> },
      { label: 'Onboarding', href: '/admin/onboarding', icon: <GitMerge size={16} /> },
      { label: 'Resources', href: '/admin/resources', icon: <UsersRound size={16} /> },
    ],
  },
  {
    section: 'Clients',
    items: [
      { label: 'Clients', href: '/admin/clients', icon: <Users size={16} /> },
      { label: 'Payments', href: '/admin/payments', icon: <CreditCard size={16} /> },
      { label: 'Inquiries', href: '/admin/inquiries', icon: <Inbox size={16} /> },
    ],
  },
  {
    section: 'Communication',
    items: [
      { label: 'Messages', href: '/admin/chat', icon: <MessageSquare size={16} /> },
    ],
  },
  {
    section: 'System',
    items: [
      { label: 'Settings', href: '/admin/settings', icon: <Settings size={16} /> },
    ],
  },
]

const freelancerNav: NavSection[] = [
  {
    section: null,
    items: [
      { label: 'Dashboard', href: '/freelancer', icon: <LayoutDashboard size={16} /> },
    ],
  },
  {
    section: 'Work',
    items: [
      { label: 'My Projects', href: '/freelancer/projects', icon: <Briefcase size={16} /> },
      { label: 'Worklogs', href: '/freelancer/worklogs', icon: <ClipboardList size={16} /> },
    ],
  },
  {
    section: 'Finance',
    items: [
      { label: 'Earnings', href: '/freelancer/earnings', icon: <DollarSign size={16} /> },
    ],
  },
  {
    section: 'Account',
    items: [
      { label: 'Profile', href: '/freelancer/profile', icon: <User size={16} /> },
    ],
  },
]

const clientNav: NavSection[] = [
  {
    section: null,
    items: [
      { label: 'Dashboard', href: '/client', icon: <LayoutDashboard size={16} /> },
    ],
  },
  {
    section: 'Projects',
    items: [
      { label: 'My Projects', href: '/client/projects', icon: <FolderKanban size={16} /> },
      { label: 'Milestones', href: '/client/milestones', icon: <Milestone size={16} /> },
      { label: 'Documents', href: '/client/documents', icon: <FileText size={16} /> },
    ],
  },
]

const navByRole: Record<UserRole, NavSection[]> = {
  admin: adminNav,
  freelancer: freelancerNav,
  client: clientNav,
}

interface SidebarProps {
  role: UserRole
  pathname: string
}

export function Sidebar({ role, pathname }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const unreadForAdmin = useChatStore(s => s.unreadForAdmin)
  const fetchMessages = useChatStore(s => s.fetchMessages)
  const adminChatUnread = role === 'admin' ? unreadForAdmin() : 0

  useEffect(() => {
    if (role === 'admin') fetchMessages()
  }, [role, fetchMessages])
  const navSections = navByRole[role]

  return (
    <aside
      className="glass-card-dark flex flex-col border-r border-theme h-screen sticky top-0"
      style={{ width: 240, minWidth: 240 }}
    >
      <Link href="/" className="flex items-center gap-3 px-5 py-6 border-b border-theme transition-opacity hover:opacity-80">
        <CrimsonCube size={28} />
        <span className="text-display text-[#DC143C] text-sm font-bold tracking-widest uppercase leading-tight">
          FREELANCE_PRO
        </span>
      </Link>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {navSections.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
            {group.section && (
              <p className="px-3 mb-1 text-[9px] font-bold tracking-[0.2em] uppercase select-none"
                style={{ color: 'rgba(220,20,60,0.45)', fontFamily: "'JetBrains Mono', monospace" }}>
                {group.section}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isRootItem = item.href.split('/').length < 3
                const isActive =
                  pathname === item.href ||
                  (isRootItem && pathname === item.href + '/dashboard') ||
                  (!isRootItem && pathname.startsWith(item.href + '/'))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-all group ${isActive ? 'active' : ''}`}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span className="flex-1 text-xs tracking-wide uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{item.label}</span>
                    {item.href === '/admin/chat' && adminChatUnread > 0 ? (
                      <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse"
                        style={{ background: '#DC143C', color: '#fff' }}>
                        {adminChatUnread}
                      </span>
                    ) : isActive ? (
                      <ChevronRight size={12} className="text-[#DC143C] opacity-70" />
                    ) : null}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-theme">
        {user && (
          <div className="mb-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#8B0000] flex items-center justify-center text-white text-xs font-bold uppercase shrink-0">
              {user.profileImage ? (
                <img src={user.profileImage} alt={user.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                user.name.charAt(0)
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-primary-ui text-xs font-semibold truncate">{user.name}</p>
              <p className="text-xs uppercase tracking-widest truncate" style={{ color: 'rgba(220,20,60,0.65)', fontFamily: "'JetBrains Mono', monospace" }}>
                {user.role}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="btn-ghost w-full flex items-center justify-center gap-2 text-xs py-2"
        >
          <LogOut size={14} />
          <span className="text-mono-label tracking-wider">LOGOUT</span>
        </button>
      </div>
    </aside>
  )
}
