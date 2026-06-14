'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import MusicArtwork from '@/components/record';
import RoseNav from '@/components/rose-nav';
import LoadingScreen from '@/components/loading-screen';
import { useIsMobile, usePrefersReducedMotion } from '@/lib/use-mobile';
import { PlayingProvider, usePlaying } from '@/lib/playing-context';

// Caps a 'demand' Canvas to `hz` fps by invalidating at that rate while `run` is true
// (and pauses entirely when false). Lets the slow liquid scenes render at 30 to halve
// their GPU cost, while the loop pauses off-screen.
function FpsCap({ run, hz = 30 }: { run: boolean; hz?: number }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    let last = -Infinity;
    const minInterval = 1000 / hz - 1.5; // tolerance so we land on ~30, not ~20, fps
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last >= minInterval) {
        last = t;
        invalidate();
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [run, hz, invalidate]);
  return null;
}

function FlowerModel({ hovered }: { hovered: boolean }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { nodes, materials } = useGLTF('/DesertLily.glb') as any;
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const glowRef = useRef(0);

  useFrame((state, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.5;
    glowRef.current += ((hovered ? 1 : 0) - glowRef.current) * 0.08;
    if (matRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 1.5) * 0.5 + 0.5;
      matRef.current.emissiveIntensity = glowRef.current * (0.4 + pulse * 0.8);
    }
  });

  return (
    <mesh ref={ref} geometry={nodes.DeserLily_Mesh.geometry} scale={0.35} position={[0, -0.9, 0]} rotation={[0.3, 0, 0.1]}>
      <meshStandardMaterial
        ref={matRef}
        {...materials.DeserLily_Mat}
        emissive={new THREE.Color('#EC407A')}
        emissiveIntensity={0.5}
      />
    </mesh>
  );
}

function SelectionLink() {
  const [hovered, setHovered] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const frameRef = useRef(0);
  const phaseRef = useRef(0);

  const basePoints = [
    { x: 14, y: 8 },
    { x: 34, y: 8 },
    { x: 24, y: 32 },
  ];

  useEffect(() => {
    let raf: number;
    const animate = () => {
      frameRef.current += 0.015;
      phaseRef.current = frameRef.current % 6;
      const svg = svgRef.current;
      if (!svg) { raf = requestAnimationFrame(animate); return; }

      const t = frameRef.current;
      const drift = hovered ? 0 : 1;
      const pts = basePoints.map((p, i) => ({
        x: p.x + Math.sin(t * 0.7 + i * 2.1) * 4 * drift,
        y: p.y + Math.cos(t * 0.9 + i * 1.7) * 3 * drift,
      }));

      const phase = phaseRef.current;
      const lines = svg.querySelectorAll('line');
      const rects = svg.querySelectorAll('rect');

      for (let i = 0; i < 3; i++) {
        const from = pts[i];
        const to = pts[(i + 1) % 3];
        const line = lines[i];
        const rect = rects[i];
        if (!line || !rect) continue;

        rect.setAttribute('x', String(from.x - 3));
        rect.setAttribute('y', String(from.y - 3));

        const segmentPhase = phase - i * 1.2;
        if (segmentPhase < 0) {
          line.setAttribute('opacity', '0');
        } else if (segmentPhase < 0.8) {
          const p = segmentPhase / 0.8;
          line.setAttribute('x1', String(from.x));
          line.setAttribute('y1', String(from.y));
          line.setAttribute('x2', String(from.x + (to.x - from.x) * p));
          line.setAttribute('y2', String(from.y + (to.y - from.y) * p));
          line.setAttribute('opacity', '1');
        } else {
          line.setAttribute('x1', String(from.x));
          line.setAttribute('y1', String(from.y));
          line.setAttribute('x2', String(to.x));
          line.setAttribute('y2', String(to.y));
          line.setAttribute('opacity', '1');
        }

        rect.setAttribute('opacity', segmentPhase >= -0.3 ? '1' : '0');
      }

      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [hovered]);

  return (
    <a
      href="https://arrhythmia.isaacrozsa.com"
      target="_blank"
      rel="noopener noreferrer"
      className="relative py-2 self-end"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        filter: hovered
          ? 'drop-shadow(0 0 14px rgba(37, 99, 235, 0.6))'
          : 'drop-shadow(0 0 0px transparent)',
        transition: 'filter 300ms ease-out',
      }}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 48 40"
        style={{ width: 48, height: 40 }}
      >
        <line stroke="#2563eb" strokeWidth={1.2} opacity={0} />
        <line stroke="#2563eb" strokeWidth={1.2} opacity={0} />
        <line stroke="#2563eb" strokeWidth={1.2} opacity={0} />
        {basePoints.map((_, i) => (
          <rect
            key={i}
            width={6}
            height={6}
            fill="white"
            stroke="#2563eb"
            strokeWidth={0.8}
            opacity={0}
          />
        ))}
      </svg>
    </a>
  );
}

