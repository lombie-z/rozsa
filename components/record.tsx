'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  plasticWrap?: 1 | 2 | 3;
  subjects?: [string] | [string, string];
  audioSrc?: string;
  isLoading?: boolean;
  priority?: boolean;
  onImageReady?: () => void;
  frosted?: boolean;
}

const FROST_AREAS = 10;
const FROST_COUNT = FROST_AREAS * FROST_AREAS;

const frostStyles = `
  .frost-card {
    filter: url(#frost-card-filter);
    /* Promote to its own layer so the expensive SVG frost filter is rasterised
       once and ancestor tilt/animation just composites the cached bitmap. Stops
       the turbulence "swimming" and the jank when the card moves with the cursor. */
    will-change: transform;
    transform: translateZ(0);
    /* Frost mounts after the entrance settles; grow it in (scale only — no opacity,
       so the album never blinks) to mask the one-time filter rasterisation. */
    animation: frostIn 600ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  @keyframes frostIn {
    from { transform: translateZ(0) scale(1.06); }
    to   { transform: translateZ(0) scale(1); }
  }
  .frost-card-grid {
    position: absolute;
    inset: 0;
    z-index: 30;
    display: grid;
    grid-template-columns: repeat(${FROST_AREAS}, 1fr);
    background: #000;
    filter: blur(19px) brightness(5) contrast(80) invert(1) blur(5px) url(#frost-card-gray-pack) url(#frost-card-pack-lower);
    mix-blend-mode: plus-lighter;
    pointer-events: none;
  }
  .frost-card-grid i {
    display: block;
    background: #fff;
    opacity: 0;
    transition: opacity 4s;
    border-radius: 50%;
    scale: 2;
    pointer-events: auto;
  }
  .frost-card-grid i:is(:hover, :active) {
    opacity: 1;
    transition-duration: 0s;
  }
  /* Safari can't apply the chained CSS-filter + multiple url() pipeline above, so the
     raw white dots show through plus-lighter as opaque circles on hover. Hide the grid
     in Safari only (the base .frost-card frost still works) — graceful degradation.
     -webkit-named-image() is a WebKit/Safari-only feature, so this targets Safari. */
  @supports (background: -webkit-named-image(i)) {
    .frost-card-grid { display: none; }
  }
`;

