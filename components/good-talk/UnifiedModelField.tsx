'use client'
import { useRef, useMemo, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import CustomShaderMaterial from 'three-custom-shader-material'
import { scrollState } from '@/lib/good-talk/scrollState'

const COUNT = 350
const BRANCH_COUNT = 100
const MODEL_COUNT = 5

// ---------------------------------------------------------------------------
// Shared position data — 250 instances, uniform random distribution
// ---------------------------------------------------------------------------
interface ParticleData {
  x: number; y: number; z: number
  scale: number
  rotationX: number; rotationY: number; rotationZ: number
}

function generateSharedPositions(count: number = COUNT) {
  const particles: ParticleData[] = []
  const randomData = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 20
    const y = (Math.random() - 0.5) * 20
    let z = -Math.random() * 80
    // Clear area at the very start (Z: 0 to -8) — push everything out
    if (z > -8) {
      z = -(8 + Math.random() * 72)
    }
    // Thin out section 1 (Z: -8 to -32) — reject 70% of instances there
    if (z < -8 && z > -32 && Math.random() < 0.7) {
      z = -(32 + Math.random() * 48)
    }
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

// ---------------------------------------------------------------------------
// Geometry helpers (ported from SectionModels)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------
const ELEMENT_FALL = 40

const vertexShader = `
  uniform float uTime;
  uniform float uFadeScale;
  uniform float uScrollOffset;
  uniform float uRippleAges[12];
  uniform float uRippleIntensities[12];
  uniform vec3 uRippleOrigin;
  attribute float aRandom;
  attribute float aLit;
  varying float vRipple;
  varying float vLit;

  void main() {
    vec3 instPos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);

    // Single unified sway — everything moves the same direction at once
    float swayX = sin(uTime * 0.2) * 0.4;
    float swayY = sin(uTime * 0.15) * 0.15;
    csm_Position.x += swayX;
    csm_Position.y += swayY;

    csm_Position *= uFadeScale;

    float fallRate = ${ELEMENT_FALL.toFixed(1)} * (aRandom * aRandom * aRandom);
    csm_Position.z -= uScrollOffset * fallRate;
    float dist = distance(instPos, uRippleOrigin);
    float totalRipple = 0.0;
    for (int i = 0; i < 12; i++) {
      float age = uRippleAges[i];
      if (age < 12.0) {
        float radius = age * 20.0;
        float ring = smoothstep(radius - 3.5, radius - 0.3, dist)
                   * (1.0 - smoothstep(radius + 0.3, radius + 3.5, dist));
        float fade = max(0.0, 1.0 - age * 0.18);
        totalRipple += ring * fade * uRippleIntensities[i];
      }
    }
    vRipple = min(totalRipple, 1.5);
    vLit = aLit;
  }
`

const fragmentShader = `
  uniform vec3 uSectionColor;
  uniform float uFadeOpacity;
  uniform float uTransitionBlur;
  uniform float uAllLit;
  varying float vRipple;
  varying float vLit;

  void main() {
    if (uFadeOpacity < 0.01) discard;

    // During transition, wash out to a flat color (pure blur effect)
    vec3 avgColor = csm_DiffuseColor.rgb * 0.5 + uSectionColor * 0.5;
    csm_DiffuseColor.rgb = mix(csm_DiffuseColor.rgb, avgColor, uTransitionBlur);
    csm_DiffuseColor.a *= uFadeOpacity;
    csm_Emissive += mix(uSectionColor * vRipple * 2.5, avgColor * 0.3, uTransitionBlur);
    float litFactor = max(vLit, uAllLit);
    csm_Emissive += vec3(1.0, 0.27, 0.0) * 0.8 * litFactor;
  }
`

// ---------------------------------------------------------------------------
// Smoothstep helper
// ---------------------------------------------------------------------------
function smoothstep(t: number, edge0: number, edge1: number): number {
  const x = Math.max(0, Math.min(1, (t - edge0) / (edge1 - edge0)))
  return x * x * (3 - 2 * x)
}

// ---------------------------------------------------------------------------
// MeshPart interface
// ---------------------------------------------------------------------------
interface MeshPart {
  geometry: THREE.BufferGeometry
  material: THREE.MeshStandardMaterial
  isHead?: boolean
}

// ---------------------------------------------------------------------------
// ModelLayer — renders one model type at all 250 shared positions
// ---------------------------------------------------------------------------
function ModelLayer({
  meshParts,
  baseScale,
  particles,
  randomData,
  fadeScaleRef,
  fadeOpacityRef,
  visibleRef,
  count,
  blurOverrideRef,
  allLitRef,
}: {
  meshParts: MeshPart[]
  baseScale: number
  particles: ParticleData[]
  randomData: Float32Array
  fadeScaleRef: React.MutableRefObject<number>
  fadeOpacityRef: React.MutableRefObject<number>
  visibleRef: React.MutableRefObject<boolean>
  count?: number
  blurOverrideRef?: React.MutableRefObject<number>
  allLitRef?: React.MutableRefObject<number>
}) {
  const meshRefs = useRef<THREE.InstancedMesh[]>([])
  const materialRefs = useRef<THREE.ShaderMaterial[]>([])
  const groupRef = useRef<THREE.Group>(null)

  // Clone geometries and inject aRandom attribute
  const instanceCount = count ?? COUNT
  const processedParts = useMemo(() => {
    return meshParts.map(part => {
      const geom = part.geometry.clone()
      geom.setAttribute('aRandom', new THREE.InstancedBufferAttribute(randomData, 1))
      if (!geom.getAttribute('aLit')) {
        geom.setAttribute('aLit', new THREE.InstancedBufferAttribute(new Float32Array(instanceCount), 1))
      }
      return { ...part, geometry: geom }
    })
  }, [meshParts, randomData, instanceCount])

  // Set instance matrices using shared positions
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

  // Per-frame uniform updates
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.visible = visibleRef.current
    }

    materialRefs.current.forEach((mat, partIndex) => {
      if (!mat?.uniforms) return
      if (mat.uniforms.uTime) mat.uniforms.uTime.value = state.clock.elapsedTime
      if (mat.uniforms.uFadeScale) mat.uniforms.uFadeScale.value = fadeScaleRef.current
      if (mat.uniforms.uScrollOffset) mat.uniforms.uScrollOffset.value = scrollState.offset || 0
      if (mat.uniforms.uFadeOpacity) mat.uniforms.uFadeOpacity.value = fadeOpacityRef.current
      if (mat.uniforms.uRippleAges) {
        const arr = mat.uniforms.uRippleAges.value
        for (let j = 0; j < 12; j++) arr[j] = scrollState.rippleAges[j]
      }
      if (mat.uniforms.uRippleIntensities) {
        const arr = mat.uniforms.uRippleIntensities.value
        for (let j = 0; j < 12; j++) arr[j] = scrollState.rippleIntensities[j]
      }
      if (mat.uniforms.uRippleOrigin) {
        mat.uniforms.uRippleOrigin.value.set(8, 0, state.camera.position.z)
      }
      if (mat.uniforms.uSectionColor) {
        const c = scrollState.sectionColor
        mat.uniforms.uSectionColor.value.set(c[0], c[1], c[2])
      }
      if (mat.uniforms.uTransitionBlur) {
        mat.uniforms.uTransitionBlur.value = blurOverrideRef ? blurOverrideRef.current : scrollState.transitionBlur
      }
      if (mat.uniforms.uAllLit && allLitRef) {
        mat.uniforms.uAllLit.value = meshParts[partIndex]?.isHead ? allLitRef.current : 0
      }
    })
  })

  return (
    <group ref={groupRef}>
      {processedParts.map((part, index) => (
        <instancedMesh
          key={index}
          ref={el => { meshRefs.current[index] = el! }}
          args={[part.geometry, undefined, count ?? COUNT]}
          frustumCulled={false}
        >
          <CustomShaderMaterial
            ref={(el: unknown) => { materialRefs.current[index] = el as THREE.ShaderMaterial }}
            baseMaterial={THREE.MeshStandardMaterial}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            uniforms={{
              uTime: { value: 0 },
              uFadeScale: { value: 0 },
              uScrollOffset: { value: 0 },
              uFadeOpacity: { value: 0 },
              uRippleAges: { value: [99,99,99,99,99,99,99,99,99,99,99,99] },
              uRippleIntensities: { value: [1,1,1,1,1,1,1,1,1,1,1,1] },
              uRippleOrigin: { value: new THREE.Vector3(8, 0, 0) },
              uSectionColor: { value: new THREE.Vector3(1, 0.84, 0.31) },
              uTransitionBlur: { value: 0 },
              uAllLit: { value: 0 },
            }}
            map={part.material.map}
            color={part.material.color}
            roughness={part.material.roughness ?? 0.5}
            metalness={part.material.metalness ?? 0}
            emissive={part.material.emissive}
            emissiveIntensity={part.material.emissiveIntensity ?? 0}
            side={THREE.DoubleSide}
            transparent={true}
            alphaTest={0.01}
          />
        </instancedMesh>
      ))}
    </group>
  )
}

