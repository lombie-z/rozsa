'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Plane } from '@react-three/drei';
import * as THREE from 'three';

const PI = 3.1415;

// Quality presets — mobile uses halved iteration counts to stay within GPU budget
const QUALITY = {
  high: { NUM_STEPS: 8, ITER_GEOMETRY: 3, ITER_FRAGMENT: 5 },
  low:  { NUM_STEPS: 4, ITER_GEOMETRY: 2, ITER_FRAGMENT: 3 },
} as const;
const SEA_HEIGHT = 0.6;
const SEA_CHOPPY = 4.0;
const SEA_SPEED = 1.0;
const SEA_FREQ = 0.16;
// Changed to red/black theme
const SEA_BASE = 'vec3(0.05, 0.0, 0.0)';
const SEA_WATER_COLOR = 'vec3(0.5, 0.05, 0.05)';

const vertexShader = `
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`;

const createFragmentShader = (lowQuality: boolean) => {
  const q = lowQuality ? QUALITY.low : QUALITY.high;
  return `
  uniform float iGlobalTime;
  uniform vec2 iResolution;
  uniform float u_scrollProgress;

  const int NUM_STEPS = ${q.NUM_STEPS};
  const float PI = 3.1415;
  const float EPSILON = 0.001;

  // sea variables
  const int ITER_GEOMETRY = ${q.ITER_GEOMETRY};
  const int ITER_FRAGMENT = ${q.ITER_FRAGMENT};
  const float SEA_HEIGHT = ${SEA_HEIGHT.toFixed(1)};
  const float SEA_CHOPPY = ${SEA_CHOPPY.toFixed(1)};
  const float SEA_SPEED = ${SEA_SPEED.toFixed(1)};
  const float SEA_FREQ = ${SEA_FREQ.toFixed(2)};
  const vec3 SEA_BASE = ${SEA_BASE};
  const vec3 SEA_WATER_COLOR = ${SEA_WATER_COLOR};
  mat2 octave_m = mat2(1.6,1.2,-1.2,1.6);

  mat3 fromEuler(vec3 ang) {
    vec2 a1 = vec2(sin(ang.x),cos(ang.x));
    vec2 a2 = vec2(sin(ang.y),cos(ang.y));
    vec2 a3 = vec2(sin(ang.z),cos(ang.z));
    mat3 m;
    m[0] = vec3(
      a1.y*a3.y+a1.x*a2.x*a3.x,
      a1.y*a2.x*a3.x+a3.y*a1.x,
      -a2.y*a3.x
    );
    m[1] = vec3(-a2.y*a1.x,a1.y*a2.y,a2.x);
    m[2] = vec3(
      a3.y*a1.x*a2.x+a1.y*a3.x,
      a1.x*a3.x-a1.y*a3.y*a2.x,
      a2.y*a3.y
    );
    return m;
  }

  float hash(vec2 p) {
    float h = dot(p,vec2(127.1,311.7));	
    return fract(sin(h)*43758.5453123);
  }

  float noise(in vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);	
    vec2 u = f * f * (3.0 - 2.0 * f);
    return -1.0 + 2.0 * mix(
      mix(
        hash(i + vec2(0.0,0.0)
      ), 
        hash(i + vec2(1.0,0.0)), u.x),
      mix(hash(i + vec2(0.0,1.0) ), 
        hash(i + vec2(1.0,1.0) ), u.x), 
      u.y
    );
  }

  float diffuse(vec3 n,vec3 l,float p) {
    return pow(dot(n,l) * 0.4 + 0.6,p);
  }

  float specular(vec3 n,vec3 l,vec3 e,float s) {    
    float nrm = (s + 8.0) / (${PI} * 8.0);
    return pow(max(dot(reflect(e,n),l),0.0),s) * nrm;
  }

  vec3 getSkyColor(vec3 e) {
    e.y = max(e.y, 0.0);
    vec3 ret;
    // Red/black gradient for sky
    ret.x = pow(1.0 - e.y, 2.0) * 0.6;
    ret.y = 0.0;
    ret.z = 0.0;
    return ret;
  }

  float sea_octave(vec2 uv, float choppy) {
    uv += noise(uv);         
    vec2 wv = 1.0 - abs(sin(uv));
    vec2 swv = abs(cos(uv));    
    wv = mix(wv, swv, wv);
    return pow(1.0 - pow(wv.x * wv.y, 0.65), choppy);
  }

  float map(vec3 p, float seaTime) {
    float freq = SEA_FREQ;
    float amp = SEA_HEIGHT;
    float choppy = SEA_CHOPPY;
    vec2 uv = p.xz; 
    uv.x *= 0.75;
    float d, h = 0.0;    
    for(int i = 0; i < ITER_GEOMETRY; i++) {        
      d = sea_octave((uv + seaTime) * freq, choppy);
      d += sea_octave((uv - seaTime) * freq, choppy);
      h += d * amp;        
      uv *= octave_m;
      freq *= 1.9; 
      amp *= 0.22;
      choppy = mix(choppy, 1.0, 0.2);
    }
    return p.y - h;
  }

  float map_detailed(vec3 p, float seaTime) {
      float freq = SEA_FREQ;
      float amp = SEA_HEIGHT;
      float choppy = SEA_CHOPPY;
      vec2 uv = p.xz;
      uv.x *= 0.75;
      float d, h = 0.0;    
      for(int i = 0; i < ITER_FRAGMENT; i++) {        
        d = sea_octave((uv+seaTime) * freq, choppy);
        d += sea_octave((uv-seaTime) * freq, choppy);
        h += d * amp;        
        uv *= octave_m;
        freq *= 1.9; 
        amp *= 0.22;
        choppy = mix(choppy,1.0,0.2);
      }
      return p.y - h;
  }

  vec3 getSeaColor(
    vec3 p,
    vec3 n,
    vec3 l,
    vec3 eye,
    vec3 dist,
    float centerWeight
  ) {
    float fresnel = clamp(1.0 - dot(n,-eye), 0.0, 1.0);
    fresnel = min(fresnel * fresnel * fresnel, 0.5);
    vec3 reflected = getSkyColor(reflect(eye,n));
    vec3 refracted = SEA_BASE + diffuse(n,l,80.0) * SEA_WATER_COLOR * 0.12;
    vec3 color = mix(refracted,reflected,fresnel);
    float atten = max(1.0 - dot(dist,dist) * 0.001, 0.0);
    color += SEA_WATER_COLOR * (p.y - SEA_HEIGHT) * 0.18 * atten;
    float spec = specular(n,l,eye,80.0) * (0.3 + centerWeight * 1.7);
    color *= 1.0 - clamp(spec, 0.0, 0.8);
    return color;
  }

  // tracing
  vec3 getNormal(vec3 p, float eps, float seaTime) {
    vec3 n;
    n.y = map_detailed(p, seaTime);    
    n.x = map_detailed(vec3(p.x+eps,p.y,p.z), seaTime) - n.y;
    n.z = map_detailed(vec3(p.x,p.y,p.z+eps), seaTime) - n.y;
    n.y = eps;
    return normalize(n);
  }

  float heightMapTracing(vec3 ori, vec3 dir, out vec3 p, float seaTime) {  
    float tm = 0.0;
    float tx = 1000.0;    
    float hx = map(ori + dir * tx, seaTime);
    if(hx > 0.0) {
      return tx;   
    }
    float hm = map(ori + dir * tm, seaTime);    
    float tmid = 0.0;
    for(int i = 0; i < NUM_STEPS; i++) {
      tmid = mix(tm,tx, hm/(hm-hx));                   
      p = ori + dir * tmid;                   
      float hmid = map(p, seaTime);
      if(hmid < 0.0) {
        tx = tmid;
        hx = hmid;
      } else {
        tm = tmid;
        hm = hmid;
       }
    }
    return tmid;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    uv = uv * 2.0 - 1.0;
    uv.x *= iResolution.x / iResolution.y;    
    float time = mod(iGlobalTime * 0.3, 1000.0);
    float seaTime = mod(iGlobalTime * SEA_SPEED, 1000.0);
    float epsilonNrm = 0.1 / iResolution.x;
    
    // Depth effect: move camera deeper based on scroll progress
    float depthOffset = u_scrollProgress * 2.5;
    float darkenFactor = u_scrollProgress * 0.6;
    
    // ray
    vec3 ang = vec3(
      sin(time*3.0)*0.1,sin(time)*0.2+0.3,time
    );    
    // Move camera deeper as we scroll (simulate going underwater)
    vec3 ori = vec3(0.0, 3.5 - depthOffset, mod(time*5.0, 1000.0) - depthOffset);
    vec3 dir = normalize(
      vec3(uv.xy,-2.0)
    );
    dir.z += length(uv) * 0.15;
    dir = normalize(dir);
    // tracing
    vec3 p;
    heightMapTracing(ori,dir,p,seaTime);
    vec3 dist = p - ori;
    vec3 n = getNormal(
      p,
      dot(dist,dist) * epsilonNrm,
      seaTime
    );
    vec3 light = normalize(vec3(0.0,1.0,-0.8));
    float screenDist = length(uv);
    float centerWeight = exp(-screenDist * screenDist * 0.3);
    // color
    vec3 color = mix(
      getSkyColor(dir),
      getSeaColor(p,n,light,dir,dist,centerWeight),
      pow(smoothstep(0.0,-0.05,dir.y),0.3)
    );
    
    // Apply darkening and depth effects based on scroll progress
    // Darken colors as we go deeper (more black, less red)
    vec3 deepColor = mix(color, vec3(0.0, 0.0, 0.0), darkenFactor);
    color = mix(color, deepColor, u_scrollProgress);
    
    // Increase fog/attenuation for deeper water appearance
    float depthFog = 1.0 - exp(-dot(dist,dist) * (0.2 + u_scrollProgress * 0.3));
    color = mix(color, vec3(0.0, 0.0, 0.0), depthFog * (0.3 + u_scrollProgress * 0.4));
    
    // post
    gl_FragColor = vec4(pow(color,vec3(0.65)), 1.0);
  }
`;
};

