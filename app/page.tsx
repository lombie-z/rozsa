'use client';

import { useRef, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import dynamic from 'next/dynamic';
import { Canvas } from '@react-three/fiber';
import MusicArtwork from '@/components/record';

// Dynamically import the shader scene with SSR disabled since Three.js needs browser APIs
const ShaderScene = dynamic(() => import('@/components/shader-scene'), {
  ssr: false,
});

// Dynamically import the water shader with SSR disabled
const WaterShader = dynamic(() => import('@/components/water-shader').then((mod) => ({ default: mod.WaterShader })), {
  ssr: false,
});

// Dynamically import the simplified ROZSA text with SSR disabled
const RozsaTextSimple = dynamic(() => import('@/components/rozsa-text-simple').then((mod) => ({ default: mod.RozsaTextSimple })), {
  ssr: false,
});

// Sample record data - replace with your actual data
const allRecords = [
  { artist: 'Artist One', music: 'Track One', albumArt: 'https://placehold.co/400x400/450a0a/ffffff?text=Album+1', isSong: true },
  { artist: 'Artist Two', music: 'Track Two', albumArt: 'https://placehold.co/400x400/450a0a/ffffff?text=Album+2', isSong: false },
  { artist: 'Artist Three', music: 'Track Three', albumArt: 'https://placehold.co/400x400/450a0a/ffffff?text=Album+3', isSong: true },
  { artist: 'Artist Four', music: 'Track Four', albumArt: 'https://placehold.co/400x400/450a0a/ffffff?text=Album+4', isSong: false },
  { artist: 'Artist Five', music: 'Track Five', albumArt: 'https://placehold.co/400x400/450a0a/ffffff?text=Album+5', isSong: true },
  { artist: 'Artist Six', music: 'Track Six', albumArt: 'https://placehold.co/400x400/450a0a/ffffff?text=Album+6', isSong: false },
  { artist: 'Artist Seven', music: 'Track Seven', albumArt: 'https://placehold.co/400x400/450a0a/ffffff?text=Album+7', isSong: true },
  { artist: 'Artist Eight', music: 'Track Eight', albumArt: 'https://placehold.co/400x400/450a0a/ffffff?text=Album+8', isSong: false },
  { artist: 'Artist Nine', music: 'Track Nine', albumArt: 'https://placehold.co/400x400/450a0a/ffffff?text=Album+9', isSong: true },
  { artist: 'Artist Ten', music: 'Track Ten', albumArt: 'https://placehold.co/400x400/450a0a/ffffff?text=Album+10', isSong: false },
  { artist: 'Artist Eleven', music: 'Track Eleven', albumArt: 'https://placehold.co/400x400/450a0a/ffffff?text=Album+11', isSong: true },
  { artist: 'Artist Twelve', music: 'Track Twelve', albumArt: 'https://placehold.co/400x400/450a0a/ffffff?text=Album+12', isSong: false },
  { artist: 'Artist Thirteen', music: 'Track Thirteen', albumArt: 'https://placehold.co/400x400/450a0a/ffffff?text=Album+13', isSong: true },
  { artist: 'Artist Fourteen', music: 'Track Fourteen', albumArt: 'https://placehold.co/400x400/450a0a/ffffff?text=Album+14', isSong: false },
];

// Split records into pages: landing (1), then 2, 2, 7
const landingRecord = allRecords[0]; // 1 record for landing
const page2Records = allRecords.slice(1, 3); // 2 records (previously page 2)
const page3Records = allRecords.slice(3, 5); // 2 records (previously page 3)
const page4Records = allRecords.slice(5, 12); // 7 records (previously page 4)

export default function Home() {
  const mainRef = useRef<HTMLElement>(null);
  const landingRef = useRef<HTMLElement>(null);
  const rozsaRef = useRef<HTMLElement>(null);

  // Calculate scroll progress between landing and ROZSA pages
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
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
  }, []);

  // Calculate effect values based on scroll progress
  const overlayOpacity = Math.min(0.7, scrollProgress * 0.7);

  return (
    <main ref={mainRef} className='h-screen overflow-y-auto snap-y snap-mandatory'>
      {/* Landing Section - 1 Album with Full-Height Water Shader */}
      <section
        ref={landingRef}
        className='h-screen w-full snap-start snap-always bg-linear-to-b from-[#450a0a] to-[#0a0a0a] flex items-center justify-center py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden'
      >
        {/* ROZSA Text - Behind Water Horizon, Above Background */}
        <div className='absolute inset-0 w-full h-full z-[0.5] pointer-events-none'>
          <Canvas
            camera={{
              position: [0, 0, 15],
              fov: 50,
              near: 0.1,
              far: 2000,
            }}
            gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
            style={{ width: '100%', height: '100%', display: 'block' }}
          >
            <RozsaTextSimple />
          </Canvas>
        </div>

        {/* Water Shader - Full Height Background */}
        <motion.div
          className='absolute inset-0 w-full h-full z-1'
          style={{
            filter: `blur(${scrollProgress * 3}px) brightness(${1 - scrollProgress * 0.3})`,
          }}
        >
          <Canvas
            orthographic
            camera={{ zoom: 1, position: [0, 0, 1], near: 0.1, far: 1000 }}
            gl={{ alpha: true, antialias: false, preserveDrawingBuffer: true }}
            style={{ width: '100%', height: '100%', display: 'block' }}
            dpr={[1, 2]}
            frameloop='always'
          >
            <WaterShader scrollProgress={scrollProgress} />
          </Canvas>
        </motion.div>

        {/* Darkening Overlay */}
        <motion.div
          className='absolute inset-0 z-5 pointer-events-none'
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            opacity: overlayOpacity,
          }}
        />
      </section>

      {/* Page 1 - ROZSA Shader Scene */}
      <section ref={rozsaRef} className='h-screen w-full snap-start snap-always relative bg-linear-to-b from-[#120202] to-[#0a0a0a]'>
        <ShaderScene />
      </section>

      {/* Page 2 - 2 Records */}
      <section className='h-screen w-full snap-start snap-always bg-[#0a0a0a] flex items-center justify-center py-20 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-7xl w-full'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 justify-items-center'>
            {page2Records.map((record, index) => (
              <MusicArtwork key={index} artist={record.artist} music={record.music} albumArt={record.albumArt} isSong={record.isSong} />
            ))}
          </div>
        </div>
      </section>

      {/* Page 3 - 2 Records */}
      <section className='h-screen w-full snap-start snap-always bg-[#0a0a0a] flex items-center justify-center py-20 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-7xl w-full'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 justify-items-center'>
            {page3Records.map((record, index) => (
              <MusicArtwork key={index} artist={record.artist} music={record.music} albumArt={record.albumArt} isSong={record.isSong} />
            ))}
          </div>
        </div>
      </section>

      {/* Page 4 - 7 Records */}
      <section className='min-h-screen w-full snap-start snap-always bg-[#0a0a0a] flex items-center justify-center py-20 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-7xl w-full'>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-12 lg:gap-16 justify-items-center'>
            {page4Records.map((record, index) => (
              <MusicArtwork key={index} artist={record.artist} music={record.music} albumArt={record.albumArt} isSong={record.isSong} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
