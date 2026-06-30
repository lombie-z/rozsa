'use client'
import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '@/lib/good-talk/scrollState'

const SECTION_COLORS = [
  new THREE.Color('#E0E0E8'),
  new THREE.Color('#333333'),
  new THREE.Color('#EC407A'),
  new THREE.Color('#FF7043'),
  new THREE.Color('#AB47BC'),
]

function getSectionColor(offset: number, target: THREE.Color) {
  const raw = offset * 5
  const idx = Math.max(0, Math.min(Math.floor(raw), 4))
  const nextIdx = Math.min(idx + 1, 4)
  const t = raw - idx
  // Hold color for 70% of each section, transition in the last 30%
  const blendT = Math.max(0, (t - 0.7) / 0.3)
  target.copy(SECTION_COLORS[idx]).lerp(SECTION_COLORS[nextIdx], blendT)
}

function organicXY(z: number): [number, number] {
  const t = -z / 80
  return [
    3.5 * Math.sin(t * Math.PI * 6) + 1.5 * Math.sin(t * Math.PI * 3 + 0.7) + 1.0 * Math.cos(t * Math.PI * 10 + 2.0),
    2.8 * Math.cos(t * Math.PI * 5 + 1.0) + 1.3 * Math.sin(t * Math.PI * 8 + 0.3) + 0.7 * Math.sin(t * Math.PI * 14 + 1.5),
  ]
}

