'use client';

import { FC, useState, useEffect, useRef } from 'react';

interface LoadingScreenProps {
  ready: boolean;
}

const MIN_DISPLAY_MS = 2000;

const GLYPH_W = 91;
const GLYPH_H = 150;

const R_PATH = 'M47.99 108.26L47.86 41.95Q47.86 37.58 50.04 36.35L59.89 30.6Q63.03 28.69 69.46 37.3Q70.83 39.08 72.88 38.06Q74.93 37.03 72.88 34.57Q58.52 18.57 50.86 3.12Q48.54 -0.02 45.81 3.12Q38.15 12.01 31.52 16.66Q24.89 21.31 12.04 24.32Q9.58 25 9.58 26.5Q9.58 28.01 11.35 28.69Q20.51 30.19 20.38 44.41L20.38 102.25Q20.38 116.19 15.18 119.34Q9.17 123.3 5.34 116.46Q3.83 113.59 1.92 115.1Q0.01 116.6 2.06 119.88Q6.02 126.17 9.64 132.73Q13.27 139.3 17.1 145.86Q19.42 149.96 23.25 147.36Q43.35 137.66 47.31 122.75Q47.72 121.39 48.95 121.04Q50.18 120.7 51.14 121.93L72.19 146.13Q73.01 146.95 74.11 146.88Q75.2 146.82 75.88 145.72L90.24 118.24Q90.79 117.01 89.97 115.92L73.56 96.23Q72.6 95.27 71.44 95.41Q70.28 95.55 69.87 96.64L58.79 117.15Q58.25 117.97 57.09 118.17Q55.92 118.38 54.97 117.42L48.54 109.63Q47.99 109.08 47.99 108.26';

const LoadingScreen: FC<LoadingScreenProps> = ({ ready }) => {
  const [fillPercent, setFillPercent] = useState(0);
  const [phase, setPhase] = useState<'filling' | 'fading-r' | 'revealing'>('filling');
  const [dismissed, setDismissed] = useState(false);
  const mountTime = useRef(Date.now());
  const readyTime = useRef<number | null>(null);

  useEffect(() => {
    if (ready && !readyTime.current) {
      readyTime.current = Date.now();
    }
  }, [ready]);

  useEffect(() => {
    let raf: number;
    const animate = () => {
      const elapsed = Date.now() - mountTime.current;
      const isReady = readyTime.current !== null;
      const minTimeMet = elapsed >= MIN_DISPLAY_MS;

      if (isReady && minTimeMet) {
        setFillPercent(100);
        setPhase('fading-r');
        setTimeout(() => setPhase('revealing'), 800);
        setTimeout(() => setDismissed(true), 2000);
        return;
      }

      const target = isReady ? 95 : Math.min(85, (elapsed / MIN_DISPLAY_MS) * 85);
      setFillPercent((prev) => prev + (target - prev) * 0.03);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [ready]);

  if (dismissed) return null;

  const fillY = GLYPH_H - (fillPercent / 100) * GLYPH_H;

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
      {/* Ambient red glow */}
      <div
        style={{
          position: 'absolute',
          width: '80vmin',
          height: '80vmin',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(180, 50, 30, 0.5) 0%, rgba(120, 30, 15, 0.25) 30%, rgba(60, 15, 8, 0.1) 50%, transparent 70%)',
          opacity: phase === 'filling' ? Math.min(1, fillPercent / 60) : 0,
          transition: phase !== 'filling' ? 'opacity 0.8s ease-out' : undefined,
          pointerEvents: 'none',
        }}
      />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${GLYPH_W} ${GLYPH_H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{
          width: 'min(30vw, 35vh)',
          height: 'auto',
          overflow: 'visible',
          opacity: phase === 'filling' ? 1 : 0,
          transition: 'opacity 0.8s ease-out',
        }}
      >
        <defs>
          <clipPath id="r-clip">
            <path d={R_PATH} />
          </clipPath>
        </defs>

        {/* Outline "r" — offset down-left for depth */}
        <path
          d={R_PATH}
          fill="rgba(120, 35, 25, 0.35)"
          stroke="rgba(180, 60, 40, 0.4)"
          strokeWidth="0.3"
          transform="translate(-3, 4)"
        />

        {/* Everything clipped to the "r" shape */}
        <g clipPath="url(#r-clip)">
          {/* Solid fill rising from bottom */}
          <rect
            x="-5"
            y={fillY}
            width={GLYPH_W + 10}
            height={GLYPH_H - fillY + 5}
            fill="rgba(100, 15, 15, 0.9)"
          />

          {/* Wave layer 1 */}
          <path
            fill="rgba(140, 25, 20, 0.7)"
            transform={`translate(0, ${fillY - 6})`}
          >
            <animate
              attributeName="d"
              dur="2s"
              repeatCount="indefinite"
              values="
                M-5,10 Q8,0 22,10 T50,10 T78,10 T96,10 L96,24 L-5,24 Z;
                M-5,10 Q8,20 22,10 T50,10 T78,10 T96,10 L96,24 L-5,24 Z;
                M-5,10 Q8,0 22,10 T50,10 T78,10 T96,10 L96,24 L-5,24 Z
              "
            />
          </path>

          {/* Wave layer 2 (offset phase) */}
          <path
            fill="rgba(80, 15, 12, 0.5)"
            transform={`translate(0, ${fillY - 3})`}
          >
            <animate
              attributeName="d"
              dur="2.8s"
              repeatCount="indefinite"
              values="
                M-5,10 Q12,18 30,10 T60,10 T85,10 T96,10 L96,24 L-5,24 Z;
                M-5,10 Q12,2 30,10 T60,10 T85,10 T96,10 L96,24 L-5,24 Z;
                M-5,10 Q12,18 30,10 T60,10 T85,10 T96,10 L96,24 L-5,24 Z
              "
            />
          </path>
        </g>
      </svg>
    </div>
  );
};

export default LoadingScreen;