function FlowerLink() {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href="https://goodtalk.isaacrozsa.com"
      target="_blank"
      rel="noopener noreferrer"
      className="relative py-2 self-end"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="block" style={{ width: 48, height: 48 }}>
        <Canvas camera={{ position: [0, 0, 3], fov: 40 }} style={{ width: '100%', height: '100%' }} gl={{ alpha: true }}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[3, 4, 2]} intensity={1} />
          <FlowerModel hovered={hovered} />
        </Canvas>
      </span>
    </a>
  );
}

const ShaderScene = dynamic(() => import('@/components/shader-scene'), { ssr: false });
const WaterShader = dynamic(() => import('@/components/water-shader').then((mod) => ({ default: mod.WaterShader })), { ssr: false });
const FluidOverlay = dynamic(() => import('@/components/fluid-overlay'), { ssr: false });

const landingRecord = { artist: 'Isaac Rozsa', music: 'Prologue', albumArt: '/albums/prologue.png', audioSrc: '/audio/solemn10.mp3', isSong: true, plasticWrap: 1 as const, subjects: ['/subject.png', '/subject2.png'] as [string, string] };
const newEyeRecord = { artist: 'Isaac Rozsa', music: 'Dude Like Dust', albumArt: '/albums/dude-like-dust.png', audioSrc: '/audio/dude-like-dust.mp3', isSong: true, plasticWrap: 2 as const, subjects: ['/subject3.png', '/subject3.png'] as [string, string] };

const socialLinks = [
  { name: 'Instagram', href: 'https://instagram.com/isaacrozsa', disabled: false, icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )},
  { name: 'Email', href: '#', disabled: false, copyEmail: true, icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 4L12 13 2 4" />
    </svg>
  )},
  { name: 'TikTok', href: 'https://tiktok.com/@isaac_drowns', disabled: false, icon: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M19.3 5.3a4.8 4.8 0 0 1-3-1.6 4.7 4.7 0 0 1-1-2.7h-3.6v13.7a2.9 2.9 0 0 1-2.9 2.7 2.9 2.9 0 0 1-2.9-2.9 2.9 2.9 0 0 1 2.9-2.9c.3 0 .6 0 .9.1V8a6.5 6.5 0 0 0-.9-.1 6.5 6.5 0 0 0-6.5 6.5A6.5 6.5 0 0 0 8.8 21a6.5 6.5 0 0 0 6.5-6.5V8.4a8.3 8.3 0 0 0 4.8 1.5V6.3a4.9 4.9 0 0 1-.8-1z" />
    </svg>
  )},
  { name: 'SoundCloud', href: '#', disabled: true, icon: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M1.2 14.3a.2.2 0 0 0-.2.2v3a.2.2 0 0 0 .4 0v-3a.2.2 0 0 0-.2-.2zm1.5-1.3a.2.2 0 0 0-.2.2v4.6a.2.2 0 0 0 .4 0v-4.6a.2.2 0 0 0-.2-.2zm1.5-1a.2.2 0 0 0-.2.2v5.6a.2.2 0 0 0 .4 0v-5.6a.2.2 0 0 0-.2-.2zm1.5.5a.2.2 0 0 0-.2.2v5.1a.2.2 0 0 0 .4 0v-5.1a.2.2 0 0 0-.2-.2zm1.5-2a.2.2 0 0 0-.2.2v7.1a.2.2 0 0 0 .4 0v-7.1a.2.2 0 0 0-.2-.2zm1.5-.5a.2.2 0 0 0-.2.2v7.6a.2.2 0 0 0 .4 0v-7.6a.2.2 0 0 0-.2-.2zM10.2 9a.2.2 0 0 0-.2.2v8.6a.2.2 0 0 0 .2.2h.1a4.5 4.5 0 0 0 0-.4V9.2a.2.2 0 0 0-.1-.2zm1.5-.5c-.1 0-.2.1-.2.2v9.1c0 .1.1.2.2.2h9.8a2.5 2.5 0 0 0 0-5 2.5 2.5 0 0 0-.6.1 4 4 0 0 0-4-3.6 4 4 0 0 0-1.4.3V8.7a.2.2 0 0 0-.3-.2z" />
    </svg>
  )},
  { name: 'Spotify', href: '#', disabled: true, icon: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.6 14.4a.6.6 0 0 1-.84.2c-2.3-1.4-5.2-1.72-8.6-.94a.6.6 0 1 1-.28-1.18c3.74-.86 6.94-.48 9.52 1.08a.6.6 0 0 1 .2.84zm1.24-2.72a.78.78 0 0 1-1.06.26c-2.64-1.62-6.66-2.1-9.78-1.14a.78.78 0 0 1-.44-1.5c3.56-1.08 7.98-.56 11.02 1.3a.78.78 0 0 1 .26 1.08zm.1-2.82c-3.16-1.88-8.36-2.06-11.38-1.14a.94.94 0 1 1-.54-1.8c3.46-1.06 9.22-.86 12.86 1.32a.94.94 0 0 1-.94 1.62z" />
    </svg>
  )},
];

