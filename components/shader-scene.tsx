'use client';

import React, { FC, useMemo, useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Plane, Text } from '@react-three/drei';
import * as THREE from 'three';

// Quality presets — mobile uses fewer raymarching steps and blobs to stay within GPU budget
const SHADER_QUALITY = {
  high: { MAX_STEPS: 80, PRECISION: 0.001, AMOUNT: 4 },
  low:  { MAX_STEPS: 64,  PRECISION: 0.001,  AMOUNT: 2 },
} as const;

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

const createFragmentShader = (amount: number, maxSteps: number, precision: number) => `
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
  float d = sdf(p);
  return normalize(vec3(
    sdf(p + vec3(h, 0, 0)) - d,
    sdf(p + vec3(0, h, 0)) - d,
    sdf(p + vec3(0, 0, h)) - d
  ));
}

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 centeredUV = (v_uv - 0.5) * vec2(u_aspect, 1.0);
  vec3 ray = normalize(vec3(centeredUV, -1.0));

  vec3 camPos = vec3(0.0, 0.0, 2.3);
  vec3 rayPos = camPos;
  float totalDist = 0.0;
  float tMax = 5.0;

  for(int i = 0; i < ${maxSteps}; i++) {
    float dist = sdf(rayPos);
    if (dist < ${precision} || tMax < totalDist) break;
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
    
    // Brand blue-green (the section-1 album glow vec3(0.10,0.55,0.62)): green high,
    // blue close to green (teal), not pegged at 1.0.
    vec3 blueShades = vec3(
      sin(hue + 1.0) * 0.12 + 0.12,
      sin(hue) * 0.22 + 0.66,
      sin(hue) * 0.18 + 0.74
    );

    vec3 iridescent = blueShades * fresnel * 1.2;

    // Harsh backlight: a tight, blown-out silhouette rim (was a soft teal halo).
    float rimLight = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.0);
    float ao = 1.0 - smoothstep(0.0, 0.3, totalDist / tMax);

    // Darkish-blue cube body (reads blue, not black) with a faint blue sheen.
    vec3 baseColor = vec3(0.06, 0.16, 0.34);
    color = baseColor * (0.4 + diff * 0.3) * ao;
    color += iridescent * 0.35;

    // Bright saturated red light — diffuse glance, hot spec, harsh backlight rim.
    vec3 redLight = vec3(1.0, 0.06, 0.05);
    color += redLight * diff * 0.5;
    color += redLight * spec * 1.4;
    float rim = rimLight * 2.0;
    color += redLight * rim;

    // Thin cyan edge keeps the chromatic-aberration split alive on one side.
    color += vec3(0.12, 0.7, 1.0) * rim * 0.35 * smoothstep(0.0, 0.5, -normal.x);

    // Mild contrast — keep the blue body alive, let the red blow out.
    color = max(color - 0.005, 0.0) * 1.1;
    alpha = 1.0;
  }

  // Film grain over the frame — roughs up the polish to match the rest of the site.
  float grain = hash21(gl_FragCoord.xy + u_time * 53.0) - 0.5;
  color += grain * 0.10 * alpha;

  gl_FragColor = vec4(color, alpha);
}
`;

interface ScreenPlaneProps {
  animationState: AnimationState;
  amount: number;
  maxSteps: number;
  precision: number;
  active?: boolean;
}

