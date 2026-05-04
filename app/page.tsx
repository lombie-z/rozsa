'use client';

import { useRef, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Canvas } from '@react-three/fiber';
import MusicArtwork from '@/components/record';
import { useIsMobile, usePrefersReducedMotion } from '@/lib/use-mobile';
import { PlayingProvider } from '@/lib/playing-context';

// Dynamically import the shader scene with SSR disabled since Three.js needs browser APIs
const ShaderScene = dynamic(() => import('@/components/shader-scene'), {
  ssr: false,
});

// Dynamically import the water shader with SSR disabled
const WaterShader = dynamic(() => import('@/components/water-shader').then((mod) => ({ default: mod.WaterShader })), {
  ssr: false,
});

const FluidOverlay = dynamic(() => import('@/components/fluid-overlay'), {
  ssr: false,
});

const GrainOverlay = dynamic(() => import('@/components/grain-overlay'), {
  ssr: false,
});

const ScanlineOverlay = dynamic(() => import('@/components/scanline-overlay'), {
  ssr: false,
});

const landingRecord = { artist: 'Isaac Rozsa', music: 'New Eye (Opens)', albumArt: '/albums/new-eye-opens.jpg', audioSrc: '/audio/new-eye-opens.mp3', isSong: true };

const socialLinks = [
  { name: 'Instagram', href: 'https://instagram.com/isaacrozsa', disabled: false, icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )},
  { name: 'Email', href: 'mailto:irl@isaacrozsa.com', disabled: false, icon: (
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
  { name: 'SoundCloud', href: 'https://soundcloud.com/isaac-rozsa', disabled: false, icon: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M1.2 14.3a.2.2 0 0 0-.2.2v3a.2.2 0 0 0 .4 0v-3a.2.2 0 0 0-.2-.2zm1.5-1.3a.2.2 0 0 0-.2.2v4.6a.2.2 0 0 0 .4 0v-4.6a.2.2 0 0 0-.2-.2zm1.5-1a.2.2 0 0 0-.2.2v5.6a.2.2 0 0 0 .4 0v-5.6a.2.2 0 0 0-.2-.2zm1.5.5a.2.2 0 0 0-.2.2v5.1a.2.2 0 0 0 .4 0v-5.1a.2.2 0 0 0-.2-.2zm1.5-2a.2.2 0 0 0-.2.2v7.1a.2.2 0 0 0 .4 0v-7.1a.2.2 0 0 0-.2-.2zm1.5-.5a.2.2 0 0 0-.2.2v7.6a.2.2 0 0 0 .4 0v-7.6a.2.2 0 0 0-.2-.2zM10.2 9a.2.2 0 0 0-.2.2v8.6a.2.2 0 0 0 .2.2h.1a4.5 4.5 0 0 0 0-.4V9.2a.2.2 0 0 0-.1-.2zm1.5-.5c-.1 0-.2.1-.2.2v9.1c0 .1.1.2.2.2h9.8a2.5 2.5 0 0 0 0-5 2.5 2.5 0 0 0-.6.1 4 4 0 0 0-4-3.6 4 4 0 0 0-1.4.3V8.7a.2.2 0 0 0-.3-.2z" />
    </svg>
  )},
  { name: 'Spotify', href: '#', disabled: true, icon: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.6 14.4a.6.6 0 0 1-.84.2c-2.3-1.4-5.2-1.72-8.6-.94a.6.6 0 1 1-.28-1.18c3.74-.86 6.94-.48 9.52 1.08a.6.6 0 0 1 .2.84zm1.24-2.72a.78.78 0 0 1-1.06.26c-2.64-1.62-6.66-2.1-9.78-1.14a.78.78 0 0 1-.44-1.5c3.56-1.08 7.98-.56 11.02 1.3a.78.78 0 0 1 .26 1.08zm.1-2.82c-3.16-1.88-8.36-2.06-11.38-1.14a.94.94 0 1 1-.54-1.8c3.46-1.06 9.22-.86 12.86 1.32a.94.94 0 0 1-.94 1.62z" />
    </svg>
  )},
  { name: 'YouTube', href: '#', disabled: true, icon: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.3-1.9.5-3.8.5-5.8s-.2-3.9-.5-5.8zM9.5 15.6V8.4l6.3 3.6-6.3 3.6z" />
    </svg>
  )},
];

