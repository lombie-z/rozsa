'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

// --- 1. CSS & Animations ---
const vineStyles = `
  :root {
    --vine-dark: #1a2e1a;
    --vine-light: #3f4f3a;
    --rose-shadow: #4a0404; /* Deep crevices */
    --rose-dark: #7f1d1d;   /* Outer petals */
    --rose-mid: #9f1239;    /* Main body */
    --rose-highlight: #e11d48; /* Edges */
    --rose-center: #fb7185; /* Inner glow */
  }

  /* Grows the stem line */
  @keyframes drawLine {
    to { stroke-dashoffset: 0; }
  }

  /* Opens the leaves */
  @keyframes openLeaf {
    0% { transform: scale(0); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }

  /* THE BLOOM: Unfurling layers */
  /* Inner layers start small and rotated, then "unwind" open */
  @keyframes bloomUnfurl {
    0% { transform: scale(0.1) rotate(-60deg); opacity: 0; }
    40% { opacity: 1; }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }

  /* Outer layers just expand */
  @keyframes bloomExpand {
    0% { transform: scale(0.2) rotate(-20deg); opacity: 0; }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }

  /* Wilting Animation */
  @keyframes wiltRose {
    0% { 
      transform: scale(1) translateY(0) rotate(0deg); 
      filter: grayscale(0) brightness(1) contrast(1);
      opacity: 1;
    }
    100% { 
      transform: scale(0.5) translateY(80px) rotate(30deg); 
      filter: grayscale(1) brightness(0.2) sepia(0.4); 
      opacity: 0;
    }
  }

  .vine-stem {
    stroke-dasharray: 200;
    stroke-dashoffset: 200;
    animation: drawLine 2s ease-out forwards;
  }

  .vine-leaf {
    transform-origin: center;
    transform: scale(0);
    animation: openLeaf 0.6s ease-out forwards;
  }
  
  .petal-inner {
    transform-origin: center;
    transform: scale(0); 
    animation: bloomUnfurl 1.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
  }

  .petal-outer {
    transform-origin: center;
    transform: scale(0);
    animation: bloomExpand 1.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
  }

  /* Wrapper for the death animation */
  .vine-wilt-wrapper {
    animation: wiltRose 2s ease-in-out forwards;
    transform-origin: bottom center;
    width: 100%;
    height: 100%;
  }
`;

// --- 2. VECTOR ROSE COMPONENT ---
// Replaced circles with actual petal paths
const RealisticRose = ({ x, y, scale = 1, delay = 0 }: any) => {
  // LAYER 1: The Tight Center (Spirals)
  const centerPath = 'M0,0 C-3,-5 -6,2 -2,4 C3,7 5,-3 0,-6 C-4,-8 -7,-2 -5,2';

  // LAYER 2: Inner Petals (Cupping the center)
  const innerPetals = [
    'M-4,-4 Q-8,0 -4,4 Q0,8 4,4 Q8,0 4,-4 Q0,-8 -4,-4', // Overlap 1
    'M2,-5 Q8,-2 5,4 Q2,9 -3,5 Q-7,1 -2,-5', // Overlap 2
  ];

  // LAYER 3: Mid Petals (Unfurling)
  const midPetals = ['M-8,2 C-12,8 -4,12 2,8 C6,5 4,-2 0,-4 C-6,-5 -10,-2 -8,2', 'M6,-2 C10,-6 14,0 10,6 C6,10 0,8 -2,4 C-4,-2 2,-6 6,-2'];

  // LAYER 4: Outer Petals (Wide & Flared)
  const outerPetals = [
    'M0,-10 C-8,-14 -14,-4 -10,4 C-6,10 6,10 10,4 C14,-4 8,-14 0,-10', // Top/Bottom spread
    'M-10,-4 C-15,4 -5,14 4,10 C10,6 12,-6 4,-10 C-4,-12 -8,-8 -10,-4', // Side spread
  ];

  return (
    <g style={{ transformBox: 'fill-box', transformOrigin: `${x}px ${y}px` }} transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* OUTMOST LAYERS (Appear First but behind) */}
      {outerPetals.map((d, i) => (
        <path
          key={`outer-${i}`}
          d={d}
          fill='var(--rose-dark)'
          className='petal-outer'
          style={{ animationDelay: `${delay}ms` }} // Open first to form the base
        />
      ))}

      {/* MID LAYERS */}
      {midPetals.map((d, i) => (
        <path
          key={`mid-${i}`}
          d={d}
          fill='var(--rose-mid)'
          className='petal-outer'
          style={{ animationDelay: `${delay + 150}ms`, transform: `rotate(${i * 45}deg)` }}
        />
      ))}

      {/* INNER LAYERS */}
      {innerPetals.map((d, i) => (
        <path key={`inner-${i}`} d={d} fill='var(--rose-highlight)' className='petal-inner' style={{ animationDelay: `${delay + 300}ms` }} />
      ))}

      {/* CENTER (The Bud) */}
      <path
        d={centerPath}
        fill='none'
        stroke='var(--rose-center)'
        strokeWidth='1.5'
        strokeLinecap='round'
        className='petal-inner'
        style={{ animationDelay: `${delay + 450}ms` }}
      />
    </g>
  );
};

