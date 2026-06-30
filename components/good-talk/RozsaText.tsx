'use client'
import { useRef, useEffect, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '@/lib/good-talk/scrollState'

const smokeState = { revealHeight: 0, wasVisible: false, fadeStart: 0 }

function createNoiseTexture(size = 256): THREE.DataTexture {
  const perm = new Uint8Array(512)
  const p = new Uint8Array(256)
  for (let i = 0; i < 256; i++) p[i] = i
  let seed = 42
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = p[i]; p[i] = p[j]; p[j] = tmp
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]

  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
  const lerp = (a: number, b: number, t: number) => a + t * (b - a)
  const gradFn = (hash: number, x: number, y: number) => {
    const h = hash & 3
    const u = h < 2 ? x : y
    const v = h < 2 ? y : x
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v)
  }

  const perlin = (x: number, y: number) => {
    const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255
    const xf = x - Math.floor(x), yf = y - Math.floor(y)
    const u = fade(xf), v = fade(yf)
    const aa = perm[perm[xi] + yi], ab = perm[perm[xi] + yi + 1]
    const ba = perm[perm[xi + 1] + yi], bb = perm[perm[xi + 1] + yi + 1]
    return lerp(
      lerp(gradFn(aa, xf, yf), gradFn(ba, xf - 1, yf), u),
      lerp(gradFn(ab, xf, yf - 1), gradFn(bb, xf - 1, yf - 1), u),
      v
    )
  }

  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let val = 0, amp = 1, freq = 4, maxAmp = 0
      for (let o = 0; o < 5; o++) {
        val += perlin(x / size * freq, y / size * freq) * amp
        maxAmp += amp
        amp *= 0.5
        freq *= 2
      }
      val = (val / maxAmp + 1) * 0.5
      const idx = (y * size + x) * 4
      const byte = Math.floor(Math.min(1, Math.max(0, val)) * 255)
      data[idx] = byte; data[idx + 1] = byte; data[idx + 2] = byte; data[idx + 3] = 255
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearFilter
  tex.needsUpdate = true
  return tex
}

const smokeVertexShader = `
  uniform float uTime;
  uniform float uTwistStrength;
  uniform float uTexOffset;
  varying vec2 vUv;

  vec2 rotate2D(vec2 v, float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, s, -s, c) * v;
  }

  void main() {
    vUv = uv;
    vec3 pos = position;

    float taper = 0.3 + 0.7 * smoothstep(0.0, 0.6, uv.y);
    pos.x *= taper;

    pos.x += sin(uTime * 0.08 + uTexOffset * 3.0) * 0.05 * uv.y;

    float twist = sin(uv.y * 4.0 - uTime * 0.2 + uTexOffset * 6.283) * 0.6
                + sin(uv.y * 7.0 + uTime * 0.12 + uTexOffset * 3.14) * 0.4;
    float angle = twist * uTwistStrength * smoothstep(0.0, 0.4, uv.y);
    pos.xz = rotate2D(pos.xz, angle);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const smokeFragmentShader = `
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uTexOffset;
  uniform float uRemapLow;
  uniform float uRemapHigh;
  uniform float uEdgeX;
  uniform float uEdgeY;
  uniform float uRevealHeight;
  varying vec2 vUv;

  void main() {
    vec2 texUv = vUv;
    texUv.x *= 0.5;
    texUv.x += uTexOffset;
    texUv.y *= 1.5;
    texUv.y -= uTime * uSpeed;

    float noise = texture2D(uTexture, texUv).r;
    noise = smoothstep(uRemapLow, uRemapHigh, noise);

    float fade = smoothstep(0.0, uEdgeX, vUv.x);
    fade *= smoothstep(1.0, 1.0 - uEdgeX, vUv.x);
    fade *= smoothstep(0.0, uEdgeY, vUv.y);
    fade *= smoothstep(1.0, 1.0 - uEdgeY, vUv.y);

    float heightFade = 1.0 - smoothstep(0.4, 1.0, vUv.y) * 0.5;

    float reveal = smoothstep(uRevealHeight, uRevealHeight - 0.2, vUv.y);
    float alpha = noise * fade * heightFade * 0.6 * reveal;

    float warmth = smoothstep(0.25, 0.0, vUv.y);
    vec3 color = mix(vec3(0.62, 0.62, 0.64), vec3(0.75, 0.65, 0.55), warmth * 0.3);

    gl_FragColor = vec4(color, alpha);
  }
