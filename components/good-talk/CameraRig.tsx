import { useFrame } from '@react-three/fiber'
import { useScroll } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '@/lib/good-talk/scrollState'

export function CameraRig() {
  const scroll = useScroll()

  useFrame((state) => {
    scrollState.offset = scroll.offset

    const targetZ = -scroll.offset * 80
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetZ, 0.1)

    const { x, y } = state.pointer
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, x * 2, 0.1)
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, y * 2, 0.1)

    state.camera.lookAt(0, 0, targetZ - 10)
  })

  return null
}