'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Center } from '@react-three/drei';
import * as THREE from 'three';

useGLTF.preload('/models/ice_cube.glb');

const iceVertexShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewDir;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const iceFragmentShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewDir;

  uniform float uTime;

  void main() {
    float fresnel = 1.0 - abs(dot(vNormal, vViewDir));
    fresnel = pow(fresnel, 2.0);

    // Base color — dark with red tint, like the ROZSA shader cubes
    vec3 baseColor = vec3(0.15, 0.03, 0.03);

    // Red iridescent fresnel — matches shader-scene style
    float hue = dot(vNormal, vViewDir) * 3.14159 + uTime * 0.5;
    vec3 redShades = vec3(
      sin(hue) * 0.3 + 0.7,
      0.0,
      sin(hue + 1.0) * 0.1
    );
    vec3 iridescent = redShades * fresnel * 1.2;

    // Red rim light
    float rimLight = pow(fresnel, 3.0);
    vec3 rimColor = vec3(1.0, 0.2, 0.2) * rimLight * 0.5;

    // Key light — diffuse + specular
    vec3 lightDir = normalize(vec3(-0.5, 0.8, 0.6));
    float diff = max(dot(vNormal, lightDir), 0.0);
    vec3 halfDir = normalize(vViewDir + lightDir);
    float spec = pow(max(dot(vNormal, halfDir), 0.0), 32.0);

    vec3 iceColor = baseColor * (0.1 + diff * 0.4);
    iceColor += iridescent * (0.8 + diff * 0.2);
    iceColor += vec3(1.0, 0.9, 0.8) * spec * 0.6;
    iceColor += rimColor;

    float alpha = mix(0.12, 0.55, fresnel);

    gl_FragColor = vec4(iceColor, alpha);
  }
`;

interface Props {
  tiltRef: React.RefObject<{ rx: number; ry: number }>;
}

export default function IceCube3D({ tiltRef }: Props) {
  const { scene } = useGLTF('/models/ice_cube.glb');
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  const iceMaterial = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: iceVertexShader,
      fragmentShader: iceFragmentShader,
      uniforms: { uTime: { value: 0 } },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    materialRef.current = mat;
    return mat;
  }, []);

  const clonedScene = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = iceMaterial;
      }
    });
    return c;
  }, [scene, iceMaterial]);

  useFrame(({ clock }) => {
    if (!groupRef.current || !tiltRef.current) return;
    const t = clock.getElapsedTime();
    const { rx, ry } = tiltRef.current;
    groupRef.current.rotation.x += (rx - groupRef.current.rotation.x) * 0.05;
    groupRef.current.rotation.y += (ry - groupRef.current.rotation.y) * 0.05;
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = t;
    }
  });

  return (
    <group ref={groupRef}>
      <Center>
        <primitive object={clonedScene} scale={2.0} />
      </Center>
    </group>
  );
}
