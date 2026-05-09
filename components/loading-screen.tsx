'use client';

import { FC, useState, useEffect, useRef } from 'react';

interface LoadingScreenProps {
  ready: boolean;
}

const MIN_DISPLAY_MS = 2000;

// Bounding box of the extracted "r" glyph path
const GLYPH_TOP = 106;
const GLYPH_BOTTOM = 256;

const R_PATH = 'M53.59 214.06L53.46 147.75Q53.46 143.38 55.64 142.15L65.49 136.40Q68.63 134.49 75.06 143.10Q76.43 144.88 78.48 143.86Q80.53 142.83 78.48 140.37Q64.12 124.37 56.46 108.92Q54.14 105.78 51.41 108.92Q43.75 117.81 37.12 122.46Q30.49 127.11 17.64 130.12Q15.18 130.80 15.18 132.30Q15.18 133.81 16.95 134.49Q26.11 135.99 25.98 150.21L25.98 208.05Q25.98 221.99 20.78 225.14Q14.77 229.10 10.94 222.26Q9.43 219.39 7.52 220.90Q5.61 222.40 7.66 225.68Q11.62 231.97 15.24 238.53Q18.87 245.10 22.70 251.66Q25.02 255.76 28.85 253.16Q48.95 243.46 52.91 228.55Q53.32 227.19 54.55 226.84Q55.78 226.50 56.74 227.73L77.79 251.93Q78.61 252.75 79.71 252.68Q80.80 252.62 81.48 251.52L95.84 224.04Q96.39 222.81 95.57 221.72L79.16 202.03Q78.20 201.07 77.04 201.21Q75.88 201.35 75.47 202.44L64.39 222.95Q63.85 223.77 62.69 223.97Q61.52 224.18 60.57 223.22L54.14 215.43Q53.59 214.88 53.59 214.06';

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

  const fillY = GLYPH_BOTTOM - (fillPercent / 100) * (GLYPH_BOTTOM - GLYPH_TOP);

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
        viewBox="0 0 105 270"
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
          transform="translate(-4, 6)"
        />

        {/* Everything clipped to the "r" shape */}
        <g clipPath="url(#r-clip)">
          {/* Solid fill rising from bottom */}
          <rect
            x="-10"
            y={fillY}
            width="120"
            height={GLYPH_BOTTOM - fillY + 10}
            fill="rgba(100, 15, 15, 0.9)"
          />

          {/* Wave layer 1 */}
          <path
            fill="rgba(140, 25, 20, 0.7)"
            transform={`translate(0, ${fillY - 8})`}
          >
            <animate
              attributeName="d"
              dur="2s"
              repeatCount="indefinite"
              values="
                M-10,12 Q8,0 25,12 T60,12 T95,12 T115,12 L115,30 L-10,30 Z;
                M-10,12 Q8,24 25,12 T60,12 T95,12 T115,12 L115,30 L-10,30 Z;
                M-10,12 Q8,0 25,12 T60,12 T95,12 T115,12 L115,30 L-10,30 Z
              "
            />
          </path>

          {/* Wave layer 2 (offset phase) */}
          <path
            fill="rgba(80, 15, 12, 0.5)"
            transform={`translate(0, ${fillY - 4})`}
          >
            <animate
              attributeName="d"
              dur="2.8s"
              repeatCount="indefinite"
              values="
                M-10,12 Q15,22 35,12 T70,12 T100,12 T115,12 L115,30 L-10,30 Z;
                M-10,12 Q15,2 35,12 T70,12 T100,12 T115,12 L115,30 L-10,30 Z;
                M-10,12 Q15,22 35,12 T70,12 T100,12 T115,12 L115,30 L-10,30 Z
              "
            />
          </path>
        </g>
      </svg>
    </div>
  );
};

export default LoadingScreen;