const ScreenPlane: FC<ScreenPlaneProps> = ({ animationState, amount, maxSteps, precision, active = true }) => {
  const { viewport, size } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial>(null!);
  const intensityRef = useRef(0);

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_aspect: { value: size.width / size.height },
      u_positions: { value: animationState.positions },
      u_rotations: { value: animationState.rotations },
    }),
    [] // Empty deps - we update via ref
  );

  const fragmentShader = useMemo(() => createFragmentShader(amount, maxSteps, precision), [amount, maxSteps, precision]);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    if (materialRef.current) {
      const target = active ? 1 : 0;
      intensityRef.current += (target - intensityRef.current) * Math.min(delta * 0.6, 1);
      const intensity = intensityRef.current;

      materialRef.current.uniforms.u_time.value += delta;
      materialRef.current.uniforms.u_aspect.value = state.size.width / state.size.height;
      const time = materialRef.current.uniforms.u_time.value;

      animationState.baseOffsets.forEach((offset, i) => {
        const wanderX = Math.sin(time * offset.posSpeed.x + offset.posPhase.x) * 0.8 * intensity;
        const wanderY = Math.cos(time * offset.posSpeed.y + offset.posPhase.y) * 5 * intensity;
        const wanderZ = Math.sin(time * offset.posSpeed.z + offset.posPhase.z) * 0.5 * intensity;

        const secondaryX = Math.cos(time * offset.posSpeed.x * 0.7 + offset.posPhase.x * 1.3) * 0.4 * intensity;
        const secondaryY = Math.sin(time * offset.posSpeed.y * 0.8 + offset.posPhase.y * 1.1) * 0.3 * intensity;

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
uniform float u_time;

void main() {
  float minDistance = 1000.0;

  for (int i = 0; i < ${amount}; i++) {
     vec3 blobPos = u_positions[i];
     float d = distance(vWorldPosition.xy, blobPos.xy);
     minDistance = min(minDistance, d);
  }
  
  // Two separate falloffs: a wide one reveals the red text over a broad halo, and a
  // tight one shifts only the dense centre of an intersection to the brand blue.
  float proxOpacity = smoothstep(3.5, 1.2, minDistance); // wide red reveal
  float proxBlue    = smoothstep(1.3, 0.35, minDistance); // tight blue core

  // Dark "black iridescence" (raven feather / labradorite) where the cubes pass:
  // a near-black base shimmering through steel-blue and cool silver-grey, the channel
  // phase offsets giving the hue shift, plus a sharp silver flash for the glint.
  float t = dot(vWorldPosition.xy, vec2(0.12)) + u_time * 0.25 + minDistance * 0.5;
  vec3 baseI = vec3(0.11, 0.15, 0.22);
  vec3 irid = baseI + baseI * cos(6.2831 * (t + vec3(0.0, 0.06, 0.14)));
  float flash = pow(0.5 + 0.5 * cos(6.2831 * t), 6.0);   // tight peaks
  irid += vec3(0.16, 0.2, 0.26) * flash;                  // cool silver glint

  vec3 redCol = vec3(0.55, 0.1, 0.1);   // brighter than the scene reds so it reads
  vec3 col = mix(redCol, irid, proxBlue);

  float opacity = max(0.38, proxOpacity);

  gl_FragColor = vec4(col, opacity);
}
`;

const SceneText: FC<{ animationState: AnimationState; amount: number }> = ({ animationState, amount }) => {
  const { size, viewport } = useThree();
  const isSmall = size.width < 768;
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  const uniforms = useMemo(
    () => ({
      u_positions: { value: animationState.positions },
      u_time: { value: 0 },
    }),
    []
  );

  const fragmentShader = useMemo(() => createTextFragmentShader(amount), [amount]);

  useFrame((_, rawDelta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.u_time.value += Math.min(rawDelta, 0.1);
      for (let i = 0; i < amount; i++) {
        materialRef.current.uniforms.u_positions.value[i].copy(animationState.positions[i]);
      }
    }
  });

  return (
    <Text position={[0, 0, 2]} fontSize={isSmall ? Math.min(1.6, viewport.width * 0.42) : 3.5} anchorX='center' anchorY='middle' letterSpacing={0.1} font='/fonts/UnifrakturMaguntia-Regular.ttf'>
      rozsa
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

interface SceneProps {
  amount: number;
  maxSteps: number;
  precision: number;
  active?: boolean;
}

const Scene: FC<SceneProps> = ({ amount, maxSteps, precision, active = true }) => {
  const animationStateRef = useRef<AnimationState | null>(null);

  // Re-create animation state only when blob count changes
  if (!animationStateRef.current || animationStateRef.current.positions.length !== amount) {
    animationStateRef.current = createInitialState(amount);
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
      <ScreenPlane animationState={animationState} amount={amount} maxSteps={maxSteps} precision={precision} active={active} />
      <Suspense fallback={null}>
        <SceneText animationState={animationState} amount={amount} />
      </Suspense>
    </>
  );
};

interface ShaderSceneProps {
  lowQuality?: boolean;
  active?: boolean;
}

export const ShaderScene: FC<ShaderSceneProps> = React.memo(({ lowQuality = false, active = true }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const quality = lowQuality ? SHADER_QUALITY.low : SHADER_QUALITY.high;

  if (!mounted) {
    return <div className='absolute inset-0 w-full h-full bg-black' />;
  }

  return (
    <div className='absolute inset-0 w-full h-full bg-black'>
      <Canvas
        camera={{
          position: [0, 0, 15],
          fov: 50,
          near: 0.1,
          far: 2000,
        }}
        gl={{
          alpha: true,
          antialias: !lowQuality,
          powerPreference: 'high-performance',
        }}
        dpr={lowQuality ? [1, 1] : [1, 1.5]}
        style={{ width: '100%', height: '100%' }}
        frameloop='always'
      >
        <Scene amount={quality.AMOUNT} maxSteps={quality.MAX_STEPS} precision={quality.PRECISION} active={active} />
      </Canvas>
    </div>
  );
});

ShaderScene.displayName = 'ShaderScene';

export default ShaderScene;
