'use client'
import { useRef, useEffect } from 'react'
import { Renderer, Program, Mesh, Triangle, Vec2, Vec3 } from 'ogl'
import { scrollState } from '@/lib/good-talk/scrollState'

const SECTION_COLORS: [number, number, number][] = [
  [0.90, 0.90, 0.94],  // white / light
  [0.08, 0.08, 0.08],  // black
  [0.78, 0.27, 0.43],  // pink
  [0.86, 0.39, 0.18],  // sunset orange
  [0.16, 0.06, 0.24],  // dark purple
]

const vertex = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const fragment = `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uBeatPulse;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  uv -= 0.5;
  uv.x *= uResolution.x / uResolution.y;

  float n = noise(uv * 2.0 + uTime * 0.12);
  float m = noise(uv * 3.5 - uTime * 0.08);

  float t = 0.5 + 0.5 * sin(uTime * 0.2 + n * 2.5);
  vec3 col = mix(uColor1, uColor2, t + m * 0.3);

  // Beat darkening
  col *= 1.0 - uBeatPulse * 0.3;

  // Soft vignette
  float d = length(uv);
  col *= 1.0 - d * 0.4;

  // Dark aurora at bottom
  float bottomY = gl_FragCoord.y / uResolution.y;
  float aurora1 = smoothstep(0.0, 0.25 + sin(uTime * 0.3) * 0.08, bottomY);
  float aurora2 = smoothstep(0.0, 0.15 + sin(uTime * 0.5 + 2.0) * 0.05, bottomY);
  float aurora = aurora1 * 0.6 + aurora2 * 0.4;
  col *= mix(0.15, 1.0, aurora);

  gl_FragColor = vec4(col, 1.0);
}
`

export function AuroraBackground() {
  const ref = useRef<HTMLCanvasElement>(null)
  const color1Ref = useRef(new Float32Array(SECTION_COLORS[0]))
  const color2Ref = useRef(new Float32Array(SECTION_COLORS[1]))

  useEffect(() => {
    const canvas = ref.current!
    const renderer = new Renderer({
      dpr: Math.min(window.devicePixelRatio, 2),
      canvas,
    })
    const gl = renderer.gl
    const geometry = new Triangle(gl)

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new Vec2() },
        uColor1: { value: new Vec3(...SECTION_COLORS[0]) },
        uColor2: { value: new Vec3(...SECTION_COLORS[1]) },
        uBeatPulse: { value: 0 },
      },
    })

    const mesh = new Mesh(gl, { geometry, program })

    const resize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight)
      program.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', resize)
    resize()

    const start = performance.now()
    let frame = 0

    const loop = () => {
      program.uniforms.uTime.value = (performance.now() - start) / 1000

      // Interpolate colors based on scroll section
      const raw = scrollState.offset * 5
      const idx = Math.max(0, Math.min(Math.floor(raw), 4))
      const nextIdx = Math.min(idx + 1, 4)
      const t = raw - Math.floor(raw)
      const c1 = SECTION_COLORS[idx]
      const c2 = SECTION_COLORS[nextIdx]

      for (let i = 0; i < 3; i++) {
        const blended = c1[i] + (c2[i] - c1[i]) * t
        color1Ref.current[i] += (blended - color1Ref.current[i]) * 0.03
        color2Ref.current[i] += (blended * 0.85 - color2Ref.current[i]) * 0.03
      }

      program.uniforms.uColor1.value.set(color1Ref.current[0], color1Ref.current[1], color1Ref.current[2])
      program.uniforms.uColor2.value.set(color2Ref.current[0], color2Ref.current[1], color2Ref.current[2])
      program.uniforms.uBeatPulse.value = scrollState.beatPulse

      renderer.render({ scene: mesh })
      frame = requestAnimationFrame(loop)
    }
    loop()

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
      }}
    />
  )
}
