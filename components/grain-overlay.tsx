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
varying vec2 vUv;

void main() {
  float t = u_time * 0.3;

  // Slow drifting band position
  float bandY = sin(t) * 0.3 + 0.5;
  float bandY2 = sin(t * 0.7 + 2.0) * 0.25 + 0.45;

  // Soft vertical band
  float band = exp(-pow((vUv.y - bandY) * 3.0, 2.0));
  float band2 = exp(-pow((vUv.y - bandY2) * 4.0, 2.0)) * 0.5;

  // Fade toward one edge horizontally
  float hFade = smoothstep(0.0, 0.8, vUv.x);

  float intensity = (band + band2) * hFade;

  vec3 color = vec3(0.35, 0.06, 0.02) * intensity;
  float alpha = intensity * 0.35;

  gl_FragColor = vec4(color, alpha);
}
`;

const GrainPlane: FC = () => {
  const { viewport } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  const uniforms = useMemo(() => ({
    u_time: { value: 0 },
  }), []);

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.u_time.value += delta;
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

export const GrainOverlay: FC = () => <GrainPlane />;
export default GrainOverlay;
