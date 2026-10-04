'use client'

import { useEffect, useRef } from 'react'

interface ShowcaseItem { no: string; title: string; desc: string; img: string }

// Pinned horizontal card stream, like the "capabilities parade" on the BLACKORWHITE site.
// The section pins while vertical scroll drives the track sideways. Layout lives in CSS
// (.showcase-*), so phones and reduced-motion users get a plain vertical stack.
export function Showcase({ id, head, items }: { id?: string; head: React.ReactNode; items: ShowcaseItem[] }) {
  const outer = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = outer.current
    const rail = track.current
    if (!section || !rail) return
    const mq = window.matchMedia('(min-width: 768px) and (prefers-reduced-motion: no-preference)')
    let dist = 0
    let frame = 0

    const update = () => {
      if (!mq.matches) return
      const p = Math.min(1, Math.max(0, dist ? -section.getBoundingClientRect().top / dist : 0))
      rail.style.transform = `translate3d(${-p * dist}px,0,0)`
    }
    const measure = () => {
      if (!mq.matches) {
        section.style.height = ''
        rail.style.transform = ''
        return
      }
      dist = Math.max(0, rail.scrollWidth - window.innerWidth)
      section.style.height = `${window.innerHeight + dist}px`
      update()
    }
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }

    const ro = new ResizeObserver(measure)
    ro.observe(rail)
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', measure)
    mq.addEventListener('change', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', measure)
      mq.removeEventListener('change', measure)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <section id={id} ref={outer} className="relative border-y border-theme">
      <div className="showcase-pin">
        <div ref={track} className="showcase-track page-x">
          <div className="showcase-head">{head}</div>
          {items.map((item, i) => (
            <article
              key={item.no}
              className="showcase-card flex flex-col justify-end p-8"
              style={{
                ['--img' as string]: `url(${item.img})`,
                ['--cy' as string]: i % 2 ? '6vh' : '-4vh',
                ['--cr' as string]: i % 2 ? '2deg' : '-2.5deg',
              }}
            >
              <p className="text-mono-label mb-4" style={{ color: 'rgb(var(--fg-rgb) / .8)' }}>{item.no}</p>
              <h3 className="text-2xl md:text-3xl mb-3">{item.title}</h3>
              <p className="text-sm leading-relaxed text-secondary-ui max-w-xs">{item.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
