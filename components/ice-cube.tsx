'use client';

import { type ReactNode, useRef, useCallback, useEffect } from 'react';

function FrostFace({ transform }: { transform: string }) {
  return (
    <div
      className='absolute -inset-[calc(2rem+1px)] sm:-inset-[calc(3.5rem+1px)] pointer-events-none'
      style={{ transform }}
    >
      <div className='absolute inset-0 overflow-hidden border border-white/[0.08]'>
        {/* Base tint */}
        <div className='absolute inset-0 bg-[rgba(160,200,240,0.06)]' />
        {/* Ice texture with screen blend — highlights the crystalline structure */}
        <div className='absolute inset-0 mix-blend-screen opacity-50'>
          <img
            src='/textures/ice-texture.jpg'
            alt=''
            className='w-full h-full object-cover'
          />
        </div>
        {/* Specular sheen */}
        <div className='absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-white/[0.04]' />
      </div>
    </div>
  );
}

const TILT_RANGE = 18;

export default function IceCube({ children }: { children: ReactNode }) {
  const d = 'var(--cube-d)';
  const tiltRef = useRef({ rx: 0, ry: 0 });
  const rafRef = useRef<number | null>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const applyTransform = useCallback(() => {
    if (!innerRef.current) return;
    const { rx, ry } = tiltRef.current;
    innerRef.current.style.transform = `rotateY(${ry}deg) rotateX(${rx}deg)`;
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      tiltRef.current = { rx: -y * TILT_RANGE, ry: x * TILT_RANGE };
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          applyTransform();
          rafRef.current = null;
        });
      }
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [applyTransform]);

  const faces: { name: string; transform: string }[] = [
    { name: 'front', transform: `translateZ(${d})` },
    { name: 'back', transform: `rotateY(180deg) translateZ(${d})` },
    { name: 'left', transform: `rotateY(-90deg) translateZ(${d})` },
    { name: 'right', transform: `rotateY(90deg) translateZ(${d})` },
    { name: 'top', transform: `rotateX(90deg) translateZ(${d})` },
    { name: 'bottom', transform: `rotateX(-90deg) translateZ(${d})` },
  ];

  return (
    <div
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
          className='relative z-10 translate-x-4 sm:translate-x-6'
          style={{ filter: 'url(#ice-refract)' }}
        >
          {children}
        </div>

        {/* Subtle refraction distortion — like viewing through wavy ice */}
        <svg width='0' height='0' style={{ position: 'absolute' }}>
          <defs>
            <filter id='ice-refract'>
              <feTurbulence type='fractalNoise' baseFrequency='0.015' numOctaves='3' seed='2' result='noise' />
              <feDisplacementMap in='SourceGraphic' in2='noise' scale='16' xChannelSelector='R' yChannelSelector='G' />
            </filter>
          </defs>
        </svg>

        <div
          className='absolute inset-0'
          style={{ transformStyle: 'preserve-3d' }}
        >
          {faces.map((f) => (
            <FrostFace key={f.name} transform={f.transform} />
          ))}
        </div>
      </div>
    </div>
  );
}
