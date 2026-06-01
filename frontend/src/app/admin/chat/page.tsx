'use client'

import { useState, useRef, KeyboardEvent, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useChatStore, ChatMessage } from '@/lib/chatStore'
import {
  MessageSquare, Send, Search, Circle, Clock,
} from 'lucide-react'

/* ── helpers ──────────────────────────────────────────────── */
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/* ── Page ─────────────────────────────────────────────────── */
export default function AdminChatPage() {
  const {
    messages,
    sendMessage,
    markReadByAdmin,
    unreadForAdmin,
    fetchMessages,
  } = useChatStore()

  const [activeProject, setActiveProject] = useState<string | null>(null)

  useEffect(() => { fetchMessages() }, [fetchMessages])
  const [draftMsg, setDraftMsg] = useState('')
  const [search, setSearch] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  /* derive unique projects that have at least one message */
  const projectMap = new Map<string, { id: string; title: string; lastMsg: ChatMessage }>()
  messages.forEach(m => {
    const existing = projectMap.get(m.projectId)
    if (!existing || new Date(m.ts) > new Date(existing.lastMsg.ts)) {
      projectMap.set(m.projectId, { id: m.projectId, title: m.projectTitle, lastMsg: m })
    }
  })
  const projects = Array.from(projectMap.values())
    .sort((a, b) => new Date(b.lastMsg.ts).getTime() - new Date(a.lastMsg.ts).getTime())
    .filter(p => p.title.toLowerCase().includes(search.toLowerCase()))

  /* active conversation messages */
  const convoMessages = activeProject
    ? messages.filter(m => m.projectId === activeProject)
    : []

  const activeInfo = activeProject ? projectMap.get(activeProject) : null
  const totalUnread = unreadForAdmin()

  /* mark read when switching into a conversation */
  useEffect(() => {
    if (activeProject) {
      markReadByAdmin(activeProject)
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
    }
  }, [activeProject, messages.length]) // eslint-disable-line

  /* send reply */
  const sendReply = () => {
    if (!draftMsg.trim() || !activeProject || !activeInfo) return
    sendMessage({
      projectId: activeProject,
      projectTitle: activeInfo.title,
      from: 'admin',
      sender: 'Project Manager',
      senderId: 'admin-1',
      text: draftMsg.trim(),
      readByAdmin: true,
      readByClient: false,
    })
    setDraftMsg('')
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  return (
    <DashboardLayout allowedRoles={['admin']}>
      <div className="flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>

        {/* ── Page header ── */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <p className="text-mono-label mb-1" style={{ color: 'var(--text-muted)' }}>ADMIN</p>
            <h1 className="text-display text-4xl text-primary-ui flex items-center gap-3">
              CLIENT MESSAGES
              {totalUnread > 0 && (
                <span className="text-sm font-bold px-2.5 py-1 rounded-full animate-pulse"
                  style={{ background: 'rgba(220,20,60,0.12)', border: '1px solid rgba(220,20,60,0.3)', color: '#DC143C' }}>
                  {totalUnread} new
                </span>
              )}
            </h1>
          </div>
        </div>

        {/* ── Split panel ── */}
        <div className="flex flex-1 min-h-0 gap-0 rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>

          {/* ── LEFT — conversation list ── */}
          <div className="w-72 shrink-0 flex flex-col border-r border-theme">
            {/* search */}
            <div className="p-3 border-b border-theme shrink-0">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
                <Search size={13} style={{ color: 'var(--text-muted)' }} />
                <input
                  className="bg-transparent text-sm flex-1 outline-none placeholder:text-muted"
                  placeholder="Search projects…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            {/* list */}
            <div className="flex-1 overflow-y-auto">
              {projects.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No conversations yet</p>
                </div>
              ) : (
                projects.map(proj => {
                  const unread = unreadForAdmin(proj.id)
                  const isActive = proj.id === activeProject
                  return (
                    <button
                      key={proj.id}
                      onClick={() => setActiveProject(proj.id)}
                      className="w-full text-left px-4 py-3.5 transition-all border-b border-theme"
                      style={{
                        background: isActive ? 'var(--crimson-dim)' : 'transparent',
                        borderLeft: isActive ? '3px solid #DC143C' : '3px solid transparent',
                      }}>
                      <div className="flex items-start gap-3">
                        {/* project icon */}
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0"
                          style={{
                            background: isActive ? 'rgba(220,20,60,0.15)' : 'rgba(96,165,250,0.1)',
                            color: isActive ? '#DC143C' : '#60a5fa',
                            border: `1px solid ${isActive ? 'rgba(220,20,60,0.3)' : 'rgba(96,165,250,0.2)'}`,
                          }}>
                          {proj.title.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="font-semibold text-xs truncate"
                              style={{ color: isActive ? '#DC143C' : 'var(--text-primary)' }}>
                              {proj.title}
                            </span>
                            {unread > 0 && (
                              <span className="shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                                style={{ background: '#DC143C', color: '#fff' }}>
                                {unread}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] truncate mb-1" style={{ color: 'var(--text-muted)' }}>
                            <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                              {proj.lastMsg.from === 'client' ? proj.lastMsg.sender : 'You'}:
                            </span>{' '}
                            {proj.lastMsg.text}
                          </p>
                          <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                            <Clock size={10} />
                            <span className="text-[10px]">{timeAgo(proj.lastMsg.ts)}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* ── RIGHT — active conversation ── */}
          {!activeProject ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3"
              style={{ color: 'var(--text-muted)' }}>
              <MessageSquare size={40} strokeWidth={1.2} />
              <p className="text-sm font-medium">Select a project to view messages</p>
              {totalUnread > 0 && (
                <p className="text-xs" style={{ color: '#DC143C' }}>
                  {totalUnread} unread message{totalUnread > 1 ? 's' : ''} waiting
                </p>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {/* convo header */}
              <div className="px-6 py-4 border-b border-theme shrink-0 flex items-center gap-3"
                style={{ background: 'var(--bg-sidebar)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm"
                  style={{ background: 'rgba(220,20,60,0.12)', border: '1px solid rgba(220,20,60,0.25)', color: '#DC143C' }}>
                  {activeInfo?.title.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{activeInfo?.title}</p>
                  <div className="flex items-center gap-1.5">
                    <Circle size={6} fill="#4ade80" color="#4ade80" />
                    <p className="text-[10px] text-mono-label" style={{ color: 'var(--text-muted)' }}>
                      {convoMessages.length} message{convoMessages.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* messages */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {convoMessages.length === 0 ? (
                  <div className="text-center py-16">
                    <MessageSquare size={28} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No messages yet</p>
                  </div>
                ) : (
                  convoMessages.map((msg, i) => {
                    const isAdmin = msg.from === 'admin'
                    const showDate = i === 0 || fmtDate(convoMessages[i - 1].ts) !== fmtDate(msg.ts)
                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                            <span className="text-[10px] text-mono-label px-2" style={{ color: 'var(--text-muted)' }}>
                              {fmtDate(msg.ts)}
                            </span>
                            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                          </div>
                        )}
                        <div className={`flex items-end gap-3 ${isAdmin ? 'flex-row-reverse' : ''}`}>
                          {/* avatar */}
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                            style={{
                              background: isAdmin ? 'rgba(220,20,60,0.15)' : 'rgba(96,165,250,0.15)',
                              color: isAdmin ? '#DC143C' : '#60a5fa',
                            }}>
                            {msg.sender.charAt(0)}
                          </div>
                          <div className={`max-w-[62%] flex flex-col gap-1 ${isAdmin ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-center gap-2">
                              <span className="text-mono-label text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                {msg.sender}
                              </span>
                              <span className="text-mono-label text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                {fmtTime(msg.ts)}
                              </span>
                            </div>
                            <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
                              style={{
                                background: isAdmin ? 'rgba(220,20,60,0.10)' : 'var(--bg-elevated)',
                                border: `1px solid ${isAdmin ? 'rgba(220,20,60,0.2)' : 'var(--border)'}`,
                                color: 'var(--text-primary)',
                                borderBottomRightRadius: isAdmin ? 4 : undefined,
                                borderBottomLeftRadius: !isAdmin ? 4 : undefined,
                              }}>
                              {msg.text}
                            </div>
                            {/* read receipt for admin messages */}
                            {isAdmin && (
                              <span className="text-[10px] text-mono-label" style={{ color: msg.readByClient ? '#4ade80' : 'var(--text-muted)' }}>
                                {msg.readByClient ? '✓✓ Seen' : '✓ Sent'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* input */}
              <div className="px-6 py-4 border-t border-theme shrink-0"
                style={{ background: 'var(--bg-sidebar)' }}>
                <div className="flex items-center gap-3">
                  <input
                    className="input-field flex-1 py-3"
                    placeholder="Reply to client…"
                    value={draftMsg}
                    onChange={e => setDraftMsg(e.target.value)}
                    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() }
                    }}
                  />
                  <button
                    onClick={sendReply}
                    disabled={!draftMsg.trim()}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40"
                    style={{ background: '#DC143C', color: '#fff' }}>
                    <Send size={14} /> Send
                  </button>
                </div>
                <p className="text-mono-label mt-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Replies are visible to the client in their project portal immediately.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