export default function MusicArtwork({ artist, music, albumArt, isSong, plasticWrap, subjects, audioSrc, isLoading = false, priority = false, onImageReady, frosted = false }: MusicArtworkProps) {
  // Stable ID for this record used to coordinate "one playing at a time"
  const recordId = `${artist}—${music}`;
  const { playingId, setPlayingId, volume } = usePlaying();

  const [isHovered, setIsHovered] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  // On touch devices the first tap activates the controls; the second tap plays/pauses
  const [isTouched, setIsTouched] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mounted, setMounted] = useState(false);
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const subject1Ref = useRef<HTMLImageElement>(null);
  const subject2Ref = useRef<HTMLImageElement>(null);
  // Mirror isPlaying into a ref so the unmount cleanup can read the live value
  // without being caught in a stale closure.
  const isPlayingRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    setIsTouchDevice(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  useEffect(() => {
    if (!audioSrc) return;
    const audio = new Audio(audioSrc);
    audio.preload = 'none';
    audioRef.current = audio;
    const handleEnded = () => {
      setIsPlaying(false);
      setPlayingId(null);
    };
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audioRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioSrc]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

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
        const c = Math.abs(Math.sin(rotationRef.current * Math.PI / 180));
        const b = `brightness(${0.25 + 0.75 * c})`;
        if (subject1Ref.current) subject1Ref.current.style.filter = b;
        if (subject2Ref.current) subject2Ref.current.style.filter = b;
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
        if (!tooltipRef.current) return;
        const tooltipWidth = 200;
        const tooltipHeight = 30;
        const offset = 12;

        let x = e.clientX + offset;
        let y = e.clientY - tooltipHeight - 4;

        if (x + tooltipWidth > window.innerWidth) {
          x = e.clientX - tooltipWidth - offset;
        }
        if (y < 0) {
          y = e.clientY + offset;
        }

        tooltipRef.current.style.left = `${x}px`;
        tooltipRef.current.style.top = `${y}px`;
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
          <div className='w-48 h-48 sm:w-64 sm:h-64 bg-neutral-900 rounded-lg animate-pulse' />
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

      {/* Tooltip that follows cursor - portaled to body to escape 3D transform contexts */}
      {mounted && createPortal(
        <div
          ref={tooltipRef}
          className='fixed z-50 pointer-events-none hidden sm:block'
          style={{
            left: 0,
            top: 0,
            opacity: isHovered ? 1 : 0,
            transform: isHovered ? 'translateY(0)' : 'translateY(6px)',
            transition: 'opacity 300ms ease-out, transform 300ms ease-out',
          }}
        >
          <div className='bg-black/80 text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap border border-white/[0.06]'>
            {music}
          </div>
        </div>,
        document.body,
      )}

      {/* Main container */}
      <div className='relative group'>
        {/* Vinyl record — slides out to the left on hover/play.
            Mobile: w-32 (-left-12) to match the w-36 album card.
            Desktop sm+: w-60 (-left-20) — slightly smaller than the w-64 card. */}
        <div
          className={`absolute -left-14 sm:-left-20 top-1/2 -translate-y-1/2 transition-all duration-500 ease-out ${
            showControls ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-14 sm:translate-x-20'
          }`}
        >
          <div className='relative w-36 h-36 sm:w-60 sm:h-60'>
            <div
              ref={vinylRef}
              className='w-full h-full relative'
            >
              <Image
                src='/vinyl.svg'
                alt='Vinyl Record'
                width={80}
                height={80}
                className='w-full h-full object-contain'
              />
              {subjects && <div className={`absolute inset-0 transition-opacity duration-700 ${isPlaying ? 'opacity-100' : 'opacity-0'}`}>
                {subjects.length === 1 ? (
                  <div className='absolute inset-0 flex items-center justify-center'>
                    <div className='w-[40%] h-[40%] -translate-y-[55%] relative'>
                      <div className='absolute inset-0 overflow-hidden -translate-x-[8%] opacity-30'>
                        <Image src={subjects[0]} alt='' width={200} height={200} className='w-full h-full object-contain' style={{ filter: 'brightness(0.4) sepia(1) saturate(10) hue-rotate(340deg)' }} />
                      </div>
                      <div className='absolute inset-0 overflow-hidden translate-x-[8%] opacity-30'>
                        <Image src={subjects[0]} alt='' width={200} height={200} className='w-full h-full object-contain' style={{ filter: 'brightness(0.4) sepia(1) saturate(10) hue-rotate(340deg)' }} />
                      </div>
                      <div className='absolute inset-0 overflow-hidden opacity-70'>
                        <Image ref={subject1Ref} src={subjects[0]} alt='' width={200} height={200} className='w-full h-full object-contain' />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Subject 1 — top */}
                    <div className='absolute inset-0 flex items-center justify-center'>
                      <div className='w-[60%] h-[60%] -translate-y-[30%] relative'>
                        <div className='absolute inset-0 rounded-full overflow-hidden -translate-x-[8%] opacity-30'>
                          <Image src={subjects[0]} alt='' width={200} height={200} className='w-full h-full object-contain' style={{ filter: 'brightness(0.4) sepia(1) saturate(10) hue-rotate(340deg)' }} />
                        </div>
                        <div className='absolute inset-0 rounded-full overflow-hidden translate-x-[8%] opacity-30'>
                          <Image src={subjects[0]} alt='' width={200} height={200} className='w-full h-full object-contain' style={{ filter: 'brightness(0.4) sepia(1) saturate(10) hue-rotate(340deg)' }} />
                        </div>
                        <div className='absolute inset-0 rounded-full overflow-hidden opacity-70'>
                          <Image ref={subject1Ref} src={subjects[0]} alt='' width={200} height={200} className='w-full h-full object-contain' />
                        </div>
                      </div>
                    </div>
                    {/* Subject 2 — bottom */}
                    <div className='absolute inset-0 flex items-center justify-center'>
                      <div className='w-[60%] h-[60%] translate-y-[30%] relative'>
                        <div className='absolute inset-0 rounded-full overflow-hidden -translate-x-[8%] opacity-30'>
                          <Image src={subjects[1]} alt='' width={200} height={200} className='w-full h-full object-contain -scale-y-100 -scale-x-100' style={{ filter: 'brightness(0.4) sepia(1) saturate(10) hue-rotate(340deg)' }} />
                        </div>
                        <div className='absolute inset-0 rounded-full overflow-hidden translate-x-[8%] opacity-30'>
                          <Image src={subjects[1]} alt='' width={200} height={200} className='w-full h-full object-contain -scale-y-100 -scale-x-100' style={{ filter: 'brightness(0.4) sepia(1) saturate(10) hue-rotate(340deg)' }} />
                        </div>
                        <div className='absolute inset-0 rounded-full overflow-hidden opacity-70'>
                          <Image ref={subject2Ref} src={subjects[1]} alt='' width={200} height={200} className='w-full h-full object-contain -scale-y-100 -scale-x-100' />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>}
            </div>
          </div>
        </div>

        {/* Album artwork */}
        {frosted && <style>{frostStyles}</style>}
        <div
          ref={cardRef}
          className={`relative overflow-hidden shadow-2xl transition-all duration-300 ease-out cursor-pointer w-44 h-44 sm:w-72 sm:h-72 ${frosted ? 'frost-card' : ''}`}
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
            className={`w-full h-full object-cover transition-all duration-300 ease-out ${!imageLoaded ? 'opacity-0' : 'opacity-100'}`}
            onLoad={() => { setImageLoaded(true); onImageReady?.(); }}
            onError={() => {
              setImageLoaded(true);
            }}
            priority={priority}
          />

          {/* Plastic wrap overlay */}
          {plasticWrap && (
            <div className='absolute inset-0 pointer-events-none mix-blend-screen opacity-80'>
              <Image
                src={`/textures/plastic-wrap-${plasticWrap}.jpg`}
                alt=''
                fill
                className='object-cover'
              />
            </div>
          )}

          {/* Loading state overlay */}
          {!imageLoaded && <div className='absolute inset-0 bg-neutral-900 animate-pulse' />}

          {/* Hover/active gradient overlay */}
          <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 via-40% to-transparent transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`} />

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

          {/* Frosted hover grid + SVG filter defs */}
          {frosted && (
            <>
              <aside className='frost-card-grid' aria-hidden='true'>
                {Array.from({ length: FROST_COUNT }).map((_, i) => (
                  <i key={i} />
                ))}
              </aside>
              <svg width='0' height='0' style={{ position: 'absolute' }}>
                <defs>
                  <filter id='frost-card-filter' primitiveUnits='userSpaceOnUse' x='0%' y='0%' width='120%' height='120%'>
                    <feComponentTransfer result='bg' in='SourceGraphic'>
                      <feFuncR type='discrete' tableValues='0.000 0.016 0.032 0.048 0.063 0.079 0.095 0.111 0.127 0.143 0.159 0.175 0.190 0.206 0.222 0.238 0.254 0.270 0.286 0.302 0.317 0.333 0.349 0.365 0.381 0.397 0.413 0.429 0.444 0.460 0.476 0.492 0.508 0.524 0.540 0.556 0.571 0.587 0.603 0.619 0.635 0.651 0.667 0.683 0.698 0.714 0.730 0.746 0.762 0.778 0.794 0.810 0.825 0.841 0.857 0.873 0.889 0.905 0.921 0.937 0.952 0.968 0.984 1.000' />
                      <feFuncG type='discrete' tableValues='0.000 0.016 0.032 0.048 0.063 0.079 0.095 0.111 0.127 0.143 0.159 0.175 0.190 0.206 0.222 0.238 0.254 0.270 0.286 0.302 0.317 0.333 0.349 0.365 0.381 0.397 0.413 0.429 0.444 0.460 0.476 0.492 0.508 0.524 0.540 0.556 0.571 0.587 0.603 0.619 0.635 0.651 0.667 0.683 0.698 0.714 0.730 0.746 0.762 0.778 0.794 0.810 0.825 0.841 0.857 0.873 0.889 0.905 0.921 0.937 0.952 0.968 0.984 1.000' />
                      <feFuncB type='discrete' tableValues='0.000 0.016 0.032 0.048 0.063 0.079 0.095 0.111 0.127 0.143 0.159 0.175 0.190 0.206 0.222 0.238 0.254 0.270 0.286 0.302 0.317 0.333 0.349 0.365 0.381 0.397 0.413 0.429 0.444 0.460 0.476 0.492 0.508 0.524 0.540 0.556 0.571 0.587 0.603 0.619 0.635 0.651 0.667 0.683 0.698 0.714 0.730 0.746 0.762 0.778 0.794 0.810 0.825 0.841 0.857 0.873 0.889 0.905 0.921 0.937 0.952 0.968 0.984 1.000' />
                    </feComponentTransfer>
                    <feBlend result='blend-0' in='bg' in2='none' />
                    <feGaussianBlur result='blur-6' in='blend-0' stdDeviation='10' />
                    <feTurbulence result='turb' baseFrequency='0.420' type='fractalNoise' />
                    <feDisplacementMap result='disp' in='blur-6' in2='turb' scale='150' xChannelSelector='R' yChannelSelector='G' />
                    <feComponentTransfer result='mask' in='SourceGraphic'>
                      <feFuncR type='discrete' tableValues='0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000' />
                      <feFuncG type='discrete' tableValues='0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000' />
                      <feFuncB type='discrete' tableValues='0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000 0.000 0.333 0.667 1.000' />
                    </feComponentTransfer>
                    <feBlend result='mask2' />
                    <feColorMatrix result='cm0' in='mask2' values='0.761905 0.190476 0.047619 0 0 0.761905 0.190476 0.047619 0 0 0.761905 0.190476 0.047619 0 0 0 0 0 1 0' />
                    <feColorMatrix result='cm1' in='cm0' type='luminanceToAlpha' />
                    <feGaussianBlur result='blur-0' in='cm1' stdDeviation='0' />
                    <feComposite result='comp' in='disp' in2='blur-0' operator='in' />
                    <feMerge><feMergeNode in='blend-0' /><feMergeNode in='comp' /></feMerge>
                  </filter>
                  <filter id='frost-card-gray-pack'>
                    <feComponentTransfer result='packed' in='SourceGraphic'>
                      <feFuncR type='discrete' tableValues='0 0.3333 0.6667 1' />
                      <feFuncG type='discrete' tableValues='0 0.3333 0.6667 1 0 0.3333 0.6667 1 0 0.3333 0.6667 1 0 0.3333 0.6667 1' />
                      <feFuncB type='discrete' tableValues='0 0.3333 0.6667 1 0 0.3333 0.6667 1 0 0.3333 0.6667 1 0 0.3333 0.6667 1 0 0.3333 0.6667 1 0 0.3333 0.6667 1 0 0.3333 0.6667 1 0 0.3333 0.6667 1 0 0.3333 0.6667 1 0 0.3333 0.6667 1 0 0.3333 0.6667 1' />
                      <feFuncA type='identity' />
                    </feComponentTransfer>
                  </filter>
                  <filter id='frost-card-pack-lower'>
                    <feColorMatrix type='matrix' values='0.011764705882352941 0 0 0 0 0 0.011764705882352941 0 0 0 0 0 0.011764705882352941 0 0 0 0 0 1 0' />
                  </filter>
                </defs>
              </svg>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