export default function Home() {
  const mainRef = useRef<HTMLElement>(null);
  const landingRef = useRef<HTMLElement>(null);
  const rozsaRef = useRef<HTMLElement>(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  const isMobile = useIsMobile();
  const reducedMotion = usePrefersReducedMotion();

  // Calculate scroll progress between landing and ROZSA pages
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    // When reduced motion is preferred, keep scroll effects frozen
    if (reducedMotion) {
      setScrollProgress(0);
      return;
    }

    const updateScrollProgress = () => {
      if (!mainRef.current || !landingRef.current || !rozsaRef.current) return;

      const scrollTop = mainRef.current.scrollTop;
      const landingBottom = landingRef.current.offsetTop + landingRef.current.offsetHeight;
      const rozsaTop = rozsaRef.current.offsetTop;

      // Calculate progress from 0 (top of landing) to 1 (top of ROZSA page)
      const transitionStart = landingBottom - window.innerHeight;
      const transitionEnd = rozsaTop;
      const transitionDistance = transitionEnd - transitionStart;

      if (scrollTop < transitionStart) {
        setScrollProgress(0);
      } else if (scrollTop >= transitionEnd) {
        setScrollProgress(1);
      } else {
        const progress = (scrollTop - transitionStart) / transitionDistance;
        setScrollProgress(Math.max(0, Math.min(1, progress)));
      }
    };

    const handleScroll = () => {
      requestAnimationFrame(updateScrollProgress);
    };

    if (mainRef.current) {
      mainRef.current.addEventListener('scroll', handleScroll, { passive: true });
      updateScrollProgress(); // Initial calculation
    }

    return () => {
      if (mainRef.current) {
        mainRef.current.removeEventListener('scroll', handleScroll);
      }
    };
  }, [reducedMotion]);

  // Calculate effect values based on scroll progress
  // When reduced motion is preferred, skip all scroll-driven visual changes
  const albumOpacity = reducedMotion ? 1 : Math.max(0, 1 - scrollProgress * 1.5);
  const albumY = reducedMotion ? 0 : -scrollProgress * 100;
  const albumScale = reducedMotion ? 1 : Math.max(0.8, 1 - scrollProgress * 0.2);
  const overlayOpacity = reducedMotion ? 0 : Math.min(0.7, scrollProgress * 0.7);
  const shaderBlur = reducedMotion ? 0 : scrollProgress * 3;
  const shaderBrightness = reducedMotion ? 1 : 1 - scrollProgress * 0.3;

  // Cap DPR at 1 on mobile to halve GPU fill-rate cost
  const canvasDpr: [number, number] = isMobile ? [1, 1] : [1, 2];

  return (
    <PlayingProvider>
    {/* "Who am I" button */}
    <button
      onClick={() => setAboutOpen(true)}
      className='fixed top-6 right-6 z-50 px-5 py-2 rounded-full border border-white/20 text-white/50 text-sm font-medium hover:border-white/40 hover:text-white/80 transition-all duration-300 backdrop-blur-sm'
    >
      who am I
    </button>

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
            Just let me experiment.
          </p>
          <p className='text-white/40 leading-relaxed mb-4 text-sm'>
            Based in Sydney, Australia. Never forget the atrocities committed on this land prior.
          </p>
          <p className='text-white/40 leading-relaxed mb-4 text-sm'>
            Please reach out to collaborate, at <a href='mailto:irl@isaacrozsa.com' className='text-white/60 hover:text-white/80 transition-colors'>irl@isaacrozsa.com</a>
          </p>
          <p className='text-white/40 leading-relaxed text-sm'>
            Note – at this time I don't use any AI for my music.
          </p>
        </div>
      </div>
    )}

    {/* Use 100dvh (dynamic viewport height) instead of 100vh — fixes iOS Safari where
        the browser chrome eats into the viewport, causing content to be cut off. */}
    <main ref={mainRef} className='h-[100dvh] overflow-y-auto snap-y snap-mandatory bg-[#0a0a0a]'>
      {/* Landing Section - 1 Album with Full-Height Water Shader */}
      <section
        ref={landingRef}
        className='h-[100dvh] w-full snap-start snap-always bg-[#030304] flex items-center justify-center py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden'
      >
        {/* Water Shader — fixed to the viewport so it stays in place as the
            snap scroll happens, then fades out as the ROZSA section rises up
            from below ("diving under the surface" effect).
            Falls back to position: absolute for prefers-reduced-motion so
            the water just scrolls away naturally with the section. */}
        <motion.div
          className='water-shader-container inset-0 w-full h-full'
          style={{
            position: reducedMotion ? 'absolute' : 'fixed',
            zIndex: 10,
            pointerEvents: 'none',
            // Hide entirely once transition is complete — opacity:0 alone still lets the
            // fixed canvas sit in front of the ROZSA section and block pointer events,
            // because pointer-events:none on a parent does NOT prevent children with
            // pointer-events:auto (R3F's canvas default) from receiving events.
            visibility: scrollProgress >= 1 ? 'hidden' : 'visible',
            opacity: reducedMotion ? 1 : Math.max(0, 1 - scrollProgress),
            filter: `blur(${shaderBlur}px) brightness(${shaderBrightness})`,
          }}
        >
          <Canvas
            orthographic
            camera={{ zoom: 1, position: [0, 0, 1], near: 0.1, far: 1000 }}
            gl={{ alpha: true, antialias: false, preserveDrawingBuffer: true }}
            style={{ width: '100%', height: '100%', display: 'block' }}
            dpr={canvasDpr}
            frameloop='always'
            onCreated={({ gl }) => {
              // R3F sets touch-action:none inline on its canvas to handle 3D interactions.
              // Override both the canvas and its wrapper div so native scroll (wheel +
              // touch pan) passes through to the scrollable <main> container.
              gl.domElement.style.pointerEvents = 'none';
              gl.domElement.style.touchAction = 'auto';
              if (gl.domElement.parentElement) {
                gl.domElement.parentElement.style.pointerEvents = 'none';
                gl.domElement.parentElement.style.touchAction = 'auto';
              }
            }}
          >
            <WaterShader scrollProgress={scrollProgress} lowQuality={isMobile} />
          </Canvas>
        </motion.div>

        {/* Darkening Overlay — z-20 keeps it in front of the fixed water (z-10) */}
        <motion.div
          className='absolute inset-0 z-20 pointer-events-none'
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            opacity: overlayOpacity,
          }}
        />

        {/* Single Album - Centered — z-30 keeps it above water (z-10) and overlay (z-20) */}
        <motion.div
          className='max-w-7xl w-full relative z-30 flex items-center justify-center'
          style={{
            opacity: albumOpacity,
            y: albumY,
            scale: albumScale,
          }}
        >
          <MusicArtwork artist={landingRecord.artist} music={landingRecord.music} albumArt={landingRecord.albumArt} audioSrc={landingRecord.audioSrc} isSong={landingRecord.isSong} />
        </motion.div>
      </section>

      {/* Page 1 - ROZSA Shader Scene */}
      <section ref={rozsaRef} className='h-[100dvh] w-full snap-start snap-always relative bg-black'>
        <ShaderScene lowQuality={isMobile} />
      </section>

      {/* Page 2 - Social Links + Photos */}
      <section className='h-[100dvh] w-full snap-start snap-always bg-[#030304] flex'>
        {/* Social links — own column, ~1/3 width */}
        <div className='w-1/3 shrink-0 flex flex-col justify-center items-center gap-6'>
          {socialLinks.map((link) => (
            <a
              key={link.name}
              href={link.disabled ? undefined : link.href}
              target={link.disabled ? undefined : '_blank'}
              rel={link.disabled ? undefined : 'noopener noreferrer'}
              onClick={link.disabled ? (e: React.MouseEvent) => e.preventDefault() : undefined}
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
                <span className='absolute left-full ml-3 top-1/2 -translate-y-1/2 text-xs text-white/30 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300'>
                  coming soon
                </span>
              )}
            </a>
          ))}
        </div>
        {/* Photos — remaining 2/3, flex for hover expand */}
        <div className='flex-1 relative flex min-w-0 overflow-hidden opacity-20'>
          {['/photos/railing.jpg', '/photos/spider.jpg', '/photos/sunset.jpg'].map((src, i) => (
            <div key={src} className='relative flex-1 h-full overflow-hidden'>
              <Image
                src={src} alt='' width={600} height={900} unoptimized
                className='absolute top-0 left-1/2 -translate-x-1/2 h-full w-auto max-w-none'
                style={{ maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)' }}
              />
              <div className='absolute inset-0 z-20 pointer-events-none'>
                <Canvas
                  orthographic
                  camera={{ zoom: 1, position: [0, 0, 1], near: 0.1, far: 1000 }}
                  gl={{ alpha: true, antialias: false }}
                  style={{ width: '100%', height: '100%' }}
                  dpr={[1, 1]}
                  frameloop='always'
                >
                  {i === 0 && <GrainOverlay />}
                  {i === 1 && <ScanlineOverlay />}
                  {i === 2 && <FluidOverlay />}
                </Canvas>
              </div>
            </div>
          ))}
          {/* Black fade from top */}
          <div className='absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b from-black via-black/60 to-transparent pointer-events-none z-10' />
        </div>
      </section>
    </main>
    </PlayingProvider>
  );
}
