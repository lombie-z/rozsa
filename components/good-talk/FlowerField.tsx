import { useRef, useMemo, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import CustomShaderMaterial from 'three-custom-shader-material'
import { scrollState } from '@/lib/good-talk/scrollState'

const COUNT = 400

// --- 1. DATA GENERATION (Unchanged) ---
function generateParticleData() {
  const data = []
  const randoms = new Float32Array(COUNT)
  
  for (let i = 0; i < COUNT; i++) {
    const x = (Math.random() - 0.5) * 20
    const y = (Math.random() - 0.5) * 20
    const r = Math.random()
    // Sparse early, dense after roses (section 2)
    let z: number
    if (r < 0.03) {
      z = -Math.random() * 16          // section 0: barely any
    } else if (r < 0.08) {
      z = -16 - Math.random() * 16     // section 1: a few
    } else if (r < 0.18) {
      z = -32 - Math.random() * 16     // section 2: building up
    } else {
      z = -48 - Math.random() * 32     // sections 3-4: dense
    }
    const scale = 0.5 + Math.random() * 0.5
    // Add random rotations for variety
    const rotationX = Math.random() * Math.PI * 2
    const rotationY = Math.random() * Math.PI * 2
    const rotationZ = Math.random() * Math.PI * 2
    
    data.push({ x, y, z, scale, rotationX, rotationY, rotationZ })
    randoms[i] = Math.random()
  }
  return { particles: data, randomData: randoms }
}

// --- 2. SHADER (Unchanged) ---
const vertexShader = `
  uniform float uTime;
  uniform float uRippleAges[12];
  uniform float uRippleIntensities[12];
  uniform vec3 uRippleOrigin;
  attribute float aRandom;
  varying float vRipple;

  void main() {
    float floatSpeed = 1.0;
    float floatHeight = 0.2;
    float yOffset = sin(uTime * floatSpeed + aRandom * 100.0) * floatHeight;
    csm_Position.y += yOffset;

    vec3 instPos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
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
  }
`

const fragmentShader = `
  uniform vec3 uSectionColor;
  varying float vRipple;
  void main() {
    csm_Emissive = uSectionColor * vRipple * 2.5;
  }
`

export function FlowerField() {
  // We need an array of refs because we have 3 mesh parts
  const meshRefs = useRef<THREE.InstancedMesh[]>([])
  const materialRefs = useRef<THREE.ShaderMaterial[]>([])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { nodes, materials } = useGLTF('/good-talk/Flower.glb') as any;

  // --- 3. PREPARE GEOMETRY PARTS ---
  // We define the 3 parts of your hibiscus here based on your gltfjsx output
  const flowerParts = useMemo(() => {
    return [
      { id: 'petals', geometry: nodes['hibiscus_flower-Mesh'].geometry, material: materials.red },
      { id: 'pollen', geometry: nodes['hibiscus_flower-Mesh_1'].geometry, material: materials.hay },
      { id: 'stem',   geometry: nodes['hibiscus_flower-Mesh_2'].geometry, material: materials.tree },
    ]
  }, [nodes, materials])

  // Generate data once
  const { particles, randomData } = useMemo(() => generateParticleData(), [])

  // --- 4. EXTEND GEOMETRIES ---
  // We must clone EACH geometry and inject the 'aRandom' attribute into it
  const processedParts = useMemo(() => {
    return flowerParts.map((part) => {
      const geom = part.geometry.clone()
      geom.setAttribute('aRandom', new THREE.InstancedBufferAttribute(randomData, 1))
      return { ...part, geometry: geom }
    })
  }, [flowerParts, randomData])

  // --- 5. SYNC MATRICES ---
  useLayoutEffect(() => {
    const tempObject = new THREE.Object3D()
    
    // Loop through every instanced mesh (petals, pollen, stem)
    meshRefs.current.forEach((mesh) => {
      if (!mesh) return
      
      particles.forEach((data, i) => {
        tempObject.position.set(data.x, data.y, data.z)
        tempObject.rotation.set(data.rotationX, data.rotationY, data.rotationZ) // Random initial angles
        tempObject.scale.set(data.scale, data.scale, data.scale)
        tempObject.updateMatrix()
        mesh.setMatrixAt(i, tempObject.matrix)
      })
      
      mesh.instanceMatrix.needsUpdate = true
    })
  }, [particles])

  // --- 6. ANIMATION LOOP ---
  useFrame((state) => {
    materialRefs.current.forEach((mat) => {
      if (mat?.uniforms) {
        if (mat.uniforms.uTime) mat.uniforms.uTime.value = state.clock.elapsedTime
        if (mat.uniforms.uRippleAges) {
          const arr = mat.uniforms.uRippleAges.value
          for (let j = 0; j < 12; j++) arr[j] = scrollState.rippleAges[j]
        }
        if (mat.uniforms.uRippleIntensities) {
          const arr = mat.uniforms.uRippleIntensities.value
          for (let j = 0; j < 12; j++) arr[j] = scrollState.rippleIntensities[j]
        }
        if (mat.uniforms.uRippleOrigin) mat.uniforms.uRippleOrigin.value.set(8, 0, state.camera.position.z)
        if (mat.uniforms.uSectionColor) {
          const c = scrollState.sectionColor
          mat.uniforms.uSectionColor.value.set(c[0], c[1], c[2])
        }
      }
    })
  })

  return (
    <group>
      {processedParts.map((part, index) => (
        <instancedMesh
          key={part.id}
          ref={(el) => (meshRefs.current[index] = el!)}
          args={[part.geometry, undefined, COUNT]}
          frustumCulled={false} // Prevents flickering at edges of screen
        >
          <CustomShaderMaterial
  ref={(el: any) => (materialRefs.current[index] = el!)}
  baseMaterial={THREE.MeshStandardMaterial}
  vertexShader={vertexShader}
  // 1. Keep uTime in uniforms
  uniforms={{
    uTime: { value: 0 },
    uRippleAges: { value: [99,99,99,99,99,99,99,99,99,99,99,99] },
    uRippleIntensities: { value: [1,1,1,1,1,1,1,1,1,1,1,1] },
    uRippleOrigin: { value: new THREE.Vector3(8, 0, 0) },
    uSectionColor: { value: new THREE.Vector3(1, 0.84, 0.31) },
  }}
  fragmentShader={fragmentShader}
  // 2. PASS TEXTURES AS DIRECT PROPS
  // This tells Three.js: "Turn on texture mapping logic!"
  map={part.material.map} 
  
  // 3. Optional: If your flower has these maps, pass them too:
  // normalMap={part.material.normalMap}
  // roughnessMap={part.material.roughnessMap}
  // emissiveMap={part.material.emissiveMap}

  // 4. Standard Visual Settings
  color={part.material.color}
  roughness={part.material.roughness} 
  metalness={part.material.metalness}
  side={THREE.DoubleSide}
  transparent={true}
  alphaTest={0.5} // Crucial: Cuts out the transparent parts of the leaf cleanly
/>
        </instancedMesh>
      ))}
    </group>
  )
}