interface WaterShaderProps {
  scrollProgress?: number;
  lowQuality?: boolean;
}

export const WaterShader: React.FC<WaterShaderProps> = ({ scrollProgress = 0, lowQuality = false }) => {
  const { size } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial>(null!);
  const timeRef = useRef(0);

  const uniforms = useMemo(
    () => ({
      iGlobalTime: { value: 0 },
      iResolution: { value: new THREE.Vector2(size.width, size.height) },
      u_scrollProgress: { value: 0 },
    }),
    []
  );

  const fragmentShader = useMemo(() => createFragmentShader(lowQuality), [lowQuality]);

  // Initialize resolution
  useEffect(() => {
    if (materialRef.current?.uniforms) {
      materialRef.current.uniforms.iResolution.value.set(size.width, size.height);
      materialRef.current.uniforms.u_scrollProgress.value = scrollProgress;
    }
  }, [size.width, size.height, scrollProgress]);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    if (materialRef.current?.uniforms) {
      timeRef.current += delta;
      materialRef.current.uniforms.iGlobalTime.value = timeRef.current;
      materialRef.current.uniforms.u_scrollProgress.value = scrollProgress;
      // Update resolution to match actual canvas pixel size
      materialRef.current.uniforms.iResolution.value.set(state.size.width, state.size.height);
    }
  });

  // Fullscreen plane - with orthographic camera, we need to cover the viewport
  // The vertex shader uses position directly, so we scale to cover screen space
  return (
    <Plane args={[2, 2]} scale={1}>
      <shaderMaterial ref={materialRef} uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} />
    </Plane>
  );
};

export default WaterShader;
