'use client'
import { useState, useEffect, useCallback } from 'react'

export type Theme = 'dark' | 'light'
const KEY = 'fp-theme'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const stored = (localStorage.getItem(KEY) as Theme) || 'dark'
    apply(stored)
    setTheme(stored)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      apply(next)
      localStorage.setItem(KEY, next)
      return next
    })
  }, [])

  return { theme, toggleTheme }
}

function apply(t: Theme) {
  const html = document.documentElement
  if (t === 'light') {
    html.classList.add('light')
    html.classList.remove('dark')
  } else {
    html.classList.remove('light')
    html.classList.add('dark')
  }
}
