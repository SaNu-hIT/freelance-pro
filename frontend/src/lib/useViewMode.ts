'use client'

import { useCallback, useSyncExternalStore } from 'react'

// List/grid choice per screen, remembered in this browser. Falls back to memory when storage is blocked.
const memory = new Map<string, string>()
const listeners = new Set<() => void>()

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

export function useViewMode<T extends string>(key: string, options: readonly T[], fallback: T): [T, (mode: T) => void] {
  const read = () => {
    let stored = memory.get(key)
    if (stored === undefined) {
      try { stored = localStorage.getItem(key) ?? undefined } catch {}
    }
    return options.includes(stored as T) ? (stored as T) : fallback
  }
  const mode = useSyncExternalStore(subscribe, read, () => fallback)
  const setMode = useCallback((next: T) => {
    memory.set(key, next)
    try { localStorage.setItem(key, next) } catch {}
    listeners.forEach(l => l())
  }, [key])
  return [mode, setMode]
}
