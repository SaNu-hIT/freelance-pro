'use client'

import { useRef, MouseEvent } from 'react'
import { cn } from '@/lib/utils'

interface ParallaxCardProps {
  children: React.ReactNode
  className?: string
}

export function ParallaxCard({ children, className }: ParallaxCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = e.clientX - cx
    const dy = e.clientY - cy
    const rotX = (-dy / (rect.height / 2)) * 10
    const rotY = (dx / (rect.width / 2)) * 10
    card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg)`
  }

  const handleMouseLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)'
    }
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'glass-card backdrop-blur-xl transition-transform duration-200 ease-out will-change-transform',
        className
      )}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div className="animate-float" style={{ transformStyle: 'preserve-3d' }}>
        {children}
      </div>
    </div>
  )
}
