'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

// Component-specific styles
const componentStyles = `
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
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
  // On touch devices the first tap activates the controls; the second tap plays/pauses
  const [isTouched, setIsTouched] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [rotation, setRotation] = useState(0);
  const vinylRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    setIsTouchDevice(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  // Calculate spin duration based on type: songs (0.75 rev/sec) vs albums (0.55 rev/sec)
  const spinDuration = isSong ? 1 / 0.75 : 1 / 0.55; // Convert rev/sec to seconds per revolution

  const doPlayPause = () => {
    if (isPlaying) {
      // Pause: capture current rotation
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

  const handleClick = () => {
    if (isTouchDevice && !isTouched) {
      // First tap on touch device: reveal controls, don't play yet
      setIsTouched(true);
      return;
    }
    // Second tap on touch, or any click on pointer device: play/pause
    doPlayPause();
  };

  // Handle touch explicitly to avoid iOS Safari dropping clicks inside
  // snap-scroll containers. preventDefault() also cancels the ghost click
  // that would otherwise fire ~300ms later and double-trigger handleClick.
  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    handleClick();
  };

  // Dismiss touch-active state when the user taps elsewhere (not on the card itself)
  useEffect(() => {
    if (!isTouched) return;
    const dismiss = (e: TouchEvent) => {
      if (cardRef.current?.contains(e.target as Node)) return;
      setIsTouched(false);
    };
    document.addEventListener('touchstart', dismiss, { passive: true, capture: true });
    return () => document.removeEventListener('touchstart', dismiss, { capture: true });
  }, [isTouched]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      requestAnimationFrame(() => {
        const tooltipWidth = 300; // Increased for more content
        const tooltipHeight = 60; // Increased for multiple lines
        const offset = 20;

        let x = e.clientX + offset;
        let y = e.clientY - tooltipHeight - 10;

        // Prevent tooltip from going off right edge
        if (x + tooltipWidth > window.innerWidth) {
          x = e.clientX - tooltipWidth - offset;
        }

        // Prevent tooltip from going off top edge
        if (y < 0) {
          y = e.clientY + offset;
        }

        // Prevent tooltip from going off bottom edge
        if (y + tooltipHeight > window.innerHeight) {
          y = e.clientY - tooltipHeight - offset;
        }

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
          {/* Loading skeleton */}
          <div className='w-48 h-48 sm:w-64 sm:h-64 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse' />
        </div>
      </div>
    );
  }

  // Controls are visible on hover (desktop) or after first tap (touch)
  const showControls = isHovered || isTouched;

  return (
    <div className='relative'>
      {/* Component-specific styles */}
      <style jsx>{componentStyles}</style>

      {/* Tooltip that follows cursor - desktop only */}
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

      {/* Main container */}
      <div className='relative group'>
        {/* Vinyl record — hidden on mobile to prevent overflow outside the card */}
        <div
          className={`absolute -left-24 top-1/2 -translate-y-1/2 transition-all duration-500 ease-out hidden sm:block ${
            showControls ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-24'
          }`}
        >
          <div className='relative w-70 h-70'>
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

        {/* Album artwork */}
        <div
          ref={cardRef}
          className='relative overflow-hidden shadow-2xl transition-all duration-300 ease-out hover:scale-105 hover:shadow-3xl cursor-pointer w-36 h-36 sm:w-64 sm:h-64'
          style={{ touchAction: 'manipulation' }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleClick}
          onTouchEnd={handleTouchEnd}
        >
          <Image
            src={albumArt}
            alt={`${music} Cover`}
            width={256}
            height={256}
            className={`w-full h-full object-cover transition-all duration-300 ease-out group-hover:scale-110 ${!imageLoaded ? 'opacity-0' : 'opacity-100'}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageLoaded(true);
            }}
            unoptimized
          />

          {/* Loading state overlay */}
          {!imageLoaded && <div className='absolute inset-0 bg-neutral-200 dark:bg-neutral-800 animate-pulse' />}

          {/* Play/Pause button + artist info */}
          <div className={`absolute bottom-2 left-2 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
            <div className='flex items-center gap-2'>
              {/* Play/Pause icon */}
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
              {/* Artist / track info — always shown on mobile when controls are active */}
              <div className='sm:hidden'>
                <div className='text-white text-[10px] font-medium whitespace-nowrap bg-black/40 backdrop-blur-sm px-2 py-1 rounded'>
                  <span className='font-bold'>{artist}</span> • {music}
                </div>
              </div>
            </div>
          </div>

          {/* Hover/active gradient overlay */}
          <div className={`absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`} />
        </div>
      </div>
    </div>
  );
}
