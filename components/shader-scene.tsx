'use client';

import React, { FC, useMemo, useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Plane, Text } from '@react-three/drei';
import * as THREE from 'three';

const MAX_STEPS = 128;
const PRECISION = 0.0005;

type AnimationState = {
  positions: THREE.Vector3[];
  rotations: THREE.Vector3[];
  baseOffsets: {
    x: number;
    y: number;
    posSpeed: THREE.Vector3;
    rotSpeed: THREE.Vector3;
    posPhase: THREE.Vector3;
    rotPhase: THREE.Vector3;
  }[];
};

const createInitialState = (amount: number): AnimationState => ({
  positions: Array.from({ length: amount }, () => new THREE.Vector3(0, 0, 0)),
  rotations: Array.from({ length: amount }, () => new THREE.Vector3(0, 0, 0)),
  baseOffsets: Array.from({ length: amount }, (_, i) => {
    const t = (i / amount) * Math.PI * 2;
    return {
      x: Math.cos(t) * 1.75,
      y: Math.sin(t) * 4.5,
      posSpeed: new THREE.Vector3(0.1 + Math.random() * 1.6, 0.1 + Math.random() * 1.4, 0.05 + Math.random() * 0.8),
      rotSpeed: new THREE.Vector3(0.01 + Math.random() * 0.4, 0.01 + Math.random() * 0.4, 0.01 + Math.random() * 0.4),
      posPhase: new THREE.Vector3(t + Math.random() * Math.PI * 3.0, t * 1.3 + Math.random() * Math.PI * 3.0, t * 0.7 + Math.random() * Math.PI * 3.0),
      rotPhase: new THREE.Vector3(t * 0.5 + Math.random() * Math.PI * 2.0, t * 0.8 + Math.random() * Math.PI * 2.0, t * 1.1 + Math.random() * Math.PI * 2.0),
    };
  }),
});

const GLSL_ROTATE = `
mat4 rotationMatrix(vec3 axis, float angle) {
  axis = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;
  
  return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
              oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
              oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
              0.0,                                0.0,                                0.0,                                1.0);
}
vec3 rotate(vec3 v, vec3 axis, float angle) {
  mat4 m = rotationMatrix(axis, angle);
  return (m * vec4(v, 1.0)).xyz;
}
`;

const GLSL_SDF = `
float sdBox( vec3 p, vec3 b ) {
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}
`;

const GLSL_OPERATIONS = `
float opSmoothUnion( float d1, float d2, float k ) {
  float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
  return mix( d2, d1, h ) - k*h*(1.0-h);
}
`;

const vertexShader = `
varying vec2 v_uv;
void main() {
  v_uv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const createFragmentShader = (amount: number) => `
uniform float u_time;
uniform float u_aspect;
uniform vec3 u_positions[${amount}];
uniform vec3 u_rotations[${amount}];
varying vec2 v_uv;
const int MaxCount = ${amount};

${GLSL_SDF}
${GLSL_OPERATIONS}
${GLSL_ROTATE}

float sdf(vec3 p) {
  vec3 correct = 0.1 * vec3(u_aspect, 1.0, 1.0);
  vec3 tp = p + -u_positions[0] * correct;
  vec3 rp = tp;
  rp = rotate(rp, vec3(1.0, 1.0, 0.0), u_rotations[0].x + u_rotations[0].y);
  float final = sdBox(rp, vec3(0.15)) - 0.03;
  
  for(int i = 1; i < MaxCount; i++) {
    tp = p + -u_positions[i] * correct;
    rp = tp;
    rp = rotate(rp, vec3(1.0, 1.0, 0.0), u_rotations[i].x + u_rotations[i].y);
    float box = sdBox(rp, vec3(0.15)) - 0.03;
    final = opSmoothUnion(final, box, 0.4);
  }
  return final;
}

vec3 calcNormal(in vec3 p) {
  const float h = 0.001;
  return normalize(vec3(
    sdf(p + vec3(h, 0, 0)) - sdf(p - vec3(h, 0, 0)),
    sdf(p + vec3(0, h, 0)) - sdf(p - vec3(0, h, 0)),
    sdf(p + vec3(0, 0, h)) - sdf(p - vec3(0, 0, h))
  ));
}

