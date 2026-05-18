'use client';

import { type ReactNode, useRef, useCallback, useEffect, useState } from 'react';
import CubeEdges from './cube-edges';

function FrostFace({ transform, index }: { transform: string; index: number }) {
  return (
    <div
      className='absolute -inset-[calc(2rem-13px)] sm:-inset-[calc(3.5rem-13px)] pointer-events-none'
      style={{ transform }}
      data-face={index}
    >
      <div className='absolute inset-0 overflow-hidden border border-white/[0.08]'>
        <div className='absolute inset-0 bg-[rgba(160,200,240,0.06)]' />
        <div className='absolute inset-0 mix-blend-screen opacity-50'>
          <img
            src='/textures/ice-texture.jpg'
            alt=''
            className='w-full h-full object-cover'
          />
        </div>
        <div
          className='absolute inset-0 ice-streak'
          style={{ mixBlendMode: 'screen' }}
        />
      </div>
    </div>
  );
}

const TILT_RANGE = 18;

type FaceInfo = {
  name: string;
  transform: string;
  normal: [number, number, number];
  streakAngle: number;
};

const LIGHT: [number, number, number] = [0.4, -0.4, 0.82];
const lLen = Math.sqrt(LIGHT[0] ** 2 + LIGHT[1] ** 2 + LIGHT[2] ** 2);
const L: [number, number, number] = [LIGHT[0] / lLen, LIGHT[1] / lLen, LIGHT[2] / lLen];

function rotNormal(n: [number, number, number], ryD: number, rxD: number): [number, number, number] {
  const ry = (ryD * Math.PI) / 180;
  const rx = (rxD * Math.PI) / 180;
  const x1 = n[0] * Math.cos(ry) + n[2] * Math.sin(ry);
  const y1 = n[1];
  const z1 = -n[0] * Math.sin(ry) + n[2] * Math.cos(ry);
  return [x1, y1 * Math.cos(rx) - z1 * Math.sin(rx), y1 * Math.sin(rx) + z1 * Math.cos(rx)];
}

export default function IceCube({ children }: { children: ReactNode }) {
  const d = 'var(--cube-d)';
  const tiltRef = useRef({ rx: 0, ry: 0 });
  const cursorRef = useRef(0.5);
  const rafRef = useRef<number | null>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const facesContainerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [cubeDPx, setCubeDPx] = useState(0);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const read = () => {
      const val = getComputedStyle(el).getPropertyValue('--cube-d').trim();
      if (!val) return;
      const tmp = document.createElement('div');
      tmp.style.width = val;
      tmp.style.position = 'absolute';
      tmp.style.visibility = 'hidden';
      document.body.appendChild(tmp);
      setCubeDPx(tmp.offsetWidth);
      document.body.removeChild(tmp);
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const faces: FaceInfo[] = [
    { name: 'front', transform: `translateZ(${d})`, normal: [0, 0, 1], streakAngle: 120 },
    { name: 'back', transform: `rotateY(180deg) translateZ(${d})`, normal: [0, 0, -1], streakAngle: 60 },
    { name: 'left', transform: `rotateY(-90deg) translateZ(${d})`, normal: [-1, 0, 0], streakAngle: 110 },
    { name: 'right', transform: `rotateY(90deg) translateZ(${d})`, normal: [1, 0, 0], streakAngle: 70 },
    { name: 'top', transform: `rotateX(90deg) translateZ(${d})`, normal: [0, -1, 0], streakAngle: 90 },
    { name: 'bottom', transform: `rotateX(-90deg) translateZ(${d})`, normal: [0, 1, 0], streakAngle: 90 },
  ];

  const applyTransform = useCallback(() => {
    if (!innerRef.current) return;
    const { rx, ry } = tiltRef.current;
    innerRef.current.style.transform = `rotateY(${ry}deg) rotateX(${rx}deg)`;

    if (!facesContainerRef.current) return;
    const nx = cursorRef.current;
    const els = facesContainerRef.current.children;

    for (let i = 0; i < faces.length; i++) {
      const el = els[i] as HTMLElement;
      const rn = rotNormal(faces[i].normal, ry, rx);
      const dot = rn[0] * L[0] + rn[1] * L[1] + rn[2] * L[2];
      const facing = Math.max(0, dot);

      const streak = el.querySelector('.ice-streak') as HTMLElement;
      if (!streak) continue;

      if (facing < 0.05) {
        streak.style.background = 'none';
        continue;
      }

      const offset = nx * 100;
      const intensity = Math.min(0.12, facing * 0.15);
      const angle = faces[i].streakAngle;
      streak.style.background = `linear-gradient(${angle}deg, transparent ${offset - 12}%, rgba(255,255,255,${intensity}) ${offset}%, transparent ${offset + 12}%)`;
    }
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const nx = e.clientX / window.innerWidth;
      const x = (nx - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      tiltRef.current = { rx: -y * TILT_RANGE, ry: x * TILT_RANGE };
      cursorRef.current = nx;
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          applyTransform();
          rafRef.current = null;
        });
      }
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    applyTransform();
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [applyTransform]);

  return (
    <div
      ref={wrapperRef}
      className='[--cube-d:7.5rem] sm:[--cube-d:12.5rem]'
      style={{ perspective: '900px' }}
    >
      <div
        ref={innerRef}
        style={{
          transformStyle: 'preserve-3d',
          transform: 'rotateY(0deg) rotateX(0deg)',
          transition: 'transform 0.3s ease-out',
        }}
      >
        <div
          className='relative z-10 translate-x-6 sm:translate-x-8'
          style={{ filter: 'url(#ice-refract)' }}
        >
          {children}
        </div>

        <svg width='0' height='0' style={{ position: 'absolute' }}>
          <defs>
            <filter id='ice-refract'>
              <feTurbulence type='fractalNoise' baseFrequency='0.015' numOctaves='3' seed='2' result='noise' />
              <feDisplacementMap in='SourceGraphic' in2='noise' scale='16' xChannelSelector='R' yChannelSelector='G' />
            </filter>
          </defs>
        </svg>

        <div
          ref={facesContainerRef}
          className='absolute inset-0'
          style={{ transformStyle: 'preserve-3d' }}
        >
          {faces.map((f, i) => (
            <FrostFace key={f.name} transform={f.transform} index={i} />
          ))}
          {cubeDPx > 0 && <CubeEdges edgeSegments={4} cornerSegments={2} radiusPx={14} cubeSizePx={cubeDPx} />}
        </div>
      </div>
    </div>
  );
}
