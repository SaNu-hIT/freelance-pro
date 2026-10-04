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
import { Wordmark } from '@/components/brand/SiteHeader'

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

function isNavActive(href: string, pathname: string) {
  const isRootItem = href.split('/').length < 3
  return (
    pathname === href ||
    (isRootItem && pathname === href + '/dashboard') ||
    (!isRootItem && pathname.startsWith(href + '/'))
  )
}

// Chapter number for the current page, counted in sidebar order ("03 / WORKLOGS").
export function navChapter(role: UserRole, pathname: string): string | null {
  const items = navByRole[role].flatMap(s => s.items)
  const i = items.findIndex(item => isNavActive(item.href, pathname))
  if (i < 0) return null
  return `${String(i + 1).padStart(2, '0')} / ${items[i].label.toUpperCase()}`
}

interface SidebarProps {
  role: UserRole
  pathname: string
  // icon-only rail
  collapsed?: boolean
}

export function Sidebar({ role, pathname, collapsed = false }: SidebarProps) {
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
      style={{ width: collapsed ? 64 : 240, minWidth: collapsed ? 64 : 240, transition: 'width var(--t-hover) var(--ease), min-width var(--t-hover) var(--ease)' }}
    >
      <Link href="/" aria-label="Blackorwhite home" className={`flex items-center border-b border-theme transition-opacity hover:opacity-80 ${collapsed ? 'justify-center py-6' : 'gap-3 px-5 py-6'}`}>
        {collapsed
          ? <span className="text-[var(--fg)] font-extrabold text-sm tracking-tight">B/W</span>
          : <Wordmark className="text-[var(--fg)]" />}
      </Link>

      <nav className={`flex-1 py-4 overflow-y-auto overflow-x-hidden ${collapsed ? 'px-2' : 'px-3'}`}>
        {navSections.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
            {collapsed && gi > 0 && <div className="mx-2 mb-3 h-px" style={{ background: 'var(--hair)' }} />}
            {!collapsed && group.section && (
              <p className="px-3 mb-1 text-[9px] font-bold tracking-[0.2em] uppercase select-none"
                style={{ color: 'rgb(var(--fg-rgb) / 0.45)', fontFamily: 'var(--font-mono)' }}>
                {group.section}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = isNavActive(item.href, pathname)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    aria-label={collapsed ? item.label : undefined}
                    className={`nav-item relative flex items-center rounded text-sm transition-all group ${collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-3 py-2.5'} ${isActive ? 'active' : ''}`}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {collapsed ? (
                      item.href === '/admin/chat' && adminChatUnread > 0 && (
                        <span className="absolute top-1.5 right-2 w-2 h-2 animate-pulse" style={{ background: 'var(--fg)', outline: '2px solid var(--bg)' }} />
                      )
                    ) : <>
                    <span className="flex-1 text-xs tracking-wide uppercase" style={{ fontFamily: 'var(--font-mono)' }}>{item.label}</span>
                    {item.href === '/admin/chat' && adminChatUnread > 0 ? (
                      <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse"
                        style={{ background: 'var(--fg)', color: 'var(--bg)' }}>
                        {adminChatUnread}
                      </span>
                    ) : isActive ? (
                      <ChevronRight size={12} className="text-[var(--fg)] opacity-70" />
                    ) : null}
                    </>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={`py-4 border-t border-theme ${collapsed ? 'px-2' : 'px-4'}`}>
        {user && (
          <div className={`mb-3 flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`} title={collapsed ? user.name : undefined}>
            <div className="w-8 h-8 rounded-full bg-[var(--fg)] flex items-center justify-center text-[var(--bg)] text-xs font-bold uppercase shrink-0">
              {user.profileImage ? (
                <img src={user.profileImage} alt={user.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                user.name.charAt(0)
              )}
            </div>
            {!collapsed && <div className="overflow-hidden">
              <p className="text-primary-ui text-xs font-semibold truncate">{user.name}</p>
              <p className="text-xs uppercase tracking-widest truncate" style={{ color: 'rgb(var(--fg-rgb) / 0.65)', fontFamily: 'var(--font-mono)' }}>
                {user.role}
              </p>
            </div>}
          </div>
        )}
        <button
          onClick={logout}
          title={collapsed ? 'Logout' : undefined}
          aria-label="Logout"
          className={`btn-ghost w-full flex items-center justify-center gap-2 text-xs py-2 ${collapsed ? 'px-0' : ''}`}
        >
          <LogOut size={14} />
          {!collapsed && <span className="text-mono-label tracking-wider">LOGOUT</span>}
        </button>
      </div>
    </aside>
  )
}
