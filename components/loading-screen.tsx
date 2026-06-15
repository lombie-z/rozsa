'use client';

import { FC, useState, useEffect, useRef } from 'react';

interface LoadingScreenProps {
  ready: boolean;
}

const MIN_DISPLAY_MS = 2000;

// Rose bloom: cross-fade the 4 rose graphics (small -> large) in place, each held
// for a minimum so the animation always plays even on a fast load.
const ROSE_FRAMES = ['/nav/bloom-0.png', '/nav/bloom-1.png', '/nav/bloom-2.png', '/nav/bloom-3.png'];
const ROSE_SCALES = [0.45, 0.63, 0.82, 1.0];
const ROSE_FRAME_MS = 480;

const LoadingScreen: FC<LoadingScreenProps> = ({ ready }) => {
  const [roseFrame, setRoseFrame] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'settling' | 'revealing'>('loading');
  const [dismissed, setDismissed] = useState(false);
  const mountTime = useRef(Date.now());
  const readyRef = useRef(false);
  const doneRef = useRef(false);

  useEffect(() => { readyRef.current = ready; }, [ready]);

  // Advance the rose bloom one frame at a time, each held for a minimum.
  useEffect(() => {
    if (roseFrame >= ROSE_FRAMES.length - 1) return;
    const t = setTimeout(() => setRoseFrame((f) => f + 1), ROSE_FRAME_MS);
    return () => clearTimeout(t);
  }, [roseFrame]);

  // Finish once the app is ready and the minimum display time has elapsed (by which
  // point the bloom has fully played); then fade the rose, then reveal the page.
  useEffect(() => {
    let raf: number;
    const tick = () => {
      if (doneRef.current) return;
      const elapsed = Date.now() - mountTime.current;
      if (readyRef.current && elapsed >= MIN_DISPLAY_MS) {
        doneRef.current = true;
        setPhase('settling');
        setTimeout(() => setPhase('revealing'), 800);
        setTimeout(() => setDismissed(true), 2000);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (dismissed) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#030304',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: phase === 'revealing' ? 0 : 1,
        transition: 'opacity 1.2s ease-in-out',
        pointerEvents: phase === 'revealing' ? 'none' : 'all',
      }}
    >
      {/* Ambient red glow — intensifies as the rose blooms */}
      <div
        style={{
          position: 'absolute',
          width: '80vmin',
          height: '80vmin',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(40, 175, 205, 0.5) 0%, rgba(25, 110, 140, 0.25) 30%, rgba(12, 55, 72, 0.1) 50%, transparent 70%)',
          opacity: phase === 'loading' ? Math.min(1, (roseFrame + 1) / ROSE_FRAMES.length) : 0,
          transition: 'opacity 0.6s ease-out',
          pointerEvents: 'none',
        }}
      />
      {/* Rose bloom — grows + swaps graphics in place as load runs */}
      <div
        style={{
          position: 'absolute',
          width: 'min(26vw, 30vh)',
          aspectRatio: '1 / 1',
          transform: `scale(${ROSE_SCALES[roseFrame]})`,
          transformOrigin: 'center',
          opacity: phase === 'loading' ? 0.95 : 0,
          transition: 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.8s ease-out',
          filter: 'drop-shadow(0 0 16px rgba(40, 175, 210, 0.45))',
          pointerEvents: 'none',
        }}
      >
        {ROSE_FRAMES.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              opacity: i === roseFrame ? 1 : 0,
              transition: 'opacity 0.45s ease-out',
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default LoadingScreen;