const TOTAL_PAGES = 4;
const NAV_COOLDOWN = 1100;

// Custom easing: strong deceleration, physical feel
const EASE_OUT_EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';

// Timing constants
const EXIT_DURATION = 600;   // ms — outgoing page exit
const ENTER_DURATION = 700;  // ms — incoming page enter
const STAGGER_DELAY = 200;   // ms — delay before incoming starts (overlap with exit)

// Bridges a record's playing state (from context, inside the provider) up to page
// state so the water shader can gate the scroll cue on it.
function PlayingWatch({ id, onChange }: { id: string; onChange: (playing: boolean) => void }) {
  const { playingId } = usePlaying();
  const playing = playingId === id;
  useEffect(() => { onChange(playing); }, [playing, onChange]);
  return null;
}

function VolumeControl() {
  const { volume, setVolume } = usePlaying();
  const [expanded, setExpanded] = useState(false);
  const muted = volume === 0;

  return (
    <div
      className='hidden sm:flex items-center gap-2 mr-2'
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div
        className={`overflow-hidden flex items-center transition-all duration-300 ease-out ${expanded ? 'w-24 opacity-100' : 'w-0 opacity-0'}`}
      >
        <input
          type='range'
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className='w-full h-3 appearance-none bg-transparent rounded-full cursor-pointer [&::-webkit-slider-runnable-track]:h-px [&::-webkit-slider-runnable-track]:bg-white/15 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/40 [&::-webkit-slider-thumb]:-mt-[3.5px] [&::-moz-range-track]:h-px [&::-moz-range-track]:bg-white/15 [&::-moz-range-thumb]:w-2 [&::-moz-range-thumb]:h-2 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white/40 [&::-moz-range-thumb]:border-0'
        />
      </div>
      <button
        onClick={() => setVolume(muted ? 0.5 : 0)}
        className='text-white/40 hover:text-white/70 transition-colors duration-300'
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          {muted ? (
            <>
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </>
          ) : (
            <>
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              {volume > 0.5 && <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />}
            </>
          )}
        </svg>
      </button>
    </div>
  );
}