function generateCurve() {
  const points: THREE.Vector3[] = []
  const scale = 0.8

  // ── Lead-in: starts far off-screen, sweeps into organic curve ──
  points.push(new THREE.Vector3(15 * scale, -3 * scale, 10))
  points.push(new THREE.Vector3(12 * scale, -2 * scale, 6))
  points.push(new THREE.Vector3(8 * scale, -0.5 * scale, 2))
  points.push(new THREE.Vector3(4 * scale, 0.2 * scale, -2))
  points.push(new THREE.Vector3(1 * scale, 0.15 * scale, -5))
  points.push(new THREE.Vector3(-0.5 * scale, 0.1 * scale, -8))

  // ── Organic path from lead-in to arrows ──
  // Run the organic curve from Z=-9 to Z=-17.75 (where arrow 1 back starts)
  for (let i = 0; i < 50; i++) {
    const z = -9 - (i / 49) * 8.75 // Z from -9 to -17.75
    const [ox, oy] = organicXY(z)
    points.push(new THREE.Vector3(ox, oy, z))
  }

  // ── Arrow 1: V chevron centered on organic path, tip at Z=-19.25 ──
  // Placed at Z=-17.75 to -19.25 where |dY/dZ| ~ 0.86–1.23 (steep slope)
  const s = scale
  {
    // Left arm: 3 clustered points at back-left
    const [cx1, cy1] = organicXY(-17.75)
    points.push(new THREE.Vector3(cx1 + -0.65 * s, cy1 + 0.08 * s, -17.75))
    points.push(new THREE.Vector3(cx1 + -0.65 * s, cy1 + 0.08 * s, -17.76))
    points.push(new THREE.Vector3(cx1 + -0.65 * s, cy1 + 0.08 * s, -17.77))
    // Descend to tip
    {
      const [cx, cy] = organicXY(-18.125)
      points.push(new THREE.Vector3(cx + -0.45 * s, cy + 0.04 * s, -18.125))
    }
    {
      const [cx, cy] = organicXY(-18.5)
      points.push(new THREE.Vector3(cx + -0.2 * s, cy + 0.02 * s, -18.5))
    }
    // Tip: 5 clustered points at the forward point
    {
      const [cx, cy] = organicXY(-19.25)
      points.push(new THREE.Vector3(cx + 0, cy + 0, -19.25))
      points.push(new THREE.Vector3(cx + 0, cy + 0, -19.26))
      points.push(new THREE.Vector3(cx + 0, cy + 0, -19.27))
      points.push(new THREE.Vector3(cx + 0, cy + 0, -19.26))
      points.push(new THREE.Vector3(cx + 0, cy + 0, -19.25))
    }
    // Right arm: mirror of left (ascending back)
    {
      const [cx, cy] = organicXY(-18.5)
      points.push(new THREE.Vector3(cx + 0.2 * s, cy + -0.02 * s, -18.5))
    }
    {
      const [cx, cy] = organicXY(-18.125)
      points.push(new THREE.Vector3(cx + 0.45 * s, cy + -0.04 * s, -18.125))
    }
    // 3 clustered points at back-right
    {
      const [cx, cy] = organicXY(-17.77)
      points.push(new THREE.Vector3(cx + 0.65 * s, cy + -0.08 * s, -17.77))
      points.push(new THREE.Vector3(cx + 0.65 * s, cy + -0.08 * s, -17.76))
      points.push(new THREE.Vector3(cx + 0.65 * s, cy + -0.08 * s, -17.75))
    }
  }

  // ── Connecting loop: sweeps back from right to left (Z=-17.75 to -19.75) ──
  {
    const [cx1, cy1] = organicXY(-18.35)
    points.push(new THREE.Vector3(cx1 + 0.5 * s, cy1 + 0, -18.35))
    const [cx2, cy2] = organicXY(-18.85)
    points.push(new THREE.Vector3(cx2 + 0.2 * s, cy2 + 0.05 * s, -18.85))
    const [cx3, cy3] = organicXY(-19.35)
    points.push(new THREE.Vector3(cx3 + -0.1 * s, cy3 + 0.08 * s, -19.35))
    const [cx4, cy4] = organicXY(-19.55)
    points.push(new THREE.Vector3(cx4 + -0.4 * s, cy4 + 0.06 * s, -19.55))
  }

  // ── Arrow 2: V chevron centered on organic path, tip at Z=-21.25 ──
  // Placed at Z=-19.75 to -21.25 where |dY/dZ| ~ 1.23–1.29 (steepest slope)
  {
    // Left arm: 3 clustered points at back-left
    const [cx1, cy1] = organicXY(-19.75)
    points.push(new THREE.Vector3(cx1 + -0.65 * s, cy1 + 0.08 * s, -19.75))
    points.push(new THREE.Vector3(cx1 + -0.65 * s, cy1 + 0.08 * s, -19.76))
    points.push(new THREE.Vector3(cx1 + -0.65 * s, cy1 + 0.08 * s, -19.77))
    // Descend to tip
    {
      const [cx, cy] = organicXY(-20.125)
      points.push(new THREE.Vector3(cx + -0.45 * s, cy + 0.04 * s, -20.125))
    }
    {
      const [cx, cy] = organicXY(-20.5)
      points.push(new THREE.Vector3(cx + -0.2 * s, cy + 0.02 * s, -20.5))
    }
    // Tip: 5 clustered points
    {
      const [cx, cy] = organicXY(-21.25)
      points.push(new THREE.Vector3(cx + 0, cy + 0, -21.25))
      points.push(new THREE.Vector3(cx + 0, cy + 0, -21.26))
      points.push(new THREE.Vector3(cx + 0, cy + 0, -21.27))
      points.push(new THREE.Vector3(cx + 0, cy + 0, -21.26))
      points.push(new THREE.Vector3(cx + 0, cy + 0, -21.25))
    }
    // Right arm: mirror
    {
      const [cx, cy] = organicXY(-20.5)
      points.push(new THREE.Vector3(cx + 0.2 * s, cy + -0.02 * s, -20.5))
    }
    {
      const [cx, cy] = organicXY(-20.125)
      points.push(new THREE.Vector3(cx + 0.45 * s, cy + -0.04 * s, -20.125))
    }
    // 3 clustered points at back-right
    {
      const [cx, cy] = organicXY(-19.77)
      points.push(new THREE.Vector3(cx + 0.65 * s, cy + -0.08 * s, -19.77))
      points.push(new THREE.Vector3(cx + 0.65 * s, cy + -0.08 * s, -19.76))
      points.push(new THREE.Vector3(cx + 0.65 * s, cy + -0.08 * s, -19.75))
    }
  }

  // ── Trail-out from arrow 2: transition back toward organic curve ──
  {
    const [cx1, cy1] = organicXY(-20.5)
    points.push(new THREE.Vector3(cx1 + 0.4 * s, cy1 + -0.05 * s, -20.5))
    const [cx2, cy2] = organicXY(-21.5)
    points.push(new THREE.Vector3(cx2 + 0.1 * s, cy2 + -0.1 * s, -21.5))
    const [cx3, cy3] = organicXY(-22.5)
    points.push(new THREE.Vector3(cx3 + 0, cy3 + -0.15 * s, -22.5))
  }

  // ── Blend zone ──
  const lastArrowPt = points[points.length - 1]
  const blendCount = 30
  for (let i = 1; i <= blendCount; i++) {
    const t = i / blendCount
    const ease = t * t * (3 - 2 * t)

    const z = -22.5 - t * 2.5 // Z from -22.5 to -25.0

    const tOrg = -z / 80
    const endT = Math.max(0, (tOrg - 0.85) / 0.15)
    const dropOff = endT * endT * 15
    const orgX =
      3.5 * Math.sin(tOrg * Math.PI * 6) +
      1.5 * Math.sin(tOrg * Math.PI * 3 + 0.7) +
      1.0 * Math.cos(tOrg * Math.PI * 10 + 2.0)
    const orgY =
      2.8 * Math.cos(tOrg * Math.PI * 5 + 1.0) +
      1.3 * Math.sin(tOrg * Math.PI * 8 + 0.3) +
      0.7 * Math.sin(tOrg * Math.PI * 14 + 1.5) -
      dropOff

    const x = THREE.MathUtils.lerp(lastArrowPt.x, orgX, ease)
    const y = THREE.MathUtils.lerp(lastArrowPt.y, orgY, ease)
    points.push(new THREE.Vector3(x, y, z))
  }

  // ── Part 2: Organic harmonic path (Z = -25 to Z = -80) ──
  const organicCount = 300
  for (let i = 0; i < organicCount; i++) {
    const z = -25.0 - (i / (organicCount - 1)) * 55 // Z from -25 to -80
    const t = -z / 80

    const endT = Math.max(0, (t - 0.85) / 0.15)
    const dropOff = endT * endT * 15

    const x =
      3.5 * Math.sin(t * Math.PI * 6) +
      1.5 * Math.sin(t * Math.PI * 3 + 0.7) +
      1.0 * Math.cos(t * Math.PI * 10 + 2.0)

    const y =
      2.8 * Math.cos(t * Math.PI * 5 + 1.0) +
      1.3 * Math.sin(t * Math.PI * 8 + 0.3) +
      0.7 * Math.sin(t * Math.PI * 14 + 1.5) -
      dropOff

    points.push(new THREE.Vector3(x, y, z))
  }

  return new THREE.CatmullRomCurve3(points)
}

