import { create } from 'zustand'
import { chatApi } from './api'

export interface ChatMessage {
  id: string
  projectId: string
  projectTitle: string
  from: 'client' | 'admin'
  sender: string
  senderId: string
  text: string
  ts: string              // ISO
  readByAdmin: boolean
  readByClient: boolean
}

interface ChatStore {
  messages: ChatMessage[]
  loading: boolean
  fetchMessages: (projectId?: string) => Promise<void>
  sendMessage: (msg: Omit<ChatMessage, 'id' | 'ts'>) => Promise<void>
  markReadByAdmin:  (projectId: string) => Promise<void>
  markReadByClient: (projectId: string) => Promise<void>
  unreadForAdmin:   (projectId?: string) => number
  unreadForClient:  (projectId?: string) => number
}

export const useChatStore = create<ChatStore>()((set, get) => ({
  messages: [],
  loading: false,

  fetchMessages: async (projectId) => {
    set({ loading: true })
    try {
      const res = await chatApi.getMessages(projectId)
      const incoming: ChatMessage[] = (res.data ?? []).map((m: ChatMessage & { ts: string | Date }) => ({
        ...m,
        ts: typeof m.ts === 'string' ? m.ts : new Date(m.ts).toISOString(),
      }))
      if (projectId) {
        // merge: replace messages for this project, keep others
        set(s => ({
          messages: [
            ...s.messages.filter(m => m.projectId !== projectId),
            ...incoming,
          ],
          loading: false,
        }))
      } else {
        set({ messages: incoming, loading: false })
      }
    } catch {
      set({ loading: false })
    }
  },

  sendMessage: async (msg) => {
    // Optimistic insert
    const tempId = `tmp-${Date.now()}`
    const optimistic: ChatMessage = { ...msg, id: tempId, ts: new Date().toISOString() }
    set(s => ({ messages: [...s.messages, optimistic] }))
    try {
      const res = await chatApi.send(msg)
      const saved: ChatMessage = {
        ...res.data,
        ts: typeof res.data.ts === 'string' ? res.data.ts : new Date(res.data.ts).toISOString(),
      }
      // Replace optimistic with real record
      set(s => ({ messages: s.messages.map(m => m.id === tempId ? saved : m) }))
    } catch {
      // Keep optimistic on error
    }
  },

  markReadByAdmin: async (projectId) => {
    set(s => ({
      messages: s.messages.map(m =>
        m.projectId === projectId && m.from === 'client' ? { ...m, readByAdmin: true } : m
      ),
    }))
    try { await chatApi.markRead(projectId, 'admin') } catch {}
  },

  markReadByClient: async (projectId) => {
    set(s => ({
      messages: s.messages.map(m =>
        m.projectId === projectId && m.from === 'admin' ? { ...m, readByClient: true } : m
      ),
    }))
    try { await chatApi.markRead(projectId, 'client') } catch {}
  },

  unreadForAdmin: (projectId) => {
    return get().messages.filter(m =>
      m.from === 'client' &&
      !m.readByAdmin &&
      (projectId ? m.projectId === projectId : true)
    ).length
  },

  unreadForClient: (projectId) => {
    return get().messages.filter(m =>
      m.from === 'admin' &&
      !m.readByClient &&
      (projectId ? m.projectId === projectId : true)
    ).length
  },
}))