// --- 3. Dynamic Vine Component ---
const DynamicVine = ({
  x,
  y,
  rotation,
  scale,
  variant,
  isWilting,
}: {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  variant: number;
  isWilting: boolean;
}) => {
  // Fixed paths for stable leaf attachment
  const getVineData = () => {
    switch (variant) {
      case 0:
        return { path: 'M75 150 Q 75 100 40 80 T 15 30', leaf1: { x: 70, y: 110, rot: -20 }, leaf2: { x: 35, y: 75, rot: -45 }, head: { x: 15, y: 30 } };
      case 1:
        return { path: 'M75 150 Q 75 110 110 90 T 135 30', leaf1: { x: 80, y: 120, rot: 20 }, leaf2: { x: 115, y: 85, rot: 45 }, head: { x: 135, y: 30 } };
      case 2:
        return {
          path: 'M75 150 C 75 120 30 110 50 70 S 90 40 75 10',
          leaf1: { x: 50, y: 100, rot: -30 },
          leaf2: { x: 60, y: 55, rot: 30 },
          head: { x: 75, y: 10 },
        };
      default:
        return null;
    }
  };

  const data = getVineData() || getVineData()!;
  if (!data) return null;

  return (
    <div
      className='absolute pointer-events-none z-30 origin-bottom'
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: '160px',
        height: '160px',
        transform: `translate(-50%, -100%) rotate(${rotation}deg) scale(${scale})`,
      }}
    >
      <div className={isWilting ? 'vine-wilt-wrapper' : 'w-full h-full'}>
        <svg viewBox='0 0 160 160' fill='none' xmlns='http://www.w3.org/2000/svg' className='w-full h-full drop-shadow-md'>
          {/* Stem */}
          <path d={data.path} stroke='var(--vine-dark)' strokeWidth='2.5' strokeLinecap='round' fill='none' className='vine-stem' />

          {/* Leaves - Now with serrated edges via 'L' zig-zags inside the curve */}
          <g className='vine-leaf' style={{ transformBox: 'fill-box', transformOrigin: `${data.leaf1.x}px ${data.leaf1.y}px`, animationDelay: '300ms' }}>
            <path
              d={`M${data.leaf1.x} ${data.leaf1.y} 
                   Q ${data.leaf1.x - 10} ${data.leaf1.y - 10} ${data.leaf1.x - 25} ${data.leaf1.y} 
                   Q ${data.leaf1.x - 10} ${data.leaf1.y + 10} ${data.leaf1.x} ${data.leaf1.y} Z`}
              fill='var(--vine-light)'
              transform={`rotate(${data.leaf1.rot}, ${data.leaf1.x}, ${data.leaf1.y})`}
            />
          </g>

          <g className='vine-leaf' style={{ transformBox: 'fill-box', transformOrigin: `${data.leaf2.x}px ${data.leaf2.y}px`, animationDelay: '600ms' }}>
            <path
              d={`M${data.leaf2.x} ${data.leaf2.y} 
                   Q ${data.leaf2.x + 10} ${data.leaf2.y - 10} ${data.leaf2.x + 25} ${data.leaf2.y} 
                   Q ${data.leaf2.x + 10} ${data.leaf2.y + 10} ${data.leaf2.x} ${data.leaf2.y} Z`}
              fill='var(--vine-light)'
              transform={`rotate(${data.leaf2.rot}, ${data.leaf2.x}, ${data.leaf2.y})`}
            />
          </g>

          {/* Realistic Rose Head */}
          {/* Delay is 1s to allow vine to grow first */}
          <RealisticRose x={data.head.x} y={data.head.y} scale={1.3} delay={1000} />
        </svg>
      </div>
    </div>
  );
};

// --- 4. Main Component ---
const componentStyles = `
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  ${vineStyles}
`;

interface RoseData {
  id: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  variant: number;
  isWilting: boolean;
}

interface MusicArtworkProps {
  artist: string;
  music: string;
  albumArt: string;
  isSong: boolean;
  isLoading?: boolean;
}

