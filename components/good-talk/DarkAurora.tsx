'use client'
import { useRef, useEffect } from 'react'

export function DarkAurora() {
  const layer1 = useRef<HTMLDivElement>(null)
  const layer2 = useRef<HTMLDivElement>(null)
  const layer3 = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let rafId: number
    function tick() {
      const t = performance.now() / 1000

      if (layer1.current) {
        const h1 = 28 + Math.sin(t * 0.3) * 8
        const o1 = 0.5 + Math.sin(t * 0.4 + 1) * 0.15
        layer1.current.style.height = `${h1}%`
        layer1.current.style.opacity = String(o1)
      }
      if (layer2.current) {
        const h2 = 18 + Math.sin(t * 0.5 + 2) * 6
        const o2 = 0.35 + Math.sin(t * 0.35 + 3) * 0.1
        layer2.current.style.height = `${h2}%`
        layer2.current.style.opacity = String(o2)
      }
      if (layer3.current) {
        const h3 = 12 + Math.sin(t * 0.7 + 4) * 5
        const o3 = 0.25 + Math.sin(t * 0.6 + 0.5) * 0.1
        layer3.current.style.height = `${h3}%`
        layer3.current.style.opacity = String(o3)
      }

      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  const base = {
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    pointerEvents: 'none' as const,
    zIndex: 3,
  }

  return (
    <>
      <div
        ref={layer1}
        style={{
          ...base,
          height: '28%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 40%, transparent 100%)',
          opacity: 0.5,
        }}
      />
      <div
        ref={layer2}
        style={{
          ...base,
          height: '18%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 30%, transparent 100%)',
          opacity: 0.35,
        }}
      />
      <div
        ref={layer3}
        style={{
          ...base,
          height: '12%',
          background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 20%, transparent 100%)',
          opacity: 0.25,
        }}
      />
    </>
  )
}