void main() {
  vec2 centeredUV = (v_uv - 0.5) * vec2(u_aspect, 1.0);
  vec3 ray = normalize(vec3(centeredUV, -1.0));
  
  vec3 camPos = vec3(0.0, 0.0, 2.3);
  vec3 rayPos = camPos;
  float totalDist = 0.0;
  float tMax = 5.0;

  for(int i = 0; i < ${MAX_STEPS}; i++) {
    float dist = sdf(rayPos);
    if (dist < ${PRECISION} || tMax < totalDist) break;
    totalDist += dist;
    rayPos = camPos + totalDist * ray;
  }

  vec3 color = vec3(0.0);
  float alpha = 0.0;

  if(totalDist < tMax) {
    vec3 normal = calcNormal(rayPos);
    vec3 viewDir = normalize(camPos - rayPos);
    
    vec3 lightDir = normalize(vec3(-0.5, 0.8, 0.6));
    float diff = max(dot(normal, lightDir), 0.0);
    
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfDir), 0.0), 32.0);
    
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.0);
    float hue = dot(normal, viewDir) * 3.14159 + u_time * 0.5;
    
    vec3 redShades = vec3(
      sin(hue) * 0.3 + 0.7,
      0.0,
      sin(hue + 1.0) * 0.1
    );
    
    vec3 iridescent = redShades * fresnel * 1.2;
    float rimLight = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
    vec3 rimColor = vec3(1.0, 0.2, 0.2) * rimLight * 0.5;
    float ao = 1.0 - smoothstep(0.0, 0.3, totalDist / tMax);
    
    vec3 baseColor = vec3(0.2, 0.05, 0.05);
    color = baseColor * (0.1 + diff * 0.4) * ao;
    color += iridescent * (0.8 + diff * 0.2);
    color += vec3(1.0, 0.9, 0.8) * spec * 0.6;
    color += rimColor;
    
    float fog = 1.0 - exp(-totalDist * 0.2);
    color = mix(color, vec3(0.0), fog * 0.3);
    alpha = 1.0;
  }
  gl_FragColor = vec4(color, alpha);
}
`;

interface ScreenPlaneProps {
  animationState: AnimationState;
  amount: number;
}

const ScreenPlane: FC<ScreenPlaneProps> = ({ animationState, amount }) => {
  const { viewport, size } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_aspect: { value: size.width / size.height },
      u_positions: { value: animationState.positions },
      u_rotations: { value: animationState.rotations },
    }),
    [] // Empty deps - we update via ref
  );

  const fragmentShader = useMemo(() => createFragmentShader(amount), [amount]);

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.u_time.value += delta;
      materialRef.current.uniforms.u_aspect.value = state.size.width / state.size.height;
      const time = materialRef.current.uniforms.u_time.value;

      animationState.baseOffsets.forEach((offset, i) => {
        const wanderX = Math.sin(time * offset.posSpeed.x + offset.posPhase.x) * 0.8;
        const wanderY = Math.cos(time * offset.posSpeed.y + offset.posPhase.y) * 5;
        const wanderZ = Math.sin(time * offset.posSpeed.z + offset.posPhase.z) * 0.5;

        const secondaryX = Math.cos(time * offset.posSpeed.x * 0.7 + offset.posPhase.x * 1.3) * 0.4;
        const secondaryY = Math.sin(time * offset.posSpeed.y * 0.8 + offset.posPhase.y * 1.1) * 0.3;

        animationState.positions[i].set(offset.x + wanderX + secondaryX, offset.y + wanderY + secondaryY, wanderZ);

        animationState.rotations[i].set(
          time * offset.rotSpeed.x + offset.rotPhase.x,
          time * offset.rotSpeed.y + offset.rotPhase.y,
          time * offset.rotSpeed.z + offset.rotPhase.z
        );

        materialRef.current.uniforms.u_positions.value[i].copy(animationState.positions[i]);
        materialRef.current.uniforms.u_rotations.value[i].copy(animationState.rotations[i]);
      });
    }
  });

  return (
    <Plane args={[1, 1]} scale={[viewport.width, viewport.height, 1]}>
      <shaderMaterial ref={materialRef} uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} transparent={true} />
    </Plane>
  );
};

// Text shader that fades based on proximity to blobs
const textVertexShader = `
varying vec3 vWorldPosition;
void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const createTextFragmentShader = (amount: number) => `
varying vec3 vWorldPosition;
uniform vec3 u_positions[${amount}];

void main() {
  float minDistance = 1000.0;

  for (int i = 0; i < ${amount}; i++) {
     vec3 blobPos = u_positions[i];
     float d = distance(vWorldPosition.xy, blobPos.xy);
     minDistance = min(minDistance, d);
  }
  
  float opacity = smoothstep(3.5, 1.5, minDistance);
  opacity = max(0.15, opacity);

  gl_FragColor = vec4(1.0, 1.0, 1.0, opacity);
}
`;

const SceneText: FC<{ animationState: AnimationState; amount: number }> = ({ animationState, amount }) => {
  const { size } = useThree();
  const isSmall = size.width < 768;
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  const uniforms = useMemo(
    () => ({
      u_positions: { value: animationState.positions },
    }),
    []
  );

  const fragmentShader = useMemo(() => createTextFragmentShader(amount), [amount]);

  useFrame(() => {
    if (materialRef.current) {
      for (let i = 0; i < amount; i++) {
        materialRef.current.uniforms.u_positions.value[i].copy(animationState.positions[i]);
      }
    }
  });

  return (
    <Text position={[0, 0, 2]} fontSize={isSmall ? 2 : 3.5} anchorX='center' anchorY='middle' letterSpacing={0.1} fontWeight='bold'>
      ROZSA
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={textVertexShader}
        fragmentShader={fragmentShader}
        transparent
        blending={THREE.AdditiveBlending}
      />
    </Text>
  );
};

// Fixed amount to avoid recreating animation state
const AMOUNT = 4;

const Scene: FC = () => {
  const animationStateRef = useRef<AnimationState | null>(null);

  if (!animationStateRef.current) {
    animationStateRef.current = createInitialState(AMOUNT);
  }

  const animationState = animationStateRef.current;

  // Initialize positions
  useEffect(() => {
    animationState.baseOffsets.forEach((offset, i) => {
      animationState.positions[i].set(offset.x, offset.y, 0);
      animationState.rotations[i].set(0, 0, 0);
    });
  }, [animationState]);

  return (
    <>
      <ScreenPlane animationState={animationState} amount={AMOUNT} />
      <Suspense fallback={null}>
        <SceneText animationState={animationState} amount={AMOUNT} />
      </Suspense>
    </>
  );
};

export const ShaderScene: FC = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className='absolute inset-0 w-full h-full bg-linear-to-b from-[#120202] to-[#0a0a0a]' />;
  }

  return (
    <div className='absolute inset-0 w-full h-full bg-linear-to-b from-[#120202] to-[#0a0a0a]'>
      <Canvas
        camera={{
          position: [0, 0, 15],
          fov: 50,
          near: 0.1,
          far: 2000,
        }}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <Scene />
      </Canvas>
    </div>
  );
};

export default ShaderScene;
