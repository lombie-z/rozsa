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

const fragmentShaderDark = `
uniform float u_time;
uniform float u_aspect;
varying vec2 vUv;

// Simplex-style noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                           + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                           dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float f = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    f += amp * snoise(p);
    p *= 2.1;
    amp *= 0.5;
  }
  return f;
}

void main() {
  vec2 uv = vUv;
  uv.x *= u_aspect;
  float t = u_time * 0.003;

  // Scale down for bigger shapes
  vec2 suv = uv * 0.3;

  // Domain warping — use sin/cos oscillation instead of linear drift
  vec2 q = vec2(fbm(suv + vec2(sin(t * 0.7), cos(t * 0.5)) * 0.8), fbm(suv + vec2(5.2, 1.3) + vec2(cos(t * 0.6), sin(t * 0.4)) * 0.8));
  vec2 r = vec2(fbm(suv + q * 5.0 + vec2(1.7, 9.2) + vec2(sin(t * 0.5), cos(t * 0.3)) * 0.6),
                fbm(suv + q * 5.0 + vec2(8.3, 2.8) + vec2(cos(t * 0.4), sin(t * 0.6)) * 0.6));
  float f = fbm(suv + r * 4.0);

  // Shape the noise into organic blobs
  float shape = smoothstep(-0.2, 0.6, f);
  shape *= smoothstep(-0.4, 0.3, f + 0.1 * snoise(suv * 3.0 + t));

  // Dark base with subtle red highlights
  vec3 color = vec3(0.0);
  color = mix(color, vec3(0.18, 0.02, 0.02), shape * 0.8);
  color += vec3(0.3, 0.04, 0.02) * smoothstep(0.3, 0.8, f) * 0.4;

  // Subtle edge glow
  float edge = smoothstep(0.25, 0.35, shape) - smoothstep(0.35, 0.55, shape);
  color += vec3(0.4, 0.06, 0.04) * edge * 0.6;

  float alpha = shape * 0.4;

  gl_FragColor = vec4(color, alpha);
}
`;

const fragmentShaderLight = `
uniform float u_time;
uniform float u_aspect;
varying vec2 vUv;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                           + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                           dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float f = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    f += amp * snoise(p);
    p *= 2.1;
    amp *= 0.5;
  }
  return f;
}

void main() {
  vec2 uv = vUv;
  uv.x *= u_aspect;
  float t = u_time * 0.003;

  vec2 suv = uv * 0.3;

  vec2 q = vec2(fbm(suv + vec2(sin(t * 0.7), cos(t * 0.5)) * 0.8), fbm(suv + vec2(5.2, 1.3) + vec2(cos(t * 0.6), sin(t * 0.4)) * 0.8));
  vec2 r = vec2(fbm(suv + q * 5.0 + vec2(1.7, 9.2) + vec2(sin(t * 0.5), cos(t * 0.3)) * 0.6),
                fbm(suv + q * 5.0 + vec2(8.3, 2.8) + vec2(cos(t * 0.4), sin(t * 0.6)) * 0.6));
  float f = fbm(suv + r * 4.0);

  float shape = smoothstep(-0.2, 0.6, f);
  shape *= smoothstep(-0.4, 0.3, f + 0.1 * snoise(suv * 3.0 + t));

  vec3 color = vec3(0.15);
  color = mix(color, vec3(0.6, 0.58, 0.55), shape * 0.8);
  color += vec3(0.8, 0.78, 0.75) * smoothstep(0.3, 0.8, f) * 0.3;

  float edge = smoothstep(0.25, 0.35, shape) - smoothstep(0.35, 0.55, shape);
  color += vec3(0.9, 0.88, 0.85) * edge * 0.4;

  float alpha = shape * 0.35;

  gl_FragColor = vec4(color, alpha);
}
`;

