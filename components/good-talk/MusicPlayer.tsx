'use client'
import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { scrollState } from '@/lib/good-talk/scrollState'

const SONGS = [
  { src: '/good-talk/audio/out-is-through.mp3', title: 'Out is Through', color: '#E0E0E8', rgb: [0.88, 0.88, 0.91] },
  { src: '/good-talk/audio/is-your-heart-big-enough.mp3', title: 'Is Your Heart Big Enough for Them', color: '#8B2020', rgb: [0.1, 0.1, 0.1] },
  { src: '/good-talk/audio/sincerity.mp3', title: 'Sincerity', color: '#EC407A', rgb: [0.93, 0.25, 0.48] },
  { src: '/good-talk/audio/wheres-my-dignity-now.mp3', title: "Where's My Dignity Now", color: '#FF7043', rgb: [1.0, 0.44, 0.26] },
  { src: '/good-talk/audio/good-talk.mp3', title: 'Good Talk', color: '#AB47BC', rgb: [0.67, 0.28, 0.74] },
]

const FFT_SIZE = 2048
const BEAT_COOLDOWN_MS = 200
const BEAT_THRESHOLD_MULT = 1.4
const FLUX_HISTORY_SIZE = 50

/* ScalesMixer grid dimensions */
const GRID_COLS = 10
const GRID_ROWS = 10
const DOT_SPACING = 6
const DOT_R_MIN = 0.8
const DOT_R_MAX = 2.4

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/* ── useRafLoop ─────────────────────────────────────── */
function useRafLoop(callback: (dt: number) => void, active: boolean) {
  const cbRef = useRef(callback)
  cbRef.current = callback

  useEffect(() => {
    if (!active) return
    let prev = performance.now()
    let id: number
    function loop(now: number) {
      const dt = (now - prev) / 1000
      prev = now
      cbRef.current(dt)
      id = requestAnimationFrame(loop)
    }
    id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [active])
}

/* ── ScalesMixer ────────────────────────────────────── */
function ScalesMixer({
  getFreqData,
  color,
  isPlaying,
}: {
  getFreqData: () => Uint8Array | null
  color: string
  isPlaying: boolean
}) {
  const dotsRef = useRef<(SVGCircleElement | null)[]>([])
  const svgW = GRID_COLS * DOT_SPACING
  const svgH = GRID_ROWS * DOT_SPACING

  useRafLoop(() => {
    const data = getFreqData()
    if (!data) return
    const len = data.length // 1024 bins for FFT_SIZE=2048

    for (let row = 0; row < GRID_ROWS; row++) {
      // Map each row to a frequency band — logarithmic spread
      // Row 0 = lowest freq, Row 9 = highest
      const frac = row / GRID_ROWS
      const binStart = Math.floor(Math.pow(frac, 2) * len * 0.5)
      const binEnd = Math.floor(Math.pow((row + 1) / GRID_ROWS, 2) * len * 0.5)
      const count = Math.max(1, binEnd - binStart)

      // Average energy in this band
      let sum = 0
      for (let b = binStart; b < binStart + count && b < len; b++) {
        sum += data[b]
      }
      const energy = sum / (count * 255) // 0..1

      for (let col = 0; col < GRID_COLS; col++) {
        const dot = dotsRef.current[row * GRID_COLS + col]
        if (!dot) continue

        // Each column adds phase variation
        const phase = (col / GRID_COLS) * Math.PI
        const wave = 0.5 + 0.5 * Math.sin(phase + performance.now() * 0.003 + row * 0.7)
        const r = DOT_R_MIN + (DOT_R_MAX - DOT_R_MIN) * energy * wave
        const opacity = 0.15 + 0.85 * energy * wave

        dot.setAttribute('r', r.toFixed(2))
        dot.setAttribute('opacity', opacity.toFixed(2))
      }
    }
  }, isPlaying)

  const dots: React.ReactNode[] = []
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const idx = row * GRID_COLS + col
      dots.push(
        <circle
          key={idx}
          ref={(el) => { dotsRef.current[idx] = el }}
          cx={col * DOT_SPACING + DOT_SPACING / 2}
          cy={row * DOT_SPACING + DOT_SPACING / 2}
          r={DOT_R_MIN}
          fill={color}
          opacity={0.15}
        />
      )
    }
  }

  return (
    <svg
      className="mp-scales"
      viewBox={`0 0 ${svgW} ${svgH}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {dots}
    </svg>
  )
}

/* ── Disc ───────────────────────────────────────────── */
function Disc({ color, isPlaying }: { color: string; isPlaying: boolean }) {
  const angleRef = useRef(0)
  const discRef = useRef<HTMLDivElement>(null)
  const velocityRef = useRef(0)

  useRafLoop((dt) => {
    const target = isPlaying ? 45 : 0 // degrees per second
    velocityRef.current = lerp(velocityRef.current, target, dt * (isPlaying ? 3 : 1.5))
    angleRef.current = (angleRef.current + velocityRef.current * dt) % 360
    if (discRef.current) {
      discRef.current.style.transform = `rotate(${angleRef.current}deg)`
    }
  }, true)

  return (
    <div className="mp-disc-wrap">
      <div ref={discRef} className="mp-disc">
        {/* Grooves */}
        <div className="mp-disc-groove mp-disc-groove-1" />
        <div className="mp-disc-groove mp-disc-groove-2" />
        <div className="mp-disc-groove mp-disc-groove-3" />
        {/* Center color gradient */}
        <div
          className="mp-disc-center"
          style={{
            background: `radial-gradient(circle, ${color} 0%, ${color}88 40%, transparent 70%)`,
          }}
        />
        {/* Center dot */}
        <div className="mp-disc-dot" />
      </div>
    </div>
  )
}

/* ── Main MusicPlayer ───────────────────────────────── */
export function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [songIndex, setSongIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [linksOpen, setLinksOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const audiosRef = useRef<HTMLAudioElement[]>([])
  const gainsRef = useRef<GainNode[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const freqDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const fluxHistoryRef = useRef<number[]>([])
  const lastBeatRef = useRef(0)
  const lastRippleRef = useRef(0)
  const [volume, setVolume] = useState(0.7)
  const volumeRef = useRef(0.7)

  const playingRef = useRef(false)
  const indexRef = useRef(0)
  const bassRangeRef = useRef({ start: 0, end: 0 })

  /* ── Audio init ────────────────────────────────────── */
  useEffect(() => {
    const ctx = new AudioContext()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = FFT_SIZE
    analyser.smoothingTimeConstant = 0.4
    analyser.connect(ctx.destination)

    audioCtxRef.current = ctx
    analyserRef.current = analyser
    freqDataRef.current = new Uint8Array(analyser.frequencyBinCount)

    const sr = ctx.sampleRate
    bassRangeRef.current = {
      start: Math.floor(60 * FFT_SIZE / sr),
      end: Math.floor(200 * FFT_SIZE / sr),
    }

    audiosRef.current = SONGS.map(song => {
      const audio = new Audio(song.src)
      audio.loop = false
      audio.preload = 'auto'
      const source = ctx.createMediaElementSource(audio)
      const gain = ctx.createGain()
      gain.gain.value = 0
      source.connect(gain)
      gain.connect(analyser)
      gainsRef.current.push(gain)
      return audio
    })

    return () => {
      audiosRef.current.forEach(a => { a.pause(); a.src = '' })
      ctx.close()
    }
  }, [])

  /* ── Main rAF loop: beat detection, section colors, gain crossfade ── */
  useEffect(() => {
    let rafId: number
    let lastTickTime = performance.now()
    function tick() {
      const now = performance.now()
      const dt = (now - lastTickTime) / 1000
      lastTickTime = now
      for (let ri = 0; ri < 12; ri++) scrollState.rippleAges[ri] += dt

      if (audiosRef.current.length === 0) {
        rafId = requestAnimationFrame(tick)
        return
      }

      // Update section color
      const songIdx = Math.max(0, Math.min(Math.floor((scrollState.offset || 0) * SONGS.length), SONGS.length - 1))
      const rgb = SONGS[songIdx].rgb
      scrollState.sectionColor[0] = rgb[0]
      scrollState.sectionColor[1] = rgb[1]
      scrollState.sectionColor[2] = rgb[2]

      const offset = scrollState.offset || 0
      const newIndex = Math.max(0, Math.min(Math.floor((offset + 0.08) * SONGS.length), SONGS.length - 1))

      if (newIndex !== indexRef.current) {
        indexRef.current = newIndex
        setSongIndex(newIndex)
        if (playingRef.current) {
          audiosRef.current[newIndex]?.play().catch(() => {})
        }
      }

      gainsRef.current.forEach((gain, i) => {
        const audio = audiosRef.current[i]
        if (!gain || !audio) return
        const target = (i === indexRef.current && playingRef.current) ? volumeRef.current : 0
        gain.gain.value = Math.max(0, Math.min(1, lerp(gain.gain.value, target, 0.06)))
        if (target > 0 && audio.paused && playingRef.current) {
          audio.play().catch(() => {})
        }
        if (gain.gain.value < 0.005 && !audio.paused && target === 0) {
          audio.pause()
          gain.gain.value = 0
        }
      })

      const analyser = analyserRef.current
      const freqData = freqDataRef.current
      if (analyser && freqData && playingRef.current) {
        analyser.getByteFrequencyData(freqData)

        const { start, end } = bassRangeRef.current
        let bassEnergy = 0
        for (let i = start; i <= end; i++) {
          bassEnergy += freqData[i]
        }
        const binCount = end - start + 1
        const normalized = bassEnergy / (binCount * 255)

        scrollState.beatIntensity = lerp(scrollState.beatIntensity, normalized, 0.25)

        const history = fluxHistoryRef.current
        history.push(normalized)
        if (history.length > FLUX_HISTORY_SIZE) history.shift()

        if (history.length > 10) {
          const mean = history.reduce((a, b) => a + b) / history.length
          const variance = history.reduce((a, b) => a + (b - mean) ** 2, 0) / history.length
          const threshold = mean + Math.sqrt(variance) * BEAT_THRESHOLD_MULT

          if (normalized > threshold && now - lastBeatRef.current > BEAT_COOLDOWN_MS) {
            lastBeatRef.current = now
            scrollState.beatPulse = Math.min(1, (normalized - mean) / (1 - mean + 0.01))
          }
          const rippleThreshold = mean + Math.sqrt(variance) * 3.0
          if (normalized > rippleThreshold && now - lastRippleRef.current > 1200) {
            lastRippleRef.current = now
            scrollState.rippleAges[scrollState.rippleIdx] = 0
            scrollState.rippleIntensities[scrollState.rippleIdx] = scrollState.rippleIdx % 2 === 0 ? 1.0 : 0.35
            scrollState.rippleIdx = (scrollState.rippleIdx + 1) % 12
          }
        }
      }

      // Update progress & times
      if (playingRef.current) {
        const currentAudio = audiosRef.current[indexRef.current]
        if (currentAudio && currentAudio.duration && isFinite(currentAudio.duration)) {
          setProgress(currentAudio.currentTime / currentAudio.duration)
          setCurrentTime(currentAudio.currentTime)
          setDuration(currentAudio.duration)
        }
      }

      scrollState.beatPulse *= 0.88
      if (!playingRef.current) {
        scrollState.beatIntensity *= 0.95
        scrollState.beatPulse *= 0.9
      }

      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  /* ── Toggle play/pause ─────────────────────────────── */
  const toggle = useCallback(() => {
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume()
    }
    const next = !playingRef.current
    playingRef.current = next
    scrollState.isPlaying = next
    setIsPlaying(next)
    if (next) {
      gainsRef.current[indexRef.current].gain.value = volumeRef.current
      audiosRef.current[indexRef.current].play().catch(() => {})
    } else {
      audiosRef.current.forEach(a => a.pause())
    }
  }, [])

  /* ── Auto-advance when song ends ──────────────────── */
  useEffect(() => {
    const handlers = audiosRef.current.map((audio, i) => {
      const onEnded = () => {
        if (i < SONGS.length - 1) {
          // Scroll to next section — rAF loop handles song switching
          const candidates = document.querySelectorAll('div')
          for (const el of candidates) {
            if (el.scrollHeight > el.clientHeight * 2 && el.style.overflow) {
              const targetOffset = (i + 1 + 0.1) / 5
              el.scrollTo({ top: targetOffset * (el.scrollHeight - el.clientHeight), behavior: 'smooth' })
              break
            }
          }
        }
      }
      audio.addEventListener('ended', onEnded)
      return onEnded
    })
    return () => {
      audiosRef.current.forEach((audio, i) => audio.removeEventListener('ended', handlers[i]))
    }
  }, [])

  /* ── Scroll to section center ──────────────────────── */
  const scrollToSection = useCallback((sectionIdx: number) => {
    // drei's ScrollControls creates a fixed div with overflow — find it
    const candidates = document.querySelectorAll('div')
    for (const el of candidates) {
      if (el.scrollHeight > el.clientHeight * 2 && el.style.overflow) {
        const targetOffset = (sectionIdx + 0.1) / 5
        el.scrollTo({ top: targetOffset * (el.scrollHeight - el.clientHeight), behavior: 'smooth' })
        return
      }
    }
  }, [])

  /* ── Next / Prev — just scroll, rAF loop handles the rest ── */
  const nextTrack = useCallback(() => {
    const current = Math.round(scrollState.offset * SONGS.length - 0.5)
    const next = Math.min(current + 1, SONGS.length - 1)
    if (next === current) return
    scrollToSection(next)
  }, [scrollToSection])

  const prevTrack = useCallback(() => {
    const current = Math.round(scrollState.offset * SONGS.length - 0.5)
    const prev = Math.max(current - 1, 0)
    if (prev === current) return
    scrollToSection(prev)
  }, [scrollToSection])

  /* ── Seek ──────────────────────────────────────────── */
  const seek = useCallback((pct: number) => {
    const audio = audiosRef.current[indexRef.current]
    if (audio && audio.duration && isFinite(audio.duration)) {
      audio.currentTime = pct * audio.duration
      setProgress(pct)
      setCurrentTime(audio.currentTime)
    }
  }, [])

  /* ── Freq data reader for ScalesMixer ──────────────── */
  const getFreqData = useCallback((): Uint8Array | null => {
    const analyser = analyserRef.current
    const data = freqDataRef.current
    if (!analyser || !data) return null
    analyser.getByteFrequencyData(data)
    return data
  }, [])

  const songColor = SONGS[songIndex].color

  return (
    <>
    {/* ── Desktop player ── */}
    <div className="mp-wrapper mp-desktop">
      {/* Links expander */}
      <button
        className="mp-links-tab"
        onClick={() => setLinksOpen(o => !o)}
        aria-label="Toggle links"
      >
        <div className={`mp-links-tray ${linksOpen ? 'mp-links-open' : ''}`}>
          <a href="https://tiktok.com/@isaac_drowns" target="_blank" rel="noopener noreferrer" className="mp-link-icon" aria-label="TikTok" onClick={e => e.stopPropagation()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.3 5.3a4.8 4.8 0 0 1-3-1.6 4.7 4.7 0 0 1-1-2.7h-3.6v13.7a2.9 2.9 0 0 1-2.9 2.7 2.9 2.9 0 0 1-2.9-2.9 2.9 2.9 0 0 1 2.9-2.9c.3 0 .6 0 .9.1V8a6.5 6.5 0 0 0-.9-.1 6.5 6.5 0 0 0-6.5 6.5A6.5 6.5 0 0 0 8.8 21a6.5 6.5 0 0 0 6.5-6.5V8.4a8.3 8.3 0 0 0 4.8 1.5V6.3a4.9 4.9 0 0 1-.8-1z"/></svg>
          </a>
          <a href="/" className="mp-link-icon mp-link-cube" aria-label="isaacrozsa.com" onClick={e => e.stopPropagation()}>
            <svg width="20" height="20" viewBox="0 0 32 32"><defs><linearGradient id="ct" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#7f1d1d"/><stop offset="100%" stopColor="#5b1414"/></linearGradient><linearGradient id="cl" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#450a0a"/><stop offset="100%" stopColor="#1a0404"/></linearGradient><linearGradient id="cr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5b1414"/><stop offset="100%" stopColor="#2a0606"/></linearGradient></defs><polygon points="16,4 28,10 16,16 4,10" fill="url(#ct)"/><polygon points="4,10 16,16 16,28 4,22" fill="url(#cl)"/><polygon points="16,16 28,10 28,22 16,28" fill="url(#cr)"/></svg>
          </a>
          <a href="/arrhythmia" className="mp-link-icon" aria-label="Arrythmia" onClick={e => e.stopPropagation()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><polygon points="12,4 22,20 2,20" stroke="#2563eb" strokeWidth="1.5" fill="none"/><rect x="10" y="2" width="4" height="4" fill="white" stroke="#2563eb" strokeWidth="0.8"/><rect x="20" y="18" width="4" height="4" fill="white" stroke="#2563eb" strokeWidth="0.8"/><rect x="0" y="18" width="4" height="4" fill="white" stroke="#2563eb" strokeWidth="0.8"/></svg>
          </a>
          <a className="mp-link-icon" aria-label="SoundCloud" style={{ opacity: 0.3, cursor: 'default' }} onClick={e => { e.stopPropagation(); e.preventDefault(); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M1.2 14.3a.2.2 0 0 0-.2.2v3a.2.2 0 0 0 .4 0v-3a.2.2 0 0 0-.2-.2zm1.5-1.3a.2.2 0 0 0-.2.2v4.6a.2.2 0 0 0 .4 0v-4.6a.2.2 0 0 0-.2-.2zm1.5-1a.2.2 0 0 0-.2.2v5.6a.2.2 0 0 0 .4 0v-5.6a.2.2 0 0 0-.2-.2zm1.5.5a.2.2 0 0 0-.2.2v5.1a.2.2 0 0 0 .4 0v-5.1a.2.2 0 0 0-.2-.2zm1.5-2a.2.2 0 0 0-.2.2v7.1a.2.2 0 0 0 .4 0v-7.1a.2.2 0 0 0-.2-.2zm1.5-.5a.2.2 0 0 0-.2.2v7.6a.2.2 0 0 0 .4 0v-7.6a.2.2 0 0 0-.2-.2zM10.2 9a.2.2 0 0 0-.2.2v8.6a.2.2 0 0 0 .2.2h.1a4.5 4.5 0 0 0 0-.4V9.2a.2.2 0 0 0-.1-.2zm1.5-.5c-.1 0-.2.1-.2.2v9.1c0 .1.1.2.2.2h9.8a2.5 2.5 0 0 0 0-5 2.5 2.5 0 0 0-.6.1 4 4 0 0 0-4-3.6 4 4 0 0 0-1.4.3V8.7a.2.2 0 0 0-.3-.2z"/></svg>
          </a>
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: linksOpen ? 'rotate(180deg)' : '', transition: 'transform 0.3s ease' }}
        >
          <path d="M18 15l-6-6-6 6"/>
        </svg>
      </button>

    <div className="mp-card">
      {/* Large disc area filling top of card */}
      <div className="mp-disc-area" style={{ background: `linear-gradient(180deg, ${songColor}90 0%, ${songColor}20 60%, transparent 100%)` }}>
        <Disc color={songColor} isPlaying={isPlaying} />
        <ScalesMixer getFreqData={getFreqData} color={songColor} isPlaying={isPlaying} />
      </div>

      {/* Card body */}
      <div className="mp-body">
      <div className="mp-info">
        <AnimatePresence mode="wait">
          <motion.span
            key={songIndex}
            className="mp-title"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {SONGS[songIndex].title}
          </motion.span>
        </AnimatePresence>
        <span className="mp-artist">Isaac Rozsa</span>
      </div>

      {/* Progress bar */}
      <div className="mp-progress-wrap">
        <span className="mp-time">{formatTime(currentTime)}</span>
        <div
          className="mp-bar"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
            seek(pct)
          }}
        >
          <div
            className="mp-bar-fill"
            style={{
              width: `${progress * 100}%`,
              backgroundColor: songColor,
            }}
          />
          <div
            className="mp-bar-thumb"
            style={{
              left: `${progress * 100}%`,
              borderColor: songColor,
            }}
          />
        </div>
        <span className="mp-time">{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className="mp-controls">
        <button
          className="mp-ctrl mp-ctrl-sm"
          onClick={prevTrack}
          disabled={songIndex <= 0}
          aria-label="Previous track"
          style={{ opacity: songIndex <= 0 ? 0.2 : undefined, cursor: songIndex <= 0 ? 'default' : undefined }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
          </svg>
        </button>

        <button
          className="mp-ctrl mp-ctrl-play"
          onClick={toggle}
          aria-label={isPlaying ? 'Pause music' : 'Play music'}
          style={{
            borderColor: `${songColor}50`,
            boxShadow: isPlaying ? `0 0 16px ${songColor}30` : 'none',
          }}
        >
          <AnimatePresence mode="wait">
            {isPlaying ? (
              <motion.svg
                key="pause"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.15 }}
                width={18} height={18} viewBox="0 0 24 24" fill="currentColor"
              >
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </motion.svg>
            ) : (
              <motion.svg
                key="play"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.15 }}
                width={18} height={18} viewBox="0 0 24 24" fill="currentColor"
              >
                <path d="M8 5v14l11-7z" />
              </motion.svg>
            )}
          </AnimatePresence>
        </button>

        <button
          className="mp-ctrl mp-ctrl-sm"
          onClick={nextTrack}
          disabled={songIndex >= SONGS.length - 1}
          aria-label="Next track"
          style={{ opacity: songIndex >= SONGS.length - 1 ? 0.2 : undefined, cursor: songIndex >= SONGS.length - 1 ? 'default' : undefined }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>
      </div>

      {/* Volume */}
      <div className="mp-volume">
        <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor" className="mp-vol-icon">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
        </svg>
        <input
          type="range"
          className="mp-vol-slider"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            setVolume(v)
            volumeRef.current = v
          }}
          style={{
            background: `linear-gradient(to right, ${songColor} ${volume * 100}%, rgba(255,255,255,0.12) ${volume * 100}%)`,
          }}
        />
      </div>
      </div>
    </div>
    </div>

    {/* ── Mobile player ── */}
    <div className={`mp-mobile-wrap mp-mobile-container ${mobileOpen ? 'mp-mobile-expanded' : 'mp-mobile-collapsed'}`}>
      <button className="mp-mobile-tab" onClick={() => setMobileOpen(o => !o)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 14 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 2.5,
              borderRadius: 1,
              backgroundColor: songColor,
              transition: 'height 0.15s ease',
              height: isPlaying ? `${6 + Math.sin(Date.now() / 200 + i * 2) * 5}px` : '4px',
              animation: isPlaying ? `mp-bar-bounce 0.6s ease-in-out ${i * 0.15}s infinite alternate` : 'none',
            }} />
          ))}
        </div>
        <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{SONGS[songIndex].title}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ marginLeft: 'auto', transform: mobileOpen ? 'rotate(180deg)' : '', transition: 'transform 0.3s ease', opacity: 0.4 }}>
          <path d="M18 15l-6-6-6 6"/>
        </svg>
      </button>

      <div className={`mp-mobile-body ${mobileOpen ? 'mp-mobile-body-open' : ''}`}>
        <div className="mp-bar" style={{ width: '100%' }} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); seek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))) }}>
          <div className="mp-bar-fill" style={{ width: `${progress * 100}%`, backgroundColor: songColor }} />
        </div>
        <div className="mp-controls">
          <button className="mp-ctrl mp-ctrl-sm" onClick={prevTrack} disabled={songIndex <= 0} style={{ opacity: songIndex <= 0 ? 0.2 : undefined, width: 40, height: 40 }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg>
          </button>
          <button className="mp-ctrl" onClick={toggle} style={{ width: 44, height: 44, color: songColor }}>
            {isPlaying ? <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
              : <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
          </button>
          <button className="mp-ctrl mp-ctrl-sm" onClick={nextTrack} disabled={songIndex >= SONGS.length - 1} style={{ opacity: songIndex >= SONGS.length - 1 ? 0.2 : undefined, width: 40, height: 40 }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
          </button>
        </div>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
          <a href="https://tiktok.com/@isaac_drowns" target="_blank" rel="noopener noreferrer" className="mp-link-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.3 5.3a4.8 4.8 0 0 1-3-1.6 4.7 4.7 0 0 1-1-2.7h-3.6v13.7a2.9 2.9 0 0 1-2.9 2.7 2.9 2.9 0 0 1-2.9-2.9 2.9 2.9 0 0 1 2.9-2.9c.3 0 .6 0 .9.1V8a6.5 6.5 0 0 0-.9-.1 6.5 6.5 0 0 0-6.5 6.5A6.5 6.5 0 0 0 8.8 21a6.5 6.5 0 0 0 6.5-6.5V8.4a8.3 8.3 0 0 0 4.8 1.5V6.3a4.9 4.9 0 0 1-.8-1z"/></svg></a>
          <a href="/" className="mp-link-icon mp-link-cube"><svg width="22" height="22" viewBox="0 0 32 32"><defs><linearGradient id="mct" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#7f1d1d"/><stop offset="100%" stopColor="#5b1414"/></linearGradient><linearGradient id="mcl" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#450a0a"/><stop offset="100%" stopColor="#1a0404"/></linearGradient><linearGradient id="mcr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5b1414"/><stop offset="100%" stopColor="#2a0606"/></linearGradient></defs><polygon points="16,4 28,10 16,16 4,10" fill="url(#mct)"/><polygon points="4,10 16,16 16,28 4,22" fill="url(#mcl)"/><polygon points="16,16 28,10 28,22 16,28" fill="url(#mcr)"/></svg></a>
          <a href="/arrhythmia" className="mp-link-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><polygon points="12,4 22,20 2,20" stroke="#2563eb" strokeWidth="1.5" fill="none"/><rect x="10" y="2" width="4" height="4" fill="white" stroke="#2563eb" strokeWidth="0.8"/><rect x="20" y="18" width="4" height="4" fill="white" stroke="#2563eb" strokeWidth="0.8"/><rect x="0" y="18" width="4" height="4" fill="white" stroke="#2563eb" strokeWidth="0.8"/></svg></a>
          <a className="mp-link-icon" style={{ opacity: 0.3, cursor: 'default' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M1.2 14.3a.2.2 0 0 0-.2.2v3a.2.2 0 0 0 .4 0v-3a.2.2 0 0 0-.2-.2zm1.5-1.3a.2.2 0 0 0-.2.2v4.6a.2.2 0 0 0 .4 0v-4.6a.2.2 0 0 0-.2-.2zm1.5-1a.2.2 0 0 0-.2.2v5.6a.2.2 0 0 0 .4 0v-5.6a.2.2 0 0 0-.2-.2zm1.5.5a.2.2 0 0 0-.2.2v5.1a.2.2 0 0 0 .4 0v-5.1a.2.2 0 0 0-.2-.2zm1.5-2a.2.2 0 0 0-.2.2v7.1a.2.2 0 0 0 .4 0v-7.1a.2.2 0 0 0-.2-.2zm1.5-.5a.2.2 0 0 0-.2.2v7.6a.2.2 0 0 0 .4 0v-7.6a.2.2 0 0 0-.2-.2zM10.2 9a.2.2 0 0 0-.2.2v8.6a.2.2 0 0 0 .2.2h.1a4.5 4.5 0 0 0 0-.4V9.2a.2.2 0 0 0-.1-.2zm1.5-.5c-.1 0-.2.1-.2.2v9.1c0 .1.1.2.2.2h9.8a2.5 2.5 0 0 0 0-5 2.5 2.5 0 0 0-.6.1 4 4 0 0 0-4-3.6 4 4 0 0 0-1.4.3V8.7a.2.2 0 0 0-.3-.2z"/></svg></a>
        </div>
      </div>
    </div>
    </>
  )
}
