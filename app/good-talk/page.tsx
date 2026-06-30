'use client'
import { useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { ScrollControls, Environment } from '@react-three/drei'
import { EffectComposer, DepthOfField, Bloom } from '@react-three/postprocessing'
import { Suspense } from 'react'
import { CameraRig } from '@/components/good-talk/CameraRig'
import { UnifiedModelField } from '@/components/good-talk/UnifiedModelField'
import { LightThread } from '@/components/good-talk/LightThread'
import { MusicPlayer } from '@/components/good-talk/MusicPlayer'
import { AuroraBackground } from '@/components/good-talk/AuroraBackground'
import { RozsaText } from '@/components/good-talk/RozsaText'
import { LoadingScreen } from '@/components/good-talk/LoadingScreen'
import { scrollState } from '@/lib/good-talk/scrollState'

type RGB = [number, number, number]

const GRADIENT_STOPS: { offset: number; top: RGB; bottom: RGB }[] = [
  // Section 0: White/light (Out is Through, 0-20%)
  { offset: 0.0,  top: [230, 230, 240], bottom: [215, 220, 235] },
  { offset: 0.16, top: [225, 225, 235], bottom: [210, 215, 230] },
  // Transition
  { offset: 0.22, top: [100, 100, 110], bottom: [50, 50, 60] },
  // Section 1: Black (Is Your Heart Big Enough, 20-40%)
  { offset: 0.25, top: [25, 25, 30],    bottom: [15, 15, 20] },
  { offset: 0.36, top: [20, 20, 25],    bottom: [12, 12, 18] },
  // Transition
  { offset: 0.42, top: [80, 30, 50],    bottom: [100, 40, 60] },
  // Section 2: Pink (Sincerity, 40-60%)
  { offset: 0.45, top: [200, 70, 110],  bottom: [180, 55, 95] },
  { offset: 0.56, top: [195, 65, 105],  bottom: [175, 50, 90] },
  // Transition
  { offset: 0.62, top: [210, 100, 80],  bottom: [200, 85, 70] },
  // Section 3: Sunset orange (Where's My Dignity Now, 60-80%)
  { offset: 0.66, top: [220, 100, 45],  bottom: [200, 80, 40] },
  { offset: 0.76, top: [215, 90, 40],   bottom: [195, 75, 35] },
  // Transition
  { offset: 0.82, top: [130, 50, 100],  bottom: [90, 30, 80] },
  // Section 4: Dark purple (Good Talk, 80-100%)
  { offset: 0.86, top: [60, 15, 80],    bottom: [40, 10, 60] },
  { offset: 0.95, top: [30, 10, 50],    bottom: [20, 8, 35] },
  { offset: 1.0,  top: [15, 20, 40],    bottom: [10, 14, 26] },
]

function mixRGB(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

function rgbStr(c: RGB, boost: number = 0): string {
  return `rgb(${Math.min(255, c[0] + boost)},${Math.min(255, c[1] + boost)},${Math.min(255, c[2] + boost)})`
}

function getBackground(offset: number, beatBoost: number = 0): string {
  const stops = GRADIENT_STOPS
  let idx = 0
  for (let i = 0; i < stops.length - 1; i++) {
    if (offset <= stops[i + 1].offset) { idx = i; break }
    if (i === stops.length - 2) idx = i
  }

  const t = (offset - stops[idx].offset) / (stops[idx + 1].offset - stops[idx].offset)
  const curTop = mixRGB(stops[idx].top, stops[idx + 1].top, t)
  const curBot = mixRGB(stops[idx].bottom, stops[idx + 1].bottom, t)

  // Peek ahead to next stop for the hint color at the bottom
  const nextIdx = Math.min(idx + 2, stops.length - 1)
  const peekTop = stops[nextIdx].top
  const hintColor = mixRGB(curBot, peekTop, 0.25)

  return `linear-gradient(to bottom, ${rgbStr(curTop, beatBoost)} 0%, ${rgbStr(curBot, beatBoost)} 65%, ${rgbStr(hintColor, beatBoost)} 100%)`
}

export default function Page() {
  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        background: '#000',
      }}
    >
      <Canvas camera={{ position: [0, 0, 0], fov: 50 }} style={{ position: 'relative', zIndex: 2 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 3]} intensity={1.0} color="#ffe0c0" />
        <directionalLight position={[-3, 2, -5]} intensity={0.3} color="#c0d0ff" />
        <ScrollControls pages={5} damping={0.2}>
          <CameraRig />
          <Suspense fallback={null}>
            <UnifiedModelField />
          </Suspense>
          <LightThread />
          <EffectComposer>
            <DepthOfField focusDistance={0} focalLength={0.02} bokehScale={2} height={480} />
            <Bloom luminanceThreshold={1.2} luminanceSmoothing={0.3} intensity={0.6} />
          </EffectComposer>
        </ScrollControls>
      </Canvas>
      <LoadingScreen />
      <div className="bg-r-logo">r</div>
      <AuroraBackground />
      <MusicPlayer />
      <RozsaText />
    </div>
  )
}