// ---------------------------------------------------------------------------
// UnifiedModelField — main exported component
// ---------------------------------------------------------------------------
export function UnifiedModelField() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const desertLily = useGLTF('/good-talk/DesertLily.glb') as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rose = useGLTF('/good-talk/Rose.glb') as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tulip = useGLTF('/good-talk/Tulip.glb') as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flower = useGLTF('/good-talk/Flower.glb') as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leaf = useGLTF('/good-talk/Leaf.glb') as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const treeBranch = useGLTF('/good-talk/TreeBranch.glb') as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchstick = useGLTF('/good-talk/Matchstick.glb') as any

  // Shared positions generated once
  const { particles, randomData } = useMemo(() => generateSharedPositions(), [])

  // Branch positions — separate set for the branch/matchstick layer
  const { particles: branchParticles, randomData: branchRandomData } = useMemo(
    () => generateSharedPositions(BRANCH_COUNT), []
  )

  // Per-model fade refs (no re-renders)
  const fadeScaleRefs = useRef(
    Array.from({ length: MODEL_COUNT }, () => ({ current: 0 }))
  ).current
  const fadeOpacityRefs = useRef(
    Array.from({ length: MODEL_COUNT }, () => ({ current: 0 }))
  ).current
  const visibleRefs = useRef(
    Array.from({ length: MODEL_COUNT }, () => ({ current: false }))
  ).current

  // Branch layer fade refs (TreeBranch = 0, Matchstick = 1)
  const branchFadeScaleRefs = useRef(
    Array.from({ length: 2 }, () => ({ current: 0 }))
  ).current
  const branchFadeOpacityRefs = useRef(
    Array.from({ length: 2 }, () => ({ current: 0 }))
  ).current
  const branchVisibleRefs = useRef(
    Array.from({ length: 2 }, () => ({ current: false }))
  ).current

  // Section 0 starts fully visible
  fadeScaleRefs[0].current = 1
  fadeOpacityRefs[0].current = 1
  visibleRefs[0].current = true

  // TreeBranch starts visible (visible in all sections except 1)
  branchFadeScaleRefs[0].current = 1
  branchFadeOpacityRefs[0].current = 1
  branchVisibleRefs[0].current = true

  const branchBlurRef = useRef({ current: 0 }).current

  // 5 models, one per song section:
  // 0: Desert Lily (Out is Through)
  // 1: Leaf (Is Your Heart Big Enough)
  // 2: Tulip (Sincerity)
  // 3: Hibiscus (Where's My Dignity Now)
  // 4: Rose (Good Talk)

  const desertLilyParts = useMemo<MeshPart[]>(() => [{
    geometry: desertLily.nodes.DeserLily_Mesh.geometry,
    material: desertLily.materials.DeserLily_Mat,
  }], [desertLily])

  const roseParts = useMemo<MeshPart[]>(() => {
    const cropped = cropAndCenterGeometry(rose.nodes.rose.geometry, -0.8)
    return [{ geometry: cropped, material: rose.materials.None }]
  }, [rose])

  const tulipParts = useMemo<MeshPart[]>(() => {
    const mat = tulip.materials.None.clone()
    mat.color = new THREE.Color('#EC407A')
    return [{ geometry: tulip.nodes.tulip.geometry, material: mat }]
  }, [tulip])

  const hibiscusParts = useMemo<MeshPart[]>(() => [
    { geometry: flower.nodes['hibiscus_flower-Mesh'].geometry, material: flower.materials.red },
    { geometry: flower.nodes['hibiscus_flower-Mesh_1'].geometry, material: flower.materials.hay },
    { geometry: flower.nodes['hibiscus_flower-Mesh_2'].geometry, material: flower.materials.tree },
  ], [flower])

  const leafParts = useMemo<MeshPart[]>(() => [{
    geometry: leaf.nodes.leaf.geometry,
    material: leaf.materials.None,
  }], [leaf])

  const branchParts = useMemo<MeshPart[]>(() => [{
    geometry: treeBranch.nodes.Tree_branch.geometry,
    material: treeBranch.materials.None,
  }], [treeBranch])

  const allLitRef = useRef({ current: 0 }).current

  const matchstickParts = useMemo<MeshPart[]>(() => {
    const headMat = matchstick.materials.lambert3SG.clone()
    headMat.emissive = new THREE.Color('#000000')
    headMat.emissiveIntensity = 0

    const headGeom = matchstick.nodes['Node-Mesh_1'].geometry.clone()
    const litData = new Float32Array(BRANCH_COUNT)
    // 3 lit matches spread across section 1: one near z≈-30, others pushed further out
    const targets = [-38, -30, -44]
    const used = new Set<number>()
    for (const tz of targets) {
      let bestIdx = 0, bestDist = Infinity
      for (let i = 0; i < branchParticles.length; i++) {
        if (used.has(i)) continue
        const d = Math.abs(branchParticles[i].z - tz)
        if (d < bestDist) { bestDist = d; bestIdx = i }
      }
      used.add(bestIdx)
      litData[bestIdx] = 1.0
    }
    headGeom.setAttribute('aLit', new THREE.InstancedBufferAttribute(litData, 1))

    return [
      { geometry: matchstick.nodes['Node-Mesh'].geometry, material: matchstick.materials.lambert2SG },
      { geometry: headGeom, material: headMat, isHead: true },
    ]
  }, [matchstick, branchParticles])

  const baseScales = useMemo(() => [0.46, 1.3, 0.8, 0.7, 1.2], [])

  const allParts = useMemo(() => [
    desertLilyParts,
    leafParts,
    tulipParts,
    hibiscusParts,
    roseParts,
  ], [desertLilyParts, leafParts, tulipParts, hibiscusParts, roseParts])

  const startupRef = useRef(0)

  // Crossfade logic — runs every frame, mutates refs only
  useFrame((state, delta) => {
    if (scrollState.sceneReady) {
      startupRef.current = Math.min(1, startupRef.current + delta * 0.5)
    }
    const offset = scrollState.offset || 0
    const scrollProgress = Math.min(Math.max(offset, 0) * 5, 4.999)
    const section = Math.min(Math.floor(scrollProgress), 4)
    const sectionT = scrollProgress - section

    const outgoing = section
    const incoming = Math.min(section + 1, 4)
    const fadeFactor = outgoing === incoming ? 0 : smoothstep(sectionT, 0.2, 0.6)
    const startupBlur = 1 - startupRef.current
    scrollState.transitionBlur = Math.max(Math.sin(fadeFactor * Math.PI), startupBlur)

    for (let i = 0; i < MODEL_COUNT; i++) {
      if (i === outgoing && i === incoming) {
        fadeScaleRefs[i].current = 1
        fadeOpacityRefs[i].current = 1
        visibleRefs[i].current = true
      } else if (i === outgoing) {
        fadeScaleRefs[i].current = 1 - fadeFactor
        fadeOpacityRefs[i].current = 1 - fadeFactor
        visibleRefs[i].current = (1 - fadeFactor) > 0.001
      } else if (i === incoming) {
        fadeScaleRefs[i].current = fadeFactor
        fadeOpacityRefs[i].current = fadeFactor
        visibleRefs[i].current = fadeFactor > 0.001
      } else {
        fadeScaleRefs[i].current = 0
        fadeOpacityRefs[i].current = 0
        visibleRefs[i].current = false
      }
    }

    // Branch layer crossfade:
    // TreeBranch visible in sections 0, 2, 3, 4 (all except 1)
    // Matchstick visible only in section 1
    // During transitions into/out of section 1, crossfade between them
    // Matchsticks in sections 1 and 4, branches everywhere else
    const wantsMatchstick = section === 1 || section === 4
    const enteringMatch = !wantsMatchstick && (incoming === 1 || incoming === 4) && fadeFactor > 0
    const leavingMatch = wantsMatchstick && incoming !== 1 && incoming !== 4 && fadeFactor > 0
    const branchIsTransitioning = enteringMatch || leavingMatch
    branchBlurRef.current = branchIsTransitioning ? Math.sin(fadeFactor * Math.PI) : 0

    if (enteringMatch) {
      branchFadeScaleRefs[0].current = 1 - fadeFactor
      branchFadeOpacityRefs[0].current = 1 - fadeFactor
      branchVisibleRefs[0].current = (1 - fadeFactor) > 0.001
      branchFadeScaleRefs[1].current = fadeFactor
      branchFadeOpacityRefs[1].current = fadeFactor
      branchVisibleRefs[1].current = fadeFactor > 0.001
    } else if (leavingMatch) {
      branchFadeScaleRefs[1].current = 1 - fadeFactor
      branchFadeOpacityRefs[1].current = 1 - fadeFactor
      branchVisibleRefs[1].current = (1 - fadeFactor) > 0.001
      branchFadeScaleRefs[0].current = fadeFactor
      branchFadeOpacityRefs[0].current = fadeFactor
      branchVisibleRefs[0].current = fadeFactor > 0.001
    } else if (wantsMatchstick) {
      branchFadeScaleRefs[0].current = 0
      branchFadeOpacityRefs[0].current = 0
      branchVisibleRefs[0].current = false
      branchFadeScaleRefs[1].current = 1
      branchFadeOpacityRefs[1].current = 1
      branchVisibleRefs[1].current = true
    } else {
      branchFadeScaleRefs[0].current = 1
      branchFadeOpacityRefs[0].current = 1
      branchVisibleRefs[0].current = true
      branchFadeScaleRefs[1].current = 0
      branchFadeOpacityRefs[1].current = 0
      branchVisibleRefs[1].current = false
    }

    allLitRef.current = (section === 4 || incoming === 4) ? 1 : 0
  })

  return (
    <group>
      {allParts.map((parts, i) => (
        <ModelLayer
          key={i}
          meshParts={parts}
          baseScale={baseScales[i]}
          particles={particles}
          randomData={randomData}
          fadeScaleRef={fadeScaleRefs[i]}
          fadeOpacityRef={fadeOpacityRefs[i]}
          visibleRef={visibleRefs[i]}
        />
      ))}
      {/* Branch layer — TreeBranch (visible except section 1) */}
      <ModelLayer
        meshParts={branchParts}
        baseScale={0.8}
        particles={branchParticles}
        randomData={branchRandomData}
        fadeScaleRef={branchFadeScaleRefs[0]}
        fadeOpacityRef={branchFadeOpacityRefs[0]}
        visibleRef={branchVisibleRefs[0]}
        count={BRANCH_COUNT}
        blurOverrideRef={branchBlurRef}
      />
      {/* Branch layer — Matchstick (visible only in section 1) */}
      <ModelLayer
        meshParts={matchstickParts}
        baseScale={0.25}
        particles={branchParticles}
        randomData={branchRandomData}
        fadeScaleRef={branchFadeScaleRefs[1]}
        fadeOpacityRef={branchFadeOpacityRefs[1]}
        visibleRef={branchVisibleRefs[1]}
        count={BRANCH_COUNT}
        blurOverrideRef={branchBlurRef}
        allLitRef={allLitRef}
      />
    </group>
  )
}

// Preload all models
useGLTF.preload('/good-talk/DesertLily.glb')
useGLTF.preload('/good-talk/Rose.glb')
useGLTF.preload('/good-talk/Tulip.glb')
useGLTF.preload('/good-talk/Flower.glb')
useGLTF.preload('/good-talk/Leaf.glb')
useGLTF.preload('/good-talk/TreeBranch.glb')
useGLTF.preload('/good-talk/Matchstick.glb')
