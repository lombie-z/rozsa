'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { usePlaying } from '@/lib/playing-context';

// Component-specific styles
const componentStyles = `
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
  // Stable ID for this record used to coordinate "one playing at a time"
  const recordId = `${artist}—${music}`;
  const { playingId, setPlayingId } = usePlaying();

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  // On touch devices the first tap activates the controls; the second tap plays/pauses
  const [isTouched, setIsTouched] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const vinylRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  // rAF-based rotation — avoids the CSS animationDelay jump on pause/resume
  const rotationRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  // Tracks the last touchend timestamp so the ghost click fired by iOS Safari
  // ~300ms later can be ignored (React 18 registers passive touch listeners so
  // e.preventDefault() inside onTouchEnd cannot suppress the synthetic click).
  const lastTouchTimeRef = useRef<number>(0);
  // Mirror isPlaying into a ref so the unmount cleanup can read the live value
  // without being caught in a stale closure.
  const isPlayingRef = useRef(false);

  useEffect(() => {
    setIsTouchDevice(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  // Keep the ref in sync so unmount cleanup always sees the current value
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // On unmount: cancel any running rAF and release the global playing slot
  // if this record currently holds it, so nothing stays "playing" after the
  // component is gone (e.g. route navigation, conditional render).
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (isPlayingRef.current) {
        setPlayingId(null);
      }
    };
  // setPlayingId is the useState setter from context — guaranteed stable.
  // recordId is derived from props and won't change for a given instance.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Degrees per ms: ~3.5s per revolution for songs, ~4s for albums
  const degreesPerMs = isSong ? 360 / 3500 : 360 / 4000;

  // rAF spin loop — drives rotation directly on the DOM node so there is no
  // CSS animation restart and therefore no jump when pausing/resuming.
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTimestampRef.current = null;
      return;
    }
    const tick = (timestamp: number) => {
      if (lastTimestampRef.current !== null) {
        rotationRef.current = (rotationRef.current + degreesPerMs * (timestamp - lastTimestampRef.current)) % 360;
        if (vinylRef.current) {
          vinylRef.current.style.transform = `rotate(${rotationRef.current}deg)`;
        }
      }
      lastTimestampRef.current = timestamp;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      lastTimestampRef.current = null;
    };
  }, [isPlaying, degreesPerMs]);

  const doPlayPause = () => {
    if (isPlaying) {
      setPlayingId(null);
    } else {
      setPlayingId(recordId);
    }
    setIsPlaying(!isPlaying);
  };

  // Stop this record when another one starts playing
  useEffect(() => {
    if (isPlaying && playingId !== recordId) {
      setIsPlaying(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playingId]);

  const handleTap = () => {
    if (isTouchDevice && !isTouched) {
      // First tap on touch device: reveal controls, don't play yet
      setIsTouched(true);
      return;
    }
    // Second tap on touch, or any click on pointer device: play/pause
    doPlayPause();
  };

  // On mobile, onTouchEnd is the authoritative handler. We record the time so
  // the ghost click that iOS/Android fires ~300ms later can be detected and
  // ignored (React 18 passive listeners mean e.preventDefault() in onTouchEnd
  // cannot suppress that ghost click).
  const handleTouchEnd = (_e: React.TouchEvent) => {
    lastTouchTimeRef.current = performance.now();
    handleTap();
  };

  const handleClick = () => {
    // Drop ghost clicks from touch — anything within 600 ms of the last touchend
    if (performance.now() - lastTouchTimeRef.current < 600) return;
    handleTap();
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

  // Controls visible on hover/touch-active, and vinyl stays out while playing
  const showControls = isHovered || isTouched || isPlaying;

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
        {/* Vinyl record — slides out to the left on hover/play.
            Mobile: w-32 (-left-12) to match the w-36 album card.
            Desktop sm+: w-60 (-left-20) — slightly smaller than the w-64 card. */}
        <div
          className={`absolute -left-12 sm:-left-20 top-1/2 -translate-y-1/2 transition-all duration-500 ease-out ${
            showControls ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12 sm:translate-x-20'
          }`}
        >
          <div className='relative w-32 h-32 sm:w-60 sm:h-60'>
            <div
              ref={vinylRef}
              className='w-full h-full'
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
              {/* Track info — shown on mobile when controls are active */}
              <div className='sm:hidden'>
                <div className='text-white text-[10px] font-medium whitespace-nowrap bg-black/40 backdrop-blur-sm px-2 py-1 rounded'>
                  {music}
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
