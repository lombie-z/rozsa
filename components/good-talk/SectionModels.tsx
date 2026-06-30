'use client'
import { useRef, useMemo, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import CustomShaderMaterial from 'three-custom-shader-material'
import { scrollState } from '@/lib/good-talk/scrollState'

const SECTION_WIDTH = 16

const vertexShader = `
  uniform float uTime;
  uniform float uCameraZ;
  uniform float uSectionCenterZ;
  uniform float uRippleAges[12];
  uniform float uRippleIntensities[12];
  uniform vec3 uRippleOrigin;
  attribute float aRandom;
  varying float vFade;
  varying float vRipple;
  varying float vRippleHue;

  void main() {
    float floatSpeed = 1.0;
    float floatHeight = 0.2;
    float yOffset = sin(uTime * floatSpeed + aRandom * 100.0) * floatHeight;
    csm_Position.y += yOffset;

    vec3 instPos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
    float rippleDist = distance(instPos, uRippleOrigin);
    float totalRipple = 0.0;
    for (int i = 0; i < 12; i++) {
      float age = uRippleAges[i];
      if (age < 12.0) {
        float radius = age * 20.0;
        float ring = smoothstep(radius - 3.5, radius - 0.3, rippleDist)
                   * (1.0 - smoothstep(radius + 0.3, radius + 3.5, rippleDist));
        float fade = max(0.0, 1.0 - age * 0.18);
        totalRipple += ring * fade * uRippleIntensities[i];
      }
    }
    vRipple = min(totalRipple, 1.5);

    float instanceZ = instanceMatrix[3][2];
    float dist = abs(instanceZ - uCameraZ);
    vFade = 1.0 - smoothstep(${SECTION_WIDTH.toFixed(1)} * 0.8, ${SECTION_WIDTH.toFixed(1)} * 2.5, dist);
  }
`

const fragmentShader = `
  uniform vec3 uSectionColor;
  varying float vFade;
  varying float vRipple;

  void main() {
    if (vFade < 0.01) discard;
    csm_DiffuseColor.a *= vFade;
    csm_Emissive = uSectionColor * vRipple * 2.5;
  }
`

function gaussianRandom(mean: number, stdDev: number): number {
  const u1 = Math.random()
  const u2 = Math.random()
  return mean + stdDev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

interface ParticleData {
  x: number; y: number; z: number
  scale: number
  rotationX: number; rotationY: number; rotationZ: number
}

function generateSectionData(sectionIndex: number, count: number) {
  const centerZ = -(sectionIndex * SECTION_WIDTH + SECTION_WIDTH / 2)
  const biasedCenter = centerZ + 2
  const particles: ParticleData[] = []
  const randomData = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const z = Math.max(-80, Math.min(0, gaussianRandom(biasedCenter, 6)))
    const x = (Math.random() - 0.5) * 20
    const y = (Math.random() - 0.5) * 20
    const scale = 0.3 + Math.random() * 0.5

    particles.push({
      x, y, z, scale,
      rotationX: Math.random() * Math.PI * 2,
      rotationY: Math.random() * Math.PI * 2,
      rotationZ: Math.random() * Math.PI * 2,
    })
    randomData[i] = Math.random()
  }
  return { particles, randomData }
}

interface MeshPart {
  geometry: THREE.BufferGeometry
  material: THREE.MeshStandardMaterial
  colorOverride?: THREE.Color
}

function SectionInstances({ meshParts, sectionIndex, count = 100, baseScale = 1.0 }: {
  meshParts: MeshPart[]
  sectionIndex: number
  count?: number
  baseScale?: number
}) {
  const meshRefs = useRef<THREE.InstancedMesh[]>([])
  const materialRefs = useRef<THREE.ShaderMaterial[]>([])

  const sectionCenterZ = -(sectionIndex * SECTION_WIDTH + SECTION_WIDTH / 2)

  const { particles, randomData } = useMemo(
    () => generateSectionData(sectionIndex, count),
    [sectionIndex, count],
  )

  const processedParts = useMemo(() => {
    return meshParts.map(part => {
      const geom = part.geometry.clone()
      geom.setAttribute('aRandom', new THREE.InstancedBufferAttribute(randomData, 1))
      return { ...part, geometry: geom }
    })
  }, [meshParts, randomData])

  useLayoutEffect(() => {
    const tempObject = new THREE.Object3D()
    meshRefs.current.forEach(mesh => {
      if (!mesh) return
      particles.forEach((data, i) => {
        tempObject.position.set(data.x, data.y, data.z)
        tempObject.rotation.set(data.rotationX, data.rotationY, data.rotationZ)
        const s = data.scale * baseScale
        tempObject.scale.set(s, s, s)
        tempObject.updateMatrix()
        mesh.setMatrixAt(i, tempObject.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
    })
  }, [particles, baseScale])

  useFrame((state) => {
    const cameraZ = state.camera.position.z
    materialRefs.current.forEach(mat => {
      if (mat?.uniforms) {
        if (mat.uniforms.uTime) {
          mat.uniforms.uTime.value = state.clock.elapsedTime
        }
        if (mat.uniforms.uCameraZ) {
          mat.uniforms.uCameraZ.value = cameraZ
        }
        if (mat.uniforms.uRippleAges) {
          const arr = mat.uniforms.uRippleAges.value
          for (let j = 0; j < 12; j++) arr[j] = scrollState.rippleAges[j]
        }
        if (mat.uniforms.uRippleIntensities) {
          const arr = mat.uniforms.uRippleIntensities.value
          for (let j = 0; j < 12; j++) arr[j] = scrollState.rippleIntensities[j]
        }
        if (mat.uniforms.uSectionColor) {
          const c = scrollState.sectionColor
          mat.uniforms.uSectionColor.value.set(c[0], c[1], c[2])
        }
        if (mat.uniforms.uRippleOrigin) {
          mat.uniforms.uRippleOrigin.value.set(8, 0, cameraZ)
        }
      }
    })
  })

  return (
    <group>
      {processedParts.map((part, index) => (
        <instancedMesh
          key={index}
          ref={el => { meshRefs.current[index] = el! }}
          args={[part.geometry, undefined, count]}
          frustumCulled={false}
        >
          <CustomShaderMaterial
            ref={(el: any) => { materialRefs.current[index] = el! }}
            baseMaterial={THREE.MeshStandardMaterial}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            uniforms={{
              uTime: { value: 0 },
              uCameraZ: { value: 0 },
              uSectionCenterZ: { value: sectionCenterZ },
              uRippleAges: { value: [99,99,99,99,99,99,99,99,99,99,99,99] },
              uRippleIntensities: { value: [1,1,1,1,1,1,1,1,1,1,1,1] },
              uSectionColor: { value: new THREE.Vector3(1, 0.84, 0.31) },
              uRippleOrigin: { value: new THREE.Vector3(8, 0, 0) },
            }}
            map={part.colorOverride ? null : part.material.map}
            color={part.colorOverride ?? part.material.color}
            roughness={part.colorOverride ? 0.4 : (part.material.roughness ?? 0.5)}
            metalness={part.colorOverride ? 0 : (part.material.metalness ?? 0)}
            side={THREE.DoubleSide}
            transparent={true}
            alphaTest={0.01}
          />
        </instancedMesh>
      ))}
    </group>
  )
}

function cropAndCenterGeometry(geometry: THREE.BufferGeometry, yCutoff: number): THREE.BufferGeometry {
  const geom = geometry.clone()
  const positions = geom.getAttribute('position').array as Float32Array
  const index = geom.index

  if (index) {
    const indices = index.array
    const kept: number[] = []
    for (let i = 0; i < indices.length; i += 3) {
      const ya = positions[indices[i] * 3 + 1]
      const yb = positions[indices[i + 1] * 3 + 1]
      const yc = positions[indices[i + 2] * 3 + 1]
      if (ya >= yCutoff && yb >= yCutoff && yc >= yCutoff) {
        kept.push(indices[i], indices[i + 1], indices[i + 2])
      }
    }
    geom.setIndex(kept)
  }

  geom.computeBoundingBox()
  const bb = geom.boundingBox!
  geom.translate(
    -(bb.min.x + bb.max.x) / 2,
    -(bb.min.y + bb.max.y) / 2,
    -(bb.min.z + bb.max.z) / 2,
  )

  return geom
}

/**
 * Center a geometry by translating it so its bounding box center is at the origin.
 */
function centerGeometry(geometry: THREE.BufferGeometry, offsetX: number, offsetY: number, offsetZ: number): THREE.BufferGeometry {
  const geom = geometry.clone()
  geom.translate(offsetX, offsetY, offsetZ)
  return geom
}

export function SectionModels() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const heliconia = useGLTF('/good-talk/Heliconia.glb') as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leaf = useGLTF('/good-talk/Leaf.glb') as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rose = useGLTF('/good-talk/Rose.glb') as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const desertLily = useGLTF('/good-talk/DesertLily.glb') as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deadTree = useGLTF('/good-talk/DeadTree.glb') as any

  // Heliconia: native max dim ~13.42, baseScale 0.18 => 13.42 * 0.55 * 0.18 ~ 1.33
  const heliconiaParts = useMemo<MeshPart[]>(() => [{
    geometry: heliconia.nodes.HeliconiaFlower_mesh.geometry,
    material: heliconia.materials.HeliconiaFlower_mat,
  }], [heliconia])

  // Leaf: native max dim ~1.37, baseScale 1.3 => 1.37 * 0.55 * 1.3 ~ 0.98
  const leafParts = useMemo<MeshPart[]>(() => [{
    geometry: leaf.nodes.leaf.geometry,
    material: leaf.materials.None,
  }], [leaf])

  // Rose: crop stem at Y < -0.4, recenter. After crop max dim ~1.0, baseScale 2.0 => 1.0 * 0.55 * 2.0 ~ 1.1
  const roseParts = useMemo<MeshPart[]>(() => {
    const croppedGeom = cropAndCenterGeometry(rose.nodes.rose.geometry, -0.35)
    return [{ geometry: croppedGeom, material: rose.materials.None }]
  }, [rose])

  // Desert Lily: native max dim ~5.1, baseScale 0.46 => 5.1 * 0.55 * 0.46 ~ 1.29
  const desertLilyParts = useMemo<MeshPart[]>(() => [{
    geometry: desertLily.nodes.DeserLily_Mesh.geometry,
    material: desertLily.materials.DeserLily_Mat,
  }], [desertLily])

  // DeadTree: native max dim ~2.23, baseScale 0.85 => 2.23 * 0.55 * 0.85 ~ 1.04
  const deadTreeParts = useMemo<MeshPart[]>(() => [{
    geometry: deadTree.nodes.dead_tree.geometry,
    material: deadTree.materials.None,
  }], [deadTree])

  return (
    <group>
      <SectionInstances meshParts={desertLilyParts} sectionIndex={0} count={50} baseScale={0.46} />
      <SectionInstances meshParts={deadTreeParts} sectionIndex={1} count={50} baseScale={0.85} />
      <SectionInstances meshParts={roseParts} sectionIndex={2} count={50} baseScale={2.0} />
      <SectionInstances meshParts={heliconiaParts} sectionIndex={3} count={50} baseScale={0.18} />
      <SectionInstances meshParts={leafParts} sectionIndex={4} count={50} baseScale={1.3} />
    </group>
  )
}

useGLTF.preload('/good-talk/Heliconia.glb')
useGLTF.preload('/good-talk/Leaf.glb')
useGLTF.preload('/good-talk/Rose.glb')
useGLTF.preload('/good-talk/DesertLily.glb')
useGLTF.preload('/good-talk/DeadTree.glb')
