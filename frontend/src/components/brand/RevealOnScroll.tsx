'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Blocks that fade up as they scroll into view, like the BLACKORWHITE site.
// Dashboard pages: each top-level block of the page. Public pages: section content.
const TARGETS = [
  '.dash-main > * > *',
  '.metric-card',
  '.site-main section > div > *:not(.showcase-track)',
  '.showcase-card',
  '.reveal',
].join(',')

// Uses a data attribute rather than a class so React re-renders never strip it,
// and removes it once shown so no transform lingers (it would break fixed modals).
export function RevealOnScroll() {
  const pathname = usePathname()

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const io = new IntersectionObserver(entries => {
      let i = 0
      for (const e of entries) {
        if (!e.isIntersecting) continue
        const el = e.target as HTMLElement
        io.unobserve(el)
        el.style.transitionDelay = `${Math.min(i++, 6) * 70}ms`
        el.dataset.rv = 'in'
        setTimeout(() => {
          delete el.dataset.rv
          el.style.transitionDelay = ''
        }, 1200 + i * 70)
      }
    }, { rootMargin: '0px 0px -8% 0px' })

    const seen = new WeakSet<Element>()
    const scan = () => {
      document.querySelectorAll<HTMLElement>(TARGETS).forEach(el => {
        if (seen.has(el)) return
        seen.add(el)
        if (getComputedStyle(el).position === 'fixed') return
        el.dataset.rv = ''
        io.observe(el)
      })
    }

    let frame = 0
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(scan)
    })
    scan()
    mo.observe(document.body, { childList: true, subtree: true })

    return () => {
      mo.disconnect()
      io.disconnect()
      cancelAnimationFrame(frame)
      // never leave anything stuck invisible
      document.querySelectorAll<HTMLElement>('[data-rv]').forEach(el => { delete el.dataset.rv })
    }
  }, [pathname])

  return null
}
