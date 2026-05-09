'use client';

import { FC, useState, useEffect, useRef } from 'react';

interface LoadingScreenProps {
  ready: boolean;
}

const MIN_DISPLAY_MS = 2000;

// The "r" glyph occupies roughly y=30 to y=240 in the 300-tall viewBox.
// Map fill percent to that range so the fill is visible from the start.
const TEXT_TOP = 30;
const TEXT_BOTTOM = 240;

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

  // Map fill percent to the letter's vertical bounds
  const fillY = TEXT_BOTTOM - (fillPercent / 100) * (TEXT_BOTTOM - TEXT_TOP);

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
      {/* Ambient red glow — intensifies with fill */}
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
        viewBox="0 0 200 300"
        style={{
          width: 'min(35vw, 40vh)',
          height: 'auto',
          overflow: 'visible',
          opacity: phase === 'filling' ? 1 : 0,
          transition: 'opacity 0.8s ease-out',
        }}
      >
        <defs>
          <clipPath id="r-clip">
            <text
              x="50%"
              y="75%"
              fontFamily="'UnifrakturMaguntia', serif"
              fontSize="280"
              textAnchor="middle"
            >
              r
            </text>
          </clipPath>
        </defs>

        {/* Outline "r" — offset down-left for depth (double vision) */}
        <text
          x="96"
          y="231"
          dx="-4"
          dy="6"
          fontFamily="'UnifrakturMaguntia', serif"
          fontSize="280"
          textAnchor="middle"
          fill="rgba(120, 35, 25, 0.35)"
          stroke="rgba(180, 60, 40, 0.4)"
          strokeWidth="0.3"
        >r</text>

        {/* Everything inside clipped to the "r" shape */}
        <g clipPath="url(#r-clip)">
          {/* Solid fill rising from bottom */}
          <rect
            x="-20"
            y={fillY}
            width="240"
            height={TEXT_BOTTOM - fillY + 20}
            fill="rgba(100, 15, 15, 0.9)"
          />

          {/* Wave layer 1 — taller waves for visibility */}
          <path
            fill="rgba(140, 25, 20, 0.7)"
            transform={`translate(0, ${fillY - 10})`}
          >
            <animate
              attributeName="d"
              dur="2s"
              repeatCount="indefinite"
              values="
                M-20,18 Q10,0 40,18 T100,18 T160,18 T220,18 L220,40 L-20,40 Z;
                M-20,18 Q10,36 40,18 T100,18 T160,18 T220,18 L220,40 L-20,40 Z;
                M-20,18 Q10,0 40,18 T100,18 T160,18 T220,18 L220,40 L-20,40 Z
              "
            />
          </path>

          {/* Wave layer 2 (offset phase) */}
          <path
            fill="rgba(80, 15, 12, 0.5)"
            transform={`translate(0, ${fillY - 5})`}
          >
            <animate
              attributeName="d"
              dur="2.8s"
              repeatCount="indefinite"
              values="
                M-20,18 Q25,34 60,18 T120,18 T180,18 T220,18 L220,40 L-20,40 Z;
                M-20,18 Q25,2 60,18 T120,18 T180,18 T220,18 L220,40 L-20,40 Z;
                M-20,18 Q25,34 60,18 T120,18 T180,18 T220,18 L220,40 L-20,40 Z
              "
            />
          </path>
        </g>
      </svg>

    </div>
  );
};

export default LoadingScreen;