export default function Home() {
  const iceTiltRef = useRef({ rx: 0, ry: 0 });
  const albumWrapRef = useRef<HTMLDivElement>(null);
  const landingAlbumWrapRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  // Destination of the in-flight navigation — used to pre-warm heavy shaders
  // (start their render loop while still invisible, before the page is shown).
  const [targetPage, setTargetPage] = useState(0);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [waterReady, setWaterReady] = useState(false);
  const [albumReady, setAlbumReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fluidPulse, setFluidPulse] = useState(0);
  const [landingPlaying, setLandingPlaying] = useState(false); // gate the scroll cue on playback
  const [frostReady, setFrostReady] = useState(false); // defer the heavy frost filter off the entrance
  const allReady = waterReady && albumReady;
  const canNavRef = useRef(true);

  // Transition state
  const previousPageRef = useRef(0);
  const [exitingPage, setExitingPage] = useState<number | null>(null);
  const [enteringPage, setEnteringPage] = useState<number | null>(null);
  const [enterReady, setEnterReady] = useState(false); // flips after 1 frame to trigger CSS transition
  const directionRef = useRef<1 | -1>(1); // 1 = forward, -1 = backward
  const transitionTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const isMobile = useIsMobile();
  const reducedMotion = usePrefersReducedMotion();
  const canvasDpr: [number, number] = isMobile ? [1, 1] : [1, 1.5];

  // Mount the frost only after the entrance has settled, so its one-time SVG-filter
  // rasterisation lands in a calm moment instead of hitching the reveal.
  useEffect(() => {
    if (!allReady) return;
    const timer = setTimeout(() => setFrostReady(true), 700);
    return () => clearTimeout(timer);
  }, [allReady]);

  // Fallback: never get stuck on the loading screen
  useEffect(() => {
    const timer = setTimeout(() => { setWaterReady(true); setAlbumReady(true); }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Clean up transition timers on unmount
  useEffect(() => {
    return () => { transitionTimers.current.forEach(clearTimeout); };
  }, []);

  // Navigate to a page with cooldown
  const goToPage = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(TOTAL_PAGES - 1, index));
    if (clamped === currentPage || !canNavRef.current) return;
    canNavRef.current = false;

    // Pre-warm the destination's heavy shaders right away (still invisible)
    setTargetPage(clamped);

    // Clear any in-flight transition timers
    transitionTimers.current.forEach(clearTimeout);

    const direction = clamped > currentPage ? 1 : -1;
    directionRef.current = direction as 1 | -1;
    previousPageRef.current = currentPage;

    // Phase 1: Start exit animation on current page
    setExitingPage(currentPage);

    // Phase 2: After stagger delay, mount incoming page at its offset position
    const t1 = setTimeout(() => {
      setCurrentPage(clamped);
      setEnteringPage(clamped);
      setEnterReady(false); // start at offset — enterReady effect will flip this
    }, STAGGER_DELAY);

    // Phase 3: After exit completes, clear exiting page
    const t2 = setTimeout(() => {
      setExitingPage(null);
    }, EXIT_DURATION + 100);

    // Phase 4: After enter animation completes, clear entering state
    const t3 = setTimeout(() => {
      setEnteringPage(null);
      setEnterReady(false);
    }, STAGGER_DELAY + ENTER_DURATION + 50);

    // Unlock navigation after cooldown
    const t4 = setTimeout(() => { canNavRef.current = true; }, NAV_COOLDOWN);

    transitionTimers.current = [t1, t2, t3, t4];
  }, [currentPage]);

  // When enteringPage is set with enterReady=false, wait one frame then flip to true
  // This ensures the browser paints the offset position before transitioning to center
  useEffect(() => {
    if (enteringPage !== null && !enterReady) {
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setEnterReady(true);
        });
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [enteringPage, enterReady]);

  // Wheel / touch / keyboard navigation
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (Math.abs(e.deltaY) < 5) return;
      goToPage(currentPage + (e.deltaY > 0 ? 1 : -1));
    };

    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => { touchStartY = e.touches[0].clientY; };
    const onTouchEnd = (e: TouchEvent) => {
      const delta = touchStartY - e.changedTouches[0].clientY;
      if (Math.abs(delta) < 50) return;
      goToPage(currentPage + (delta > 0 ? 1 : -1));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      let dir = 0;
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') dir = 1;
      if (e.key === 'ArrowUp' || e.key === 'PageUp') dir = -1;
      if (dir === 0) return;
      e.preventDefault();
      goToPage(currentPage + dir);
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [currentPage, goToPage]);

  // Cursor tracking for ice cube + album rotation
  useEffect(() => {
    let raf: number | null = null;
    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      iceTiltRef.current = { rx: y * 0.25, ry: x * 0.3 };
      if (!raf) {
        raf = requestAnimationFrame(() => {
          const { rx, ry } = iceTiltRef.current;
          const ryDeg = (ry * 180) / Math.PI;
          const rxDeg = -(rx * 180) / Math.PI;
          const t = `perspective(900px) rotateY(${ryDeg}deg) rotateX(${rxDeg}deg)`;
          if (albumWrapRef.current) albumWrapRef.current.style.transform = t;
          if (landingAlbumWrapRef.current) landingAlbumWrapRef.current.style.transform = t;
          raf = null;
        });
      }
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => { window.removeEventListener('mousemove', onMove); if (raf) cancelAnimationFrame(raf); };
  }, []);

  // Ignite the fluid shader's radial pulse the instant we arrive on the New Eye
  // screen — it sweeps out as the page fades in.
  useEffect(() => {
    if (currentPage === 1) setFluidPulse((k) => k + 1);
  }, [currentPage]);

  // Derived state
  const isLanding = currentPage === 0;
  const isNewEye = currentPage === 1;

  // Per-page enter offset: where the page starts when entering
  const getEnterOffset = (pageIndex: number, dir: 1 | -1): string => {
    switch (pageIndex) {
      case 0: return dir === -1 ? 'translateY(-6%) scale(0.97)' : 'translateY(6%) scale(0.97)';
      case 1: return dir === 1 ? 'scale(1.06)' : 'scale(0.92)';
      case 2: return dir === 1 ? 'translateY(6%) scale(0.97)' : 'translateY(-6%) scale(0.97)';
      case 3: return dir === 1 ? 'translateY(10%)' : 'translateY(-10%)';
      default: return 'none';
    }
  };

  // Per-page exit transform: where the page goes when exiting
  const getExitTransform = (pageIndex: number, dir: 1 | -1): string => {
    switch (pageIndex) {
      case 0: // Landing: drift + scale down
        return dir === 1 ? 'translateY(-8%) scale(0.95)' : 'translateY(8%) scale(0.95)';
      case 1: // Shader: subtle scale
        return dir === 1 ? 'scale(0.92)' : 'scale(1.06)';
      case 2: // Ice cube: shift opposite to direction
        return dir === 1 ? 'translateY(-6%) scale(0.97)' : 'translateY(6%) scale(0.97)';
      case 3: // Socials: simple shift
        return dir === 1 ? 'translateY(-10%)' : 'translateY(10%)';
      default: return 'none';
    }
  };

  // Compute transition styles for each page section
  const getPageStyle = (pageIndex: number): React.CSSProperties => {
    const isActive = currentPage === pageIndex;
    const isExiting = exitingPage === pageIndex;
    const isEntering = enteringPage === pageIndex;
    const direction = directionRef.current;

    // ── EXITING: animating out, stays on top during exit ──
    if (isExiting) {
      return {
        opacity: 0,
        transform: getExitTransform(pageIndex, direction),
        zIndex: 25,
        pointerEvents: 'none',
        transition: `opacity ${EXIT_DURATION}ms ${EASE_OUT_EXPO}, transform ${EXIT_DURATION}ms ${EASE_OUT_EXPO}`,
      };
    }

    // ── ENTERING: two-phase — first render at offset (no transition), then animate to center ──
    if (isActive && isEntering) {
      if (!enterReady) {
        // Frame 1: snap to offset position (no transition so it's instant)
        return {
          opacity: 0,
          transform: getEnterOffset(pageIndex, direction),
          zIndex: 20,
          pointerEvents: 'none',
          transition: 'none',
        };
      }
      // Frame 2+: animate from offset to center
      return {
        opacity: 1,
        transform: 'translateY(0) scale(1)',
        zIndex: 20,
        pointerEvents: 'auto',
        transition: `opacity ${ENTER_DURATION}ms ${EASE_OUT_EXPO}, transform ${ENTER_DURATION}ms ${EASE_OUT_EXPO}`,
      };
    }

    // ── ACTIVE (idle): fully visible, keep transition for smoothness ──
    if (isActive) {
      return {
        opacity: 1,
        transform: 'translateY(0) scale(1)',
        zIndex: 20,
        pointerEvents: 'auto',
        transition: `opacity ${ENTER_DURATION}ms ${EASE_OUT_EXPO}, transform ${ENTER_DURATION}ms ${EASE_OUT_EXPO}`,
      };
    }

    // ── INACTIVE: hidden, no transition so it snaps to offset instantly when needed ──
    return {
      opacity: 0,
      transform: 'translateY(0) scale(1)',
      zIndex: 0,
      pointerEvents: 'none',
      transition: 'none',
    };
  };

  return (
    <PlayingProvider>
    <PlayingWatch id={`${landingRecord.artist}—${landingRecord.music}`} onChange={setLandingPlaying} />
    {/* Top-right controls */}
    <div className='fixed top-6 right-6 z-50 flex flex-col items-end gap-3'>
      <RoseNav activeIndex={currentPage} total={TOTAL_PAGES} onNavigate={goToPage} />
      <button
        onClick={() => setAboutOpen(true)}
        className='px-5 py-2 rounded-full border border-white/20 text-white/50 text-sm font-medium hover:border-white/40 hover:text-white/80 transition-all duration-300 backdrop-blur-sm'
      >
        who am I
      </button>
      <VolumeControl />
    </div>

    {/* About modal */}
    {aboutOpen && (
      <div className='fixed inset-0 z-50 flex items-center justify-center' onClick={() => setAboutOpen(false)}>
        <div className='absolute inset-0 bg-black/80 backdrop-blur-sm' />
        <div
          className='relative max-w-lg mx-4 bg-gradient-to-br from-[#0a0a0a] via-[#0f0505] to-[#150808] p-8 sm:p-12'
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setAboutOpen(false)}
            className='absolute top-5 right-5 text-white/20 hover:text-white/50 transition-colors'
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <h2 className='text-2xl font-bold text-white/90 mb-6 tracking-wide'>Isaac Rozsa</h2>
          <p className='text-white/40 leading-relaxed mb-4 text-sm'>
            Outsider music (art brut).
          </p>
          <p className='text-white/40 leading-relaxed mb-4 text-sm'>
            Based in Sydney, Australia.<br />
            Never forget the atrocities committed on this land.
          </p>
          <p className='text-white/40 leading-relaxed mb-4 text-sm'>
            Please reach out to collaborate, or for a sick website, at <button onClick={() => { navigator.clipboard.writeText('irl@isaacrozsa.com').then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }} className='relative inline-grid text-white/60 hover:text-white/80 transition-colors'><span className={copied ? 'invisible' : ''}>irl@isaacrozsa.com</span>{copied && <span className='absolute inset-0 flex items-center justify-center'>copied</span>}</button>
          </p>
          <p className='text-white/40 leading-relaxed text-sm'>
            Note – at this time I don't use any AI for my music.
          </p>
        </div>
      </div>
    )}

    <LoadingScreen ready={allReady} />

    {/* All sections stacked, visibility controlled by currentPage */}
    <main className='h-[100dvh] w-full bg-black relative overflow-hidden overscroll-none' style={{ touchAction: 'none' }}>

      {/* ── Water Shader — fixed overlay, fades out when leaving landing ── */}
      <div
        className='fixed inset-0 z-10 pointer-events-none'
        style={{
          opacity: (isLanding && exitingPage !== 0) ? 1 : 0,
          visibility: (isLanding || exitingPage === 0) ? 'visible' : 'hidden',
          transition: `opacity ${EXIT_DURATION + 200}ms ${EASE_OUT_EXPO}`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#030304',
            opacity: waterReady ? 0 : 1,
            transition: 'opacity 1.2s ease-in-out',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
        <Canvas
          orthographic
          camera={{ zoom: 1, position: [0, 0, 1], near: 0.1, far: 1000 }}
          gl={{ alpha: true, antialias: false, preserveDrawingBuffer: true }}
          style={{ width: '100%', height: '100%', display: 'block' }}
          dpr={canvasDpr}
          frameloop={(isLanding || exitingPage === 0 || targetPage === 0) ? 'demand' : 'never'}
          onCreated={({ gl }) => {
            gl.domElement.style.pointerEvents = 'none';
            gl.domElement.style.touchAction = 'auto';
            if (gl.domElement.parentElement) {
              gl.domElement.parentElement.style.pointerEvents = 'none';
              gl.domElement.parentElement.style.touchAction = 'auto';
            }
            setTimeout(() => setWaterReady(true), 200);
          }}
        >
          <WaterShader scrollProgress={isLanding ? 0 : 1} lowQuality={isMobile} showScroll={landingPlaying && isLanding} />
          <FpsCap run={isLanding || exitingPage === 0 || targetPage === 0} hz={30} />
        </Canvas>
      </div>

      {/* ── Page 0: Landing ── */}
      <section
        className='absolute inset-0 flex items-center justify-center py-20 px-4 sm:px-6 lg:px-8'
        style={getPageStyle(0)}
      >
        <div className='max-w-7xl w-full relative z-30 flex items-center justify-center'>
          <div className='relative z-50 scale-[0.85] sm:scale-90'>
            {/* Tight, square-ish drop shadow so the frosted glass reads against
                the bright water (instead of washing out). */}
            <div ref={landingAlbumWrapRef} style={{ transition: 'transform 0.3s ease-out', boxShadow: '0 0 48px 6px rgba(78, 200, 214, 0.42), 0 0 120px 30px rgba(40, 150, 170, 0.28)', willChange: 'transform' }}>
              <MusicArtwork artist={landingRecord.artist} music={landingRecord.music} albumArt={landingRecord.albumArt} audioSrc={landingRecord.audioSrc} isSong={landingRecord.isSong} plasticWrap={landingRecord.plasticWrap} subjects={landingRecord.subjects} frosted={!isMobile && frostReady} priority onImageReady={() => setAlbumReady(true)} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Page 2: ROZSA Shader Scene (swapped with New Eye) ── */}
      <section
        className='absolute inset-0 bg-black'
        style={{
          ...getPageStyle(2),
          contain: 'layout style paint',
        }}
      >
        <ShaderScene lowQuality={isMobile} active={currentPage === 2} />
      </section>

      {/* ── Page 1: New Eye record (swapped with shader scene) ── */}
      <section
        className='absolute inset-0 bg-black flex items-center justify-center'
        style={{
          ...getPageStyle(1),
          contain: 'layout style paint',
        }}
      >
        {/* Fluid overlay background */}
        <div className='absolute inset-0 z-0 overflow-hidden transition-opacity duration-[300ms]' style={{ opacity: isNewEye ? 1 : 0 }}>
          <Canvas
            orthographic
            camera={{ zoom: 1, position: [0, 0, 1], near: 0.1, far: 1000 }}
            gl={{ alpha: true, antialias: false }}
            style={{ width: '100%', height: '100%' }}
            dpr={[1, 1]}
            frameloop={(isNewEye || targetPage === 1) ? 'always' : 'never'}
          >
            <FluidOverlay blue pulse={fluidPulse} />
          </Canvas>
        </div>
        <div className='absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-black via-black/50 to-transparent pointer-events-none z-10' />
        <div className='absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none z-10' />
        <div className='relative z-20'>
          <div className='relative'>
            <div className='relative z-50 scale-[0.85] sm:scale-90'>
              <div ref={albumWrapRef} style={{ transition: 'transform 0.3s ease-out', willChange: 'transform' }}>
                <MusicArtwork artist={newEyeRecord.artist} music={newEyeRecord.music} albumArt={newEyeRecord.albumArt} audioSrc={newEyeRecord.audioSrc} isSong={newEyeRecord.isSong} plasticWrap={newEyeRecord.plasticWrap} subjects={newEyeRecord.subjects} frosted={!isMobile && frostReady} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Page 3: Social Links ── */}
      <section
        className='absolute inset-0 bg-black flex items-center justify-center'
        style={{
          ...getPageStyle(3),
          contain: 'layout style paint',
        }}
      >
        <div className='flex flex-col sm:flex-row items-center gap-8 sm:gap-10'>
          {/* Selection triangle link to Arrythmia */}
          <SelectionLink />
          {/* 3D flower link to Good Talk */}
          <FlowerLink />
          {socialLinks.map((link) => (
            <a
              key={link.name}
              href={link.disabled || link.copyEmail ? undefined : link.href}
              target={link.disabled || link.copyEmail ? undefined : '_blank'}
              rel={link.disabled || link.copyEmail ? undefined : 'noopener noreferrer'}
              onClick={link.copyEmail ? (e: React.MouseEvent) => { e.preventDefault(); navigator.clipboard.writeText('irl@isaacrozsa.com').then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); } : link.disabled ? (e: React.MouseEvent) => e.preventDefault() : undefined}
              className={`group relative py-2 text-3xl sm:text-4xl transition-[filter] duration-300 ${
                link.disabled ? 'cursor-default opacity-20' : 'hover:drop-shadow-[0_0_18px_rgba(200,40,40,0.45)]'
              }`}
            >
              <span className={`w-[1em] h-[1em] block [&>svg]:w-full [&>svg]:h-full transition-colors duration-300 ${
                link.disabled ? 'text-white/40' : 'text-white/40 group-hover:text-[#450a0a]'
              }`}>
                {link.icon}
              </span>
              {link.disabled && (
                <span className='absolute left-1/2 -translate-x-1/2 top-full mt-2 text-xs text-white/30 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300'>
                  coming soon
                </span>
              )}
              {link.copyEmail && copied && (
                <span className='absolute left-1/2 -translate-x-1/2 top-full mt-2 text-xs text-white/30 whitespace-nowrap transition-opacity duration-300'>
                  copied
                </span>
              )}
            </a>
          ))}
        </div>
      </section>
    </main>
    </PlayingProvider>
  );
}
