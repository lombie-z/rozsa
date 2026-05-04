'use client';

import { FC, useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Plane } from '@react-three/drei';
import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float u_time;
uniform float u_resolution_y;
varying vec2 vUv;

void main() {
  float y = vUv.y * u_resolution_y;
  float t = u_time * 12.0;

  // Drifting scan lines — wider bands
  float line = sin((y - t) * 0.3) * 0.5 + 0.5;
  line = smoothstep(0.3, 0.5, line);

  // Slower secondary drift
  float line2 = sin((y - t * 0.6) * 0.6 + 3.14) * 0.5 + 0.5;
  line2 = smoothstep(0.35, 0.55, line2);

  float combined = line * 0.2 + line2 * 0.1;

  gl_FragColor = vec4(combined * 0.6, combined * 0.06, combined * 0.04, combined);
}
`;

const ScanlinePlane: FC = () => {
  const { viewport, size } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  const uniforms = useMemo(() => ({
    u_time: { value: 0 },
    u_resolution_y: { value: size.height },
  }), []);

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.u_time.value += delta;
      materialRef.current.uniforms.u_resolution_y.value = state.size.height;
    }
  });

  return (
    <Plane args={[1, 1]} scale={[viewport.width, viewport.height, 1]}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
      />
    </Plane>
  );
};

export const ScanlineOverlay: FC = () => <ScanlinePlane />;
export default ScanlineOverlay;