const fragmentShaderBlue = `
uniform float u_time;
uniform float u_aspect;
varying vec2 vUv;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                           + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                           dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float f = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    f += amp * snoise(p);
    p *= 2.1;
    amp *= 0.5;
  }
  return f;
}

void main() {
  vec2 uv = vUv;
  uv.x *= u_aspect;
  float t = u_time * 0.003;

  vec2 suv = uv * 0.3;

  vec2 q = vec2(fbm(suv + vec2(sin(t * 0.7), cos(t * 0.5)) * 0.8), fbm(suv + vec2(5.2, 1.3) + vec2(cos(t * 0.6), sin(t * 0.4)) * 0.8));
  vec2 r = vec2(fbm(suv + q * 5.0 + vec2(1.7, 9.2) + vec2(sin(t * 0.5), cos(t * 0.3)) * 0.6),
                fbm(suv + q * 5.0 + vec2(8.3, 2.8) + vec2(cos(t * 0.4), sin(t * 0.6)) * 0.6));
  float f = fbm(suv + r * 4.0);

  float shape = smoothstep(-0.2, 0.6, f);
  shape *= smoothstep(-0.4, 0.3, f + 0.1 * snoise(suv * 3.0 + t));

  // Mostly icy, with horizontal blue streaks bleeding left from cube center
  float cy = abs(vUv.y - 0.5);
  // Wider vertical band matching cube height
  float verticalMask = 1.0 - smoothstep(0.08, 0.3, cy);
  // Blue starts bright at cube center, holds strong, then fades toward left edge
  float leftMask = smoothstep(-0.1, 0.35, vUv.x) * (1.0 - smoothstep(0.55, 0.7, vUv.x));
  // Horizontal streaks via stretched noise, more diffused
  float streaks = snoise(vec2(vUv.x * 1.5 - t * 3.0, vUv.y * 5.0)) * 0.5 + 0.5;
  streaks = smoothstep(0.2, 0.8, streaks);
  // blend = 1 is icy, 0 is blue
  float blend = 1.0 - (leftMask * verticalMask * streaks * 0.9);
  blend = clamp(blend, 0.0, 1.0);

  vec3 deepBase = vec3(0.0, 0.12, 0.18);
  vec3 icyBase  = vec3(0.06, 0.06, 0.08);
  vec3 deepMid  = vec3(0.0, 0.75, 0.90);
  vec3 icyMid   = vec3(0.12, 0.13, 0.15);
  vec3 deepHi   = vec3(0.0, 0.86, 1.0);
  vec3 icyHi    = vec3(0.16, 0.17, 0.20);
  vec3 deepEdge = vec3(0.0, 0.90, 1.0);
  vec3 icyEdge  = vec3(0.20, 0.21, 0.24);

  vec3 color = mix(deepBase, icyBase, blend);
  color = mix(color, mix(deepMid, icyMid, blend), shape * 0.9);
  color += mix(deepHi, icyHi, blend) * smoothstep(0.3, 0.8, f) * 0.4;

  float edge = smoothstep(0.25, 0.35, shape) - smoothstep(0.35, 0.55, shape);
  color += mix(deepEdge, icyEdge, blend) * edge * 0.5;

  float alpha = shape * 0.35;

  gl_FragColor = vec4(color, alpha);
}
`;

const FluidPlane: FC<{ light?: boolean; blue?: boolean }> = ({ light = false, blue = false }) => {
  const { viewport, size } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  const uniforms = useMemo(() => ({
    u_time: { value: 0 },
    u_aspect: { value: size.width / size.height },
  }), []);

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.u_time.value += delta;
      materialRef.current.uniforms.u_aspect.value = state.size.width / state.size.height;
    }
  });

  return (
    <Plane args={[1, 1]} scale={[viewport.width, viewport.height, 1]}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={blue ? fragmentShaderBlue : light ? fragmentShaderLight : fragmentShaderDark}
        transparent
      />
    </Plane>
  );
};

export const FluidOverlay: FC<{ light?: boolean; blue?: boolean }> = ({ light = false, blue = false }) => {
  return (
    <FluidPlane light={light} blue={blue} />
  );
};

export default FluidOverlay;
