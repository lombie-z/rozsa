'use client'
import { useState, useEffect, useRef } from 'react'
import { scrollState } from '@/lib/good-talk/scrollState'

const GLYPH_W = 91
const GLYPH_H = 150

const R_PATH = 'M47.99 108.26L47.86 41.95Q47.86 37.58 50.04 36.35L59.89 30.6Q63.03 28.69 69.46 37.3Q70.83 39.08 72.88 38.06Q74.93 37.03 72.88 34.57Q58.52 18.57 50.86 3.12Q48.54 -0.02 45.81 3.12Q38.15 12.01 31.52 16.66Q24.89 21.31 12.04 24.32Q9.58 25 9.58 26.5Q9.58 28.01 11.35 28.69Q20.51 30.19 20.38 44.41L20.38 102.25Q20.38 116.19 15.18 119.34Q9.17 123.3 5.34 116.46Q3.83 113.59 1.92 115.1Q0.01 116.6 2.06 119.88Q6.02 126.17 9.64 132.73Q13.27 139.3 17.1 145.86Q19.42 149.96 23.25 147.36Q43.35 137.66 47.31 122.75Q47.72 121.39 48.95 121.04Q50.18 120.7 51.14 121.93L72.19 146.13Q73.01 146.95 74.11 146.88Q75.2 146.82 75.88 145.72L90.24 118.24Q90.79 117.01 89.97 115.92L73.56 96.23Q72.6 95.27 71.44 95.41Q70.28 95.55 69.87 96.64L58.79 117.15Q58.25 117.97 57.09 118.17Q55.92 118.38 54.97 117.42L48.54 109.63Q47.99 109.08 47.99 108.26'

const MIN_DISPLAY_MS = 4000

export function LoadingScreen() {
  const [fillPercent, setFillPercent] = useState(0)
  const [phase, setPhase] = useState<'filling' | 'fading-r' | 'revealing'>('filling')
  const [dismissed, setDismissed] = useState(false)
  const mountTime = useRef(Date.now())
  const currentFill = useRef(0)
  const doneRef = useRef(false)

  useEffect(() => {
    let raf: number
    const animate = () => {
      if (doneRef.current) return
      const elapsed = Date.now() - mountTime.current
      const canFinish = elapsed >= MIN_DISPLAY_MS

      const speed = canFinish ? 0.06 : 0.012
      const next = currentFill.current + (130 - currentFill.current) * speed
      currentFill.current = next
      setFillPercent(next)

      if (next >= 120) {
        doneRef.current = true
        setPhase('fading-r')
        setTimeout(() => {
          setPhase('revealing')
          scrollState.sceneReady = true
        }, 600)
        setTimeout(() => setDismissed(true), 1800)
        return
      }

      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [])

  if (dismissed) return null

  const fillY = GLYPH_H - (fillPercent / 100) * GLYPH_H

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#f0f0f0',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        opacity: phase === 'revealing' ? 0 : 1,
        transition: 'opacity 1.2s ease-in-out',
        pointerEvents: phase === 'revealing' ? 'none' : 'all',
      }}
    >
      {/* Animated R */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${GLYPH_W} ${GLYPH_H}`}
        style={{
          width: 'min(14vw, 16vh)',
          height: `calc(min(14vw, 16vh) * ${GLYPH_H} / ${GLYPH_W})`,
          overflow: 'visible',
          opacity: phase === 'filling' ? 1 : 0,
          transition: 'opacity 0.8s ease-out',
        }}
      >
        <defs>
          <clipPath id="r-clip">
            <path d={R_PATH} transform={`scale(1,-1) translate(0,${-GLYPH_H})`} />
          </clipPath>
        </defs>
        <path
          d={R_PATH}
          fill="rgba(180, 180, 185, 0.3)"
          stroke="rgba(160, 160, 165, 0.3)"
          strokeWidth="0.3"
          transform={`scale(1,-1) translate(-6,${-GLYPH_H - 8})`}
        />
        <g clipPath="url(#r-clip)">
          <rect x="-5" y={fillY} width={GLYPH_W + 10} height={GLYPH_H - fillY + 5} fill="rgba(60, 60, 65, 0.85)" />
          <rect x="-5" y={fillY - 4} width={GLYPH_W + 10} height="4" fill="rgba(90, 90, 95, 0.5)" />
          <rect x="-5" y={fillY - 2} width={GLYPH_W + 10} height="2" fill="rgba(40, 40, 45, 0.4)" />
        </g>
      </svg>

      {/* Title + subtitle */}
      <div style={{
        opacity: phase === 'filling' ? Math.min(1, fillPercent / 40) : 0,
        transition: phase !== 'filling' ? 'opacity 0.6s ease-out' : undefined,
        display: 'flex',
        gap: 14,
      }}>
        <div style={{
          fontFamily: 'var(--font-rock-3d), cursive',
          fontSize: 'clamp(1rem, 2.2vw, 1.5rem)',
          fontWeight: 400,
          color: 'rgba(40, 40, 45, 0.95)',
          lineHeight: 1.5,
          width: '1.3em',
          wordBreak: 'break-all',
          textAlign: 'center',
        }}>
          {'good talk'.split('').map((c, i) => (
            <span key={i} style={{ display: 'block' }}>{c === ' ' ? ' ' : c}</span>
          ))}
        </div>
        <div style={{
          fontFamily: "'UnifrakturMaguntia', serif",
          fontSize: 'clamp(0.6rem, 1.2vw, 0.8rem)',
          color: 'rgba(80, 80, 85, 0.65)',
          lineHeight: 1.6,
          width: '1em',
          wordBreak: 'break-all',
          textAlign: 'center',
          paddingTop: 4,
        }}>
          {'independent album'.split('').map((c, i) => (
            <span key={i} style={{ display: 'block' }}>{c === ' ' ? ' ' : c}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