const vertexShader = /* glsl */ `
  varying float vWorldZ;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldZ = worldPos.z;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

const fragmentShader = /* glsl */ `
  uniform float uCameraZ;
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uPlaying;
  uniform float uStartup;
  uniform float uBeatPulse;

  varying float vWorldZ;
  varying vec2 vUv;

  void main() {
    float ahead = vWorldZ - uCameraZ;

    // Grow-pulse: leading edge breathes forward
    float growPulse = sin(uTime * 0.35) * 1.5;

    // Thread gradually slows through second half — camera overtakes near end
    float endFactor = smoothstep(-30.0, -76.0, uCameraZ);
    float baseFront = mix(-20.0, -6.0, endFactor * endFactor);
    float frontDist = baseFront * uStartup;
    float frontEdge = frontDist + growPulse * (1.0 - endFactor) * uStartup;

    // Reveal zone
    float revealFade = smoothstep(frontEdge - 2.0, frontEdge + 3.0, ahead)
                     * (1.0 - smoothstep(-1.0, 4.0, ahead));

    // Fade at geometry end so it doesn't clip
    float geoEndFade = smoothstep(-80.0, -76.0, vWorldZ);

    // Radial glow — soft gaussian tube edge
    float radial = exp(-pow(abs(vUv.y - 0.5) * 2.0, 2.0) * 1.2);

    // Leading-edge shimmer
    float nearFront = 1.0 - smoothstep(frontEdge, frontEdge + 6.0, ahead);
    float shimmer = 1.0 + nearFront * sin(uTime * 5.0 + vWorldZ * 3.0) * 0.35;

    // Music pulse — gentle travelling wave when playing
    float pulse = 1.0 + uPlaying * sin(uTime * 3.0 + vWorldZ * 1.2) * 0.25;

    // Beat pulse: bright band that sweeps forward along the thread
    float pulsePos = ahead + (1.0 - uBeatPulse) * 25.0;
    float pulseBand = smoothstep(pulsePos - 4.0, pulsePos - 1.0, 0.0)
                    * (1.0 - smoothstep(pulsePos + 1.0, pulsePos + 4.0, 0.0));
    float beatBright = 1.0 + pulseBand * uBeatPulse * 2.5;

    float alpha = revealFade * radial * shimmer * pulse * geoEndFade * 1.0;
    if (alpha < 0.005) discard;

    gl_FragColor = vec4(uColor * 1.0 * beatBright, alpha * beatBright);
  }
`

export function LightThread() {
  const tmpColor = useMemo(() => new THREE.Color(), [])

  const { geometry, material } = useMemo(() => {
    const curve = generateCurve()
    const geo = new THREE.TubeGeometry(curve, 800, 0.07, 8, false)

    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uCameraZ: { value: 0 },
        uColor: { value: new THREE.Color('#FFB74D') },
        uTime: { value: 0 },
        uPlaying: { value: 0 },
        uStartup: { value: 0 },
        uBeatPulse: { value: 0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })

    return { geometry: geo, material: mat }
  }, [])

  useFrame((state, delta) => {
    const u = material.uniforms
    u.uCameraZ.value = state.camera.position.z

    if (scrollState.sceneReady) {
      u.uTime.value += delta
      if (u.uTime.value > 1.0) {
        const rate = 0.005 + u.uStartup.value * 0.025
        u.uStartup.value = THREE.MathUtils.lerp(u.uStartup.value, 1.0, rate)
      }
    }

    u.uPlaying.value = THREE.MathUtils.lerp(
      u.uPlaying.value,
      scrollState.isPlaying ? 1.0 : 0.0,
      0.05,
    )

    u.uBeatPulse.value = scrollState.beatPulse

    getSectionColor(scrollState.offset, tmpColor)
    u.uColor.value.lerp(tmpColor, 0.06)
  })

  return (
    <group>
      <mesh geometry={geometry} material={material} />
    </group>
  )
}
