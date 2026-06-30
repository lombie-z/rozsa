'use client'
import { useRef, useState, useEffect } from 'react'
import { scrollState } from '@/lib/good-talk/scrollState'

const SECTION_COLORS = [
  '#FFB74D',
  '#4DD0E1',
  '#F48FB1',
  '#FF8A65',
  '#B39DDB',
]

function getSectionColor(offset: number): string {
  const raw = offset * 5
  const idx = Math.max(0, Math.min(Math.floor(raw), 4))
  return SECTION_COLORS[idx]
}

interface Ripple {
  id: number
  color: string
}

let rippleId = 0

export function BeatRipple() {
  const [ripples, setRipples] = useState<Ripple[]>([])
  const lastPulseRef = useRef(0)

  useEffect(() => {
    let rafId: number
    function tick() {
      const pulse = scrollState.beatPulse
      if (pulse > 0.3 && lastPulseRef.current <= 0.3) {
        const color = getSectionColor(scrollState.offset)
        const id = ++rippleId
        setRipples(prev => [...prev.slice(-4), { id, color }])
      }
      lastPulseRef.current = pulse
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        right: 48,
        top: '50%',
        zIndex: 40,
        pointerEvents: 'none',
      }}
    >
      {ripples.map(r => (
        <div
          key={r.id}
          onAnimationEnd={() =>
            setRipples(prev => prev.filter(x => x.id !== r.id))
          }
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 60,
            height: 60,
            marginLeft: -30,
            marginTop: -30,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${r.color}55, ${r.color}22 40%, transparent 70%)`,
            animation: 'beat-ripple 800ms ease-out forwards',
          }}
        />
      ))}
    </div>
  )
}