export default function MusicArtwork({ artist, music, albumArt, isSong, isLoading = false }: MusicArtworkProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [rotation, setRotation] = useState(0);
  const vinylRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(0);
  const [dynamicRoses, setDynamicRoses] = useState<RoseData[]>([]);
  const spinDuration = isSong ? 1 / 0.75 : 1 / 0.55;

  const handlePlayPause = () => {
    if (isPlaying && vinylRef.current) {
      const computedStyle = window.getComputedStyle(vinylRef.current);
      const transform = computedStyle.transform;
      if (transform && transform !== 'none') {
        const matrix = new DOMMatrix(transform);
        const angle = Math.atan2(matrix.b, matrix.a) * (180 / Math.PI);
        setRotation(angle < 0 ? angle + 360 : angle);
      }
    } else {
      startTimeRef.current = Date.now();
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    let spawnInterval: NodeJS.Timeout;

    if (isHovered) {
      spawnInterval = setInterval(() => {
        const newId = crypto.randomUUID();
        // Spawn anywhere 0-100%
        const spawnX = Math.random() * 100;
        const spawnY = Math.random() * 100;

        const newRose: RoseData = {
          id: newId,
          x: spawnX,
          y: spawnY,
          rotation: Math.random() * 360,
          scale: 0.7 + Math.random() * 0.6,
          variant: Math.floor(Math.random() * 3),
          isWilting: false,
        };

        setDynamicRoses((prev) => {
          const sliced = prev.length > 8 ? prev.slice(1) : prev;
          return [...sliced, newRose];
        });

        // Life duration 3-5 seconds
        const lifeDuration = 3000 + Math.random() * 2000;

        setTimeout(() => {
          // 1. Trigger wilt (CSS takes 2s)
          setDynamicRoses((current) => current.map((r) => (r.id === newId ? { ...r, isWilting: true } : r)));

          // 2. Remove from DOM (2.1s later)
          setTimeout(() => {
            setDynamicRoses((current) => current.filter((r) => r.id !== newId));
          }, 2100);
        }, lifeDuration);
      }, 800);
    } else {
      setDynamicRoses([]);
    }

    return () => clearInterval(spawnInterval);
  }, [isHovered]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      requestAnimationFrame(() => {
        const offset = 20;
        let x = e.clientX + offset;
        let y = e.clientY - 70;
        if (x + 300 > window.innerWidth) x = e.clientX - 300 - offset;
        if (y < 0) y = e.clientY + offset;
        setMousePosition({ x, y });
      });
    };
    if (isHovered) document.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [isHovered]);

  if (isLoading)
    return (
      <div className='relative'>
        <div className='w-64 h-64 bg-neutral-200 rounded-lg animate-pulse' />
      </div>
    );

  return (
    <div className='relative'>
      <style jsx>{componentStyles}</style>

      {/* Tooltip */}
      {isHovered && (
        <div className='fixed z-50 pointer-events-none hidden sm:block' style={{ left: mousePosition.x, top: mousePosition.y }}>
          <div className='bg-neutral-900/90 backdrop-blur-md text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg border border-neutral-700/50 animate-in fade-in zoom-in-95'>
            <span className='font-bold'>{artist}</span> • {music}
          </div>
        </div>
      )}

      <div className='relative group perspective-1000'>
        {/* Vinyl Record */}
        <div
          className={`absolute -left-16 sm:-left-24 top-1/2 -translate-y-1/2 transition-all duration-500 ease-out z-0 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12 sm:translate-x-24'}`}
        >
          <div className='relative w-50 h-50 sm:w-70 sm:h-70'>
            <div
              ref={vinylRef}
              className='w-full h-full'
              style={{
                transform: isPlaying ? undefined : `rotate(${rotation}deg)`,
                animation: isPlaying ? `spin ${spinDuration}s linear infinite` : 'none',
                animationDelay: isPlaying ? `${-rotation / (360 / spinDuration)}s` : undefined,
              }}
            >
              <Image
                src='https://pngimg.com/d/vinyl_PNG95.png'
                alt='Vinyl Record'
                width={80}
                height={80}
                className='w-full h-full object-contain'
                unoptimized
              />
            </div>
          </div>
        </div>

        {/* CONTAINER */}
        <div
          className='relative w-48 h-48 sm:w-64 sm:h-64'
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handlePlayPause}
        >
          {/* Album Art */}
          <div className='absolute inset-0 z-10 overflow-hidden rounded-sm shadow-2xl transition-all duration-300 ease-out group-hover:shadow-3xl cursor-pointer'>
            <Image
              src={albumArt}
              alt={`${music} Cover`}
              width={256}
              height={256}
              className={`w-full h-full object-cover transition-all duration-300 ease-out group-hover:scale-105 filter group-hover:brightness-[0.6] group-hover:contrast-125 ${!imageLoaded ? 'opacity-0' : 'opacity-100'}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(true)}
              unoptimized
            />
            {!imageLoaded && <div className='absolute inset-0 bg-neutral-800 animate-pulse' />}
            <div className={`absolute bottom-2 left-2 transition-opacity duration-300 z-50 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
              <div className='flex items-center gap-2'>
                <div className='w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg border border-white/10'>
                  {isPlaying ? (
                    <div className='flex gap-0.5'>
                      <div className='w-0.5 h-3 bg-white rounded'></div>
                      <div className='w-0.5 h-3 bg-white rounded'></div>
                    </div>
                  ) : (
                    <div className='w-0 h-0 border-l-[6px] border-l-white border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent ml-0.5'></div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Vines Overlay */}
          <div className='absolute inset-0 z-20 pointer-events-none'>
            {dynamicRoses.map((rose) => (
              <DynamicVine key={rose.id} x={rose.x} y={rose.y} rotation={rose.rotation} scale={rose.scale} variant={rose.variant} isWilting={rose.isWilting} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