`

const SMOKE_PLANES = [
  { rotY: 0, z: 0, scaleX: 1.0, speed: 0.06, texOffset: 0 },
  { rotY: Math.PI * 0.3, z: 0.02, scaleX: 0.85, speed: 0.045, texOffset: 0.33 },
  { rotY: -Math.PI * 0.25, z: -0.02, scaleX: 0.9, speed: 0.07, texOffset: 0.66 },
]

function SmokeEffect() {
  const noiseTexture = useMemo(() => createNoiseTexture(256), [])

  const uniformSets = useMemo(() => SMOKE_PLANES.map(p => ({
    uTexture: { value: noiseTexture },
    uTime: { value: 0 },
    uSpeed: { value: p.speed },
    uRemapLow: { value: 0.35 },
    uRemapHigh: { value: 0.65 },
    uEdgeX: { value: 0.35 },
    uEdgeY: { value: 0.15 },
    uTwistStrength: { value: 1.2 },
    uTexOffset: { value: p.texOffset },
    uRevealHeight: { value: 0 },
  })), [noiseTexture])

  useFrame((state) => {
    for (const u of uniformSets) {
      u.uTime.value = state.clock.elapsedTime
      u.uRevealHeight.value = smokeState.revealHeight
    }
  })

  return (
    <group>
      {SMOKE_PLANES.map((p, i) => (
        <mesh key={i} rotation={[0, p.rotY, 0]} position={[0, 0, p.z]}>
          <planeGeometry args={[0.7 * p.scaleX, 1.7, 1, 32]} />
          <shaderMaterial
            vertexShader={smokeVertexShader}
            fragmentShader={smokeFragmentShader}
            uniforms={uniformSets[i]}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}

function MatchstickModel() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { nodes, materials } = useGLTF('/good-talk/Matchstick.glb') as any
  const headRef = useRef<THREE.MeshStandardMaterial>(null)

  useFrame((state) => {
    if (headRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.5 + 0.5
      headRef.current.emissiveIntensity = 0.8 + pulse * 1.5
    }
  })

  return (
    <group
      rotation={[0, Math.PI / 2, 0.1]}
      scale={0.2}
      position={[-0.65, 0, 0]}
    >
      <mesh geometry={nodes['Node-Mesh'].geometry}>
        <meshStandardMaterial {...materials.lambert2SG} />
      </mesh>
      <mesh geometry={nodes['Node-Mesh_1'].geometry}>
        <meshStandardMaterial
          ref={headRef}
          {...materials.lambert3SG}
          emissive={new THREE.Color('#ff4500')}
          emissiveIntensity={1.2}
        />
      </mesh>
      <pointLight position={[0, 0, -1]} color="#ff4500" intensity={3} distance={5} />
    </group>
  )
}

export function RozsaText() {
  const cardRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const coverRef = useRef<HTMLDivElement>(null)
  const matchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let rafId: number
    function tick() {
      const offset = scrollState.offset

      // Card: zooms in
      if (cardRef.current) {
        const t = Math.max(0, Math.min(1, (offset - 0.68) / 0.32))
        const scale = 0.03 + 0.97 * t * t
        const fadeT = Math.max(0, Math.min(1, (offset - 0.78) / 0.15))
        const opacity = fadeT * fadeT
        cardRef.current.style.opacity = String(opacity)
        cardRef.current.style.transform = `scale(${scale})`
      }

      // Overlay (cover + matchstick): no scale, just fade
      if (overlayRef.current) {
        const show = offset > 0.94 ? 1 : 0
        overlayRef.current.style.visibility = show ? 'visible' : 'hidden'
      }

      // Cover: fades in at 95%, falls to position 96-100%
      if (coverRef.current) {
        const fadeIn = Math.max(0, Math.min(1, (offset - 0.95) / 0.02))
        const fallT = Math.max(0, Math.min(1, (offset - 0.96) / 0.04))
        const eased = fallT * fallT * (3 - 2 * fallT)

        const x = 20 + (-80 - 20) * eased
        const y = -60 + (-10 + 60) * eased
        const rot = -8 * eased
        const rotX = -8 * eased
        const rotY = 6 * eased

        coverRef.current.style.opacity = String(fadeIn)
        coverRef.current.style.transform = `perspective(400px) translate(${x}px, ${y}px) rotate(${rot}deg) rotateX(${rotX}deg) rotateY(${rotY}deg)`
      }

      // Matchstick: fades in at 99-100%
      if (matchRef.current) {
        const matchFade = Math.max(0, Math.min(1, (offset - 0.99) / 0.01))
        matchRef.current.style.opacity = String(matchFade)
      }

      // Smoke ease-in: ramp over 2s each time match appears
      const matchVisible = offset > 0.99
      const now = performance.now() / 1000
      if (matchVisible && !smokeState.wasVisible) {
        smokeState.fadeStart = now
      }
      smokeState.wasVisible = matchVisible
      if (matchVisible) {
        const raw = Math.min(1, (now - smokeState.fadeStart) / 4.0)
        smokeState.revealHeight = raw * 1.2
      } else {
        smokeState.revealHeight = 0
      }

      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <>
      {/* Rozsa card — scales/zooms in */}
      <div
        ref={cardRef}
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 1,
          opacity: 0,
        }}
      >
        <div className="rozsa-fur-card">
          <div className="rozsa-fur-texture" />
          <h1 className="rozsa-title">rozsa</h1>
        </div>
      </div>

      {/* Cover + matchstick — no scale, positioned to overlap the card */}
      <div
        ref={overlayRef}
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 1,
          visibility: 'hidden',
        }}
      >
        <div style={{ position: 'relative' }}>
          {/* Invisible spacer matching fur card size */}
          <div style={{ padding: '40px 60px', visibility: 'hidden' }}>
            <span style={{ fontSize: 'clamp(3rem, 12vw, 8rem)' }}>rozsa</span>
          </div>

          {/* Cover image */}
          <div
            ref={coverRef}
            style={{
              position: 'absolute',
              top: -40,
              left: -50,
              width: 170,
              height: 170,
              opacity: 0,
              borderRadius: 4,
              boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
              zIndex: 3,
              pointerEvents: 'none',
              transformOrigin: 'top left',
              overflow: 'hidden',
            }}
          >
            <img
              src="/good-talk/good-talk-cover.png"
              alt="Good Talk"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <div style={{
              position: 'absolute',
              inset: 0,
              mixBlendMode: 'screen',
              opacity: 0.8,
              pointerEvents: 'none',
            }}>
              <img
                src="/good-talk/plastic-wrap.jpg"
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>

          {/* 3D Matchstick + Smoke */}
          <div
            ref={matchRef}
            style={{
              position: 'absolute',
              top: -40,
              left: -30,
              width: 200,
              zIndex: 4,
              opacity: 0,
              pointerEvents: 'none',
            }}
          >
            {/* Smoke wisps rising above matchstick */}
            <div style={{ position: 'absolute', top: -170, left: -10, width: 90, height: 200 }}>
              <Canvas camera={{ position: [0, 0, 2], fov: 50 }} gl={{ alpha: true }} style={{ width: '100%', height: '100%' }}>
                <SmokeEffect />
              </Canvas>
            </div>
            {/* Matchstick */}
            <div style={{ width: 200, height: 50 }}>
              <Canvas camera={{ position: [0, 0, 2], fov: 16 }} gl={{ alpha: true }} style={{ width: '100%', height: '100%' }}>
                <ambientLight intensity={0.6} />
                <directionalLight position={[2, 3, 2]} intensity={0.8} />
                <MatchstickModel />
              </Canvas>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
