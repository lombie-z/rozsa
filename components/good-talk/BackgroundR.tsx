'use client'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '@/lib/good-talk/scrollState'

const FONT = '/good-talk/fonts/UnifrakturMaguntia-Regular.ttf'

export function BackgroundR() {
  const matRef = useRef<THREE.MeshBasicMaterial>(null!)

  const groupRef = useRef<THREE.Group>(null!)

  useFrame((state) => {
    if (!matRef.current || !groupRef.current) return

    // Follow camera Z so it stays at a fixed visual size, always behind
    groupRef.current.position.z = state.camera.position.z - 50

    // React to camera XY parallax
    groupRef.current.position.x = state.camera.position.x * 0.3
    groupRef.current.position.y = state.camera.position.y * 0.3

    const fadeOut = Math.max(0, 1 - Math.max(0, (scrollState.offset - 0.7) / 0.2))
    matRef.current.opacity = fadeOut * 0.07
  })

  return (
    <group ref={groupRef}>
    <Text
      font={FONT}
      position={[0, 0, 0]}
      fontSize={30}
      anchorX="center"
      anchorY="middle"
      renderOrder={-1}
    >
      r
      <meshBasicMaterial
        ref={matRef}
        color="white"
        transparent
        depthWrite={false}
        depthTest={false}
        opacity={0.07}
      />
    </Text>
    </group>
  )
}
