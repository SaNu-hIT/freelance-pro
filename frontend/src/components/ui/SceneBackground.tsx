'use client'

import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'

/* ─────────────────────────────────────────────────────────────────────────────
   ParticleNetwork  –  canvas-based floating dots + connecting lines
   ───────────────────────────────────────────────────────────────────────────── */
export function ParticleNetwork({
  count = 65,
  dotColor = '220,20,60',
  lineColor = '220,20,60',
  className = '',
}: {
  count?: number
  dotColor?: string
  lineColor?: string
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ctx = el.getContext('2d')!
    let raf: number
    const dpr = window.devicePixelRatio || 1

    const resize = () => {
      el.width = el.offsetWidth * dpr
      el.height = el.offsetHeight * dpr
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(el)

    type Pt = { x: number; y: number; vx: number; vy: number; r: number; a: number }
    const W = () => el.offsetWidth
    const H = () => el.offsetHeight

    const pts: Pt[] = Array.from({ length: count }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      vx: (Math.random() - 0.5) * 0.38,
      vy: (Math.random() - 0.5) * 0.38,
      r: Math.random() * 1.6 + 0.5,
      a: Math.random() * 0.5 + 0.15,
    }))

    const LINK = 145

    const tick = () => {
      const w = W(), h = H()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      for (const p of pts) {
        p.x = (p.x + p.vx + w) % w
        p.y = (p.y + p.vy + h) % h
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${dotColor},${p.a})`
        ctx.fill()
      }

      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)
          if (d < LINK) {
            ctx.beginPath()
            ctx.moveTo(pts[i].x, pts[i].y)
            ctx.lineTo(pts[j].x, pts[j].y)
            ctx.strokeStyle = `rgba(${lineColor},${(1 - d / LINK) * 0.13})`
            ctx.lineWidth = 0.6
            ctx.stroke()
          }
        }
      }

      raf = requestAnimationFrame(tick)
    }
    tick()

    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [count, dotColor, lineColor])

  return (
    <canvas
      ref={ref}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    />
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   WireframeCube  –  CSS preserve-3d rotating cube
   ───────────────────────────────────────────────────────────────────────────── */
function CubeFace({ t, color }: { t: string; color: string }) {
  return (
    <div style={{ position: 'absolute', inset: 0, border: `1px solid ${color}`, transform: t }} />
  )
}

export function WireframeCube({
  size = 120,
  color = 'rgba(220,20,60,0.22)',
  duration = 22,
  delay = '0s',
  style,
}: {
  size?: number
  color?: string
  duration?: number
  delay?: string
  style?: CSSProperties
}) {
  const h = size / 2
  return (
    <div
      style={{
        position: 'absolute',
        width: size,
        height: size,
        perspective: 700,
        pointerEvents: 'none',
        ...style,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          animation: `fp-spin3d ${duration}s linear ${delay} infinite`,
        }}
      >
        <CubeFace t={`translateZ(${h}px)`} color={color} />
        <CubeFace t={`rotateY(180deg) translateZ(${h}px)`} color={color} />
        <CubeFace t={`rotateY(90deg) translateZ(${h}px)`} color={color} />
        <CubeFace t={`rotateY(-90deg) translateZ(${h}px)`} color={color} />
        <CubeFace t={`rotateX(90deg) translateZ(${h}px)`} color={color} />
        <CubeFace t={`rotateX(-90deg) translateZ(${h}px)`} color={color} />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   OrbitalRing  –  tilted spinning ellipse that reads as a 3-D orbit
   ───────────────────────────────────────────────────────────────────────────── */
export function OrbitalRing({
  size = 420,
  color = 'rgba(220,20,60,0.10)',
  tiltX = 72,
  duration = 12,
  delay = '0s',
  style,
}: {
  size?: number
  color?: string
  tiltX?: number
  duration?: number
  delay?: string
  style?: CSSProperties
}) {
  return (
    <div
      style={{
        position: 'absolute',
        width: size,
        height: size,
        perspective: 900,
        pointerEvents: 'none',
        ...style,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `rotateX(${tiltX}deg)`,
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            border: `1px solid ${color}`,
            boxShadow: `0 0 16px ${color}`,
            animation: `fp-ring-spin ${duration}s linear ${delay} infinite`,
          }}
        />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   FloatingGlyph  –  a single SVG polygon drifting in space
   ───────────────────────────────────────────────────────────────────────────── */
export function FloatingGlyph({
  size = 90,
  color = 'rgba(220,20,60,0.18)',
  duration = 16,
  delay = '0s',
  spin = true,
  style,
}: {
  size?: number
  color?: string
  duration?: number
  delay?: string
  spin?: boolean
  style?: CSSProperties
}) {
  return (
    /* outer wrapper floats up/down; inner SVG spins independently */
    <div
      style={{
        position: 'absolute',
        width: size,
        height: size,
        pointerEvents: 'none',
        animation: `fp-glyph-float ${duration}s ease-in-out ${delay} infinite`,
        ...style,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        style={spin ? { animation: `fp-glyph-spin ${duration * 1.7}s linear ${delay} infinite` } : undefined}
      >
        {/* hexagon */}
        <polygon
          points="50,4 93,27 93,73 50,96 7,73 7,27"
          stroke={color}
          strokeWidth="1.5"
          fill="none"
        />
        {/* inner star lines */}
        <line x1="50" y1="4"  x2="50" y2="96" stroke={color} strokeWidth="0.6" />
        <line x1="7"  y1="27" x2="93" y2="73" stroke={color} strokeWidth="0.6" />
        <line x1="93" y1="27" x2="7"  y2="73" stroke={color} strokeWidth="0.6" />
        <circle cx="50" cy="50" r="8" stroke={color} strokeWidth="1" />
      </svg>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   CornerAccent  –  decorative L-bracket corners
   ───────────────────────────────────────────────────────────────────────────── */
export function CornerAccents({ color = 'rgba(220,20,60,0.3)' }: { color?: string }) {
  const corner = (cls: string, rx: string, ry: string) => (
    <svg
      width={40}
      height={40}
      viewBox="0 0 40 40"
      fill="none"
      className={`absolute pointer-events-none ${cls}`}
      style={{ color }}
    >
      <path d={`M 0 ${ry === 'bottom' ? 40 : 0} L 0 ${ry === 'bottom' ? 8 : 32} M 0 ${ry === 'bottom' ? 40 : 0} L ${rx === 'right' ? 32 : 8} ${ry === 'bottom' ? 40 : 0}`}
        stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
  return (
    <>
      {corner('top-0 left-0',   'left',  'top')}
      {corner('top-0 right-0',  'right', 'top')}
      {corner('bottom-0 left-0','left',  'bottom')}
      {corner('bottom-0 right-0','right','bottom')}
    </>
  )
}
