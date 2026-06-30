'use client'
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

const SECTIONS = [
  { title: 'Out is Through', z: -12, x: 6, color1: '#FFD54F', color2: '#FFB300', shadow: '#FF6F00' },
  { title: 'Is Your Heart\nBig Enough for Them', z: -24, x: -5, color1: '#4DD0E1', color2: '#00E5FF', shadow: '#0097A7' },
  { title: 'Sincerity', z: -40, x: 5.5, color1: '#FF80AB', color2: '#FF4081', shadow: '#F50057' },
  { title: "Where's My\nDignity Now", z: -56, x: -6, color1: '#FFAB40', color2: '#FF6D00', shadow: '#E65100' },
  { title: 'Good Talk', z: -72, x: 6, color1: '#CE93D8', color2: '#AB47BC', shadow: '#7B1FA2' },
]

const FONT = '/good-talk/fonts/Rock3D.ttf'

function IridescentTitle({ sec }: { sec: typeof SECTIONS[number] }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shadowRef = useRef<any>(null)
  const iridescentRef = useRef<THREE.ShaderMaterial>(null!)

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor1: { value: new THREE.Color(sec.color1) },
        uColor2: { value: new THREE.Color(sec.color2) },
        uTime: { value: 0 },
        uOpacity: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform float uTime;
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          float shift = sin(vUv.x * 4.0 + uTime * 0.8) * 0.5 + 0.5;
          float shift2 = cos(vUv.y * 3.0 + uTime * 0.6) * 0.5 + 0.5;
          vec3 col = mix(uColor1, uColor2, shift * 0.7 + shift2 * 0.3);
          col += vec3(0.15) * sin(uTime * 1.2 + vUv.x * 6.0);
          gl_FragColor = vec4(col, uOpacity);
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })
  }, [sec.color1, sec.color2])

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime

    const camZ = state.camera.position.z
    const dist = Math.abs(sec.z - camZ)
    const fadeIn = Math.max(0, Math.min(1, (25 - dist) / 7))
    const fadeClose = Math.max(0, Math.min(1, (dist - 3) / 3))
    const opacity = fadeIn * fadeClose

    material.uniforms.uOpacity.value = opacity

    if (shadowRef.current) {
      shadowRef.current.fillOpacity = opacity
      shadowRef.current.outlineOpacity = opacity
    }
  })

  const align = sec.x < 0 ? 'left' : 'right'
  const angleY = sec.x < 0 ? 0.8 : -0.8

  return (
    <group position={[sec.x, 0, sec.z]} rotation={[0, angleY, 0]}>
      {/* Shadow layer: native troika outline for contrast */}
      <Text
        ref={shadowRef}
        font={FONT}
        position={[0, 0, 0.05]}
        fontSize={1.0}
        textAlign={align}
        anchorX={align}
        anchorY="middle"
        maxWidth={6}
        renderOrder={998}
        color={sec.shadow}
        outlineWidth={0.2}
        outlineColor={sec.shadow}
        outlineBlur={0.12}
        fillOpacity={0}
        outlineOpacity={0}
        depthOffset={-1}
      >
        {sec.title}
      </Text>

      {/* Iridescent layer on top */}
      <Text
        font={FONT}
        position={[0, 0, 0]}
        fontSize={1.0}
        textAlign={align}
        anchorX={align}
        anchorY="middle"
        maxWidth={6}
        renderOrder={999}
        material={material}
      >
        {sec.title}
      </Text>
    </group>
  )
}

export function SectionTitles() {
  return (
    <group>
      {SECTIONS.map((sec, i) => (
        <IridescentTitle key={i} sec={sec} />
      ))}
    </group>
  )
}
