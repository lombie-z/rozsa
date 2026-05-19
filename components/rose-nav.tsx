'use client';

import { useState } from 'react';
import Image from 'next/image';

const ROSES = [
  { src: '/nav/rose-1.png', x: 41.1, y: 36.8, w: 39, h: 28 },
  { src: '/nav/rose-4.png', x: 39.2, y: 17.4, w: 16, h: 13 },
  { src: '/nav/rose-3.png', x: 59.0, y: 20.6, w: 26, h: 19 },
  { src: '/nav/rose-2.png', x: 70.3, y: 38.6, w: 30, h: 26 },
];

interface RoseNavProps {
  activeIndex: number;
  total: number;
  onNavigate?: (index: number) => void;
}

export default function RoseNav({ activeIndex, total, onNavigate }: RoseNavProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className='hidden sm:block w-32 h-44 translate-x-[5px]'>
      <div className='relative w-full h-full'>
        <Image
          src='/nav/basis.png'
          alt=''
          fill
          className='object-contain opacity-35 pointer-events-none'
        />

        {ROSES.slice(0, total).map((rose, i) => {
          const isActive = i === activeIndex;
          const isHovered = i === hoveredIndex && !isActive;

          const opacity = isActive ? 1 : isHovered ? 0.4 : 0;
          // Only animate when fading OUT — snap instantly when appearing
          const transition = opacity === 0 ? 'opacity 500ms' : 'opacity 150ms';

          return (
            <div key={i}>
              <div
                className='absolute inset-0 pointer-events-none'
                style={{ opacity, transition }}
              >
                {isActive ? (
                  <div className='absolute inset-0 drop-shadow-[0_0_8px_rgba(180,30,30,0.5)]'>
                    <Image src={rose.src} alt='' fill className='object-contain' />
                  </div>
                ) : (
                  <Image src={rose.src} alt='' fill className='object-contain' />
                )}
              </div>

              <button
                onClick={() => onNavigate?.(i)}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`absolute rounded-full ${isActive ? 'cursor-default' : 'cursor-pointer'}`}
                style={{
                  left: `${rose.x - rose.w / 2}%`,
                  top: `${rose.y - rose.h / 2}%`,
                  width: `${rose.w}%`,
                  height: `${rose.h}%`,
                }}
                aria-label={`Go to section ${i + 1}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
