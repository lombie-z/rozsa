'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import VineCanvas from './vine-canvas';

// Component-specific styles (Unchanged)
const componentStyles = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

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

  const spinDuration = isSong ? 1 / 0.75 : 1 / 0.55;

  const handlePlayPause = () => {
    if (isPlaying) {
      if (vinylRef.current) {
        const computedStyle = window.getComputedStyle(vinylRef.current);
        const transform = computedStyle.transform;
        if (transform && transform !== 'none') {
          const matrix = new DOMMatrix(transform);
          const angle = Math.atan2(matrix.b, matrix.a) * (180 / Math.PI);
          setRotation(angle < 0 ? angle + 360 : angle);
        }
      }
    } else {
      startTimeRef.current = Date.now();
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      requestAnimationFrame(() => {
        const tooltipWidth = 300;
        const tooltipHeight = 60;
        const offset = 20;

        let x = e.clientX + offset;
        let y = e.clientY - tooltipHeight - 10;

        if (x + tooltipWidth > window.innerWidth) x = e.clientX - tooltipWidth - offset;
        if (y < 0) y = e.clientY + offset;
        if (y + tooltipHeight > window.innerHeight) y = e.clientY - tooltipHeight - offset;

        setMousePosition({ x, y });
      });
    };

    if (isHovered) {
      document.addEventListener('mousemove', handleMouseMove, { passive: true });
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isHovered]);

  if (isLoading) {
    return (
      <div className='relative'>
        <div className='relative group'>
          <div className='w-48 h-48 sm:w-64 sm:h-64 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse' />
        </div>
      </div>
    );
  }

  return (
    <div className='relative'>
      <style jsx>{componentStyles}</style>

      {/* Tooltip (Unchanged) */}
      {isHovered && (
        <div
          className='fixed z-50 pointer-events-none hidden sm:block'
          style={{
            left: mousePosition.x,
            top: mousePosition.y,
            transform: 'translateZ(0)',
          }}
        >
          <div className='bg-neutral-900/90 backdrop-blur-md text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap shadow-lg border border-neutral-700/50 animate-in fade-in zoom-in-95 duration-200'>
            <span className='font-bold'>{artist}</span> &nbsp;•&nbsp; {music}
          </div>
        </div>
      )}

      {/* Main container - The group hover state is tracked here */}
      <div className='relative group' onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        {/* Vinyl record (Behind) */}
        <div
          className={`absolute -left-16 sm:-left-24 top-1/2 -translate-y-1/2 transition-all duration-500 ease-out z-0 ${
            isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12 sm:translate-x-24'
          }`}
        >
          {/* ... Vinyl implementation unchanged ... */}
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

        {/* --- VINE ANIMATION LAYER --- */}
        {/* Moved OUTSIDE the overflow-hidden container below.
            Using negative insets to make it larger than the album art container.
            z-40 ensures it sits on top of the album art and shadows.
        */}
        <div className='absolute z-40 pointer-events-none -inset-20 sm:-inset-32 flex items-center justify-center'>
          <VineCanvas
            active={isHovered}
            // We make the canvas significantly larger than the 256x256 album art
            width={400}
            height={400}
          />
        </div>

        {/* Album Artwork Container - KEEPS overflow-hidden for image zooming */}
        <div
          className='relative overflow-hidden shadow-2xl transition-all duration-300 ease-out hover:scale-105 hover:shadow-3xl cursor-pointer w-48 h-48 sm:w-64 sm:h-64 z-10'
          onClick={handlePlayPause}
        >
          {/* Album Art Image */}
          <Image
            src={albumArt}
            alt={`${music} Cover`}
            width={256}
            height={256}
            className={`w-full h-full object-cover transition-all duration-300 ease-out group-hover:scale-110 ${!imageLoaded ? 'opacity-0' : 'opacity-100'} relative z-10`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageLoaded(true)}
            unoptimized
          />

          {/* Loading overlay */}
          {!imageLoaded && <div className='absolute inset-0 bg-neutral-200 dark:bg-neutral-800 animate-pulse z-30' />}

          {/* Play/Pause Button Overlay */}
          <div className={`absolute bottom-2 left-2 transition-opacity duration-300 z-30 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            {/* ... Play button implementation unchanged ... */}
            <div className='flex items-center gap-2'>
              <div className='w-8 h-8 bg-transparent rounded-full flex items-center justify-center shadow-lg'>
                {isPlaying ? (
                  <div className='flex gap-0.5'>
                    <div className='w-0.5 h-3 bg-white rounded'></div>
                    <div className='w-0.5 h-3 bg-white rounded'></div>
                  </div>
                ) : (
                  <div className='w-0 h-0 border-l-[6px] border-l-white border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent ml-0.5'></div>
                )}
              </div>
              <div className='sm:hidden'>
                <div className='text-white text-[10px] font-medium whitespace-nowrap bg-black/40 backdrop-blur-sm px-2 py-1 rounded'>
                  <span className='font-bold'>{artist}</span> • {music}
                </div>
              </div>
            </div>
          </div>

          {/* Hover Gradient Overlay */}
          <div className='absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 pointer-events-none' />
        </div>
      </div>
    </div>
  );
}
