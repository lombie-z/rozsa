'use client';

import { useEffect, useRef } from 'react';

// --- MATH & GEOMETRY PRE-CALCULATION ---
// Adjusted to store radius 'r' for petal sizing later
const generateRosePoints = () => {
  // Store r,g,b components separately for easier alpha manipulation later
  const points: { x: number; y: number; rNorm: number; rgb: [number, number, number] }[] = [];
  // Increased resolution slightly for smoother painterly effect
  const xCount = 30;
  const thetaCount = 150;

  for (let x = 0; x <= 1; x += 1 / xCount) {
    for (let theta = -2 * Math.PI; theta <= 15 * Math.PI; theta += (10 * Math.PI) / thetaCount) {
      const phi = (Math.PI / 2) * Math.exp(-theta / (8 * Math.PI));
      const X_val = 1 - 0.5 * ((5 / 4) * (1 - ((3.6 * theta) % (2 * Math.PI)) / Math.PI) ** 2 - 0.25) ** 2;
      const y_val = 1.95653 * x ** 2 * (1.27689 * x - 1) ** 2 * Math.sin(phi);
      let r = X_val * (x * Math.sin(phi) + y_val * Math.cos(phi));

      if (r > 0) {
        // Normalize r roughly between 0 and 1 for later calculations
        const rNorm = r;
        const factor = 0.8;
        r = r * factor;
        const pX = r * Math.sin(theta);
        const pY = r * Math.cos(theta);

        // Deeper, richer red base colors
        // Outer petals (larger r) get deeper red
        const red = Math.floor(180 + rNorm * 75);
        const green = Math.floor(10 + rNorm * 20);
        const blue = Math.floor(30 + rNorm * 30);

        points.push({ x: pX, y: pY, rNorm, rgb: [red, green, blue] });
      }
    }
  }
  return points;
};

const ROSE_GEOMETRY = generateRosePoints();

interface VineCanvasProps {
  active: boolean;
  width: number;
  height: number;
}

export default function VineCanvas({ active, width, height }: VineCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!active) {
      ctx.clearRect(0, 0, width, height);
      cancelAnimationFrame(animationRef.current);
      return;
    }

    // --- GENERATIVE STATE ---
    // Add base color properties to the vine interface
    let vines: {
      x: number;
      y: number;
      angle: number;
      width: number;
      life: number;
      speed: number;
      curve: number;
      baseR: number;
      baseG: number;
      baseB: number; // Store base colors
    }[] = [];

    const roses: { x: number; y: number; scale: number; currentScale: number }[] = [];

    const startVines = () => {
      const count = 6;
      for (let i = 0; i < count; i++) {
        const startX = width / 2 + (Math.random() - 0.5) * 100;
        const startY = height / 2 + 80 + Math.random() * 40;

        vines.push({
          x: startX,
          y: startY,
          angle: -Math.PI / 2 + (Math.random() - 0.5) * 1.2,
          width: 4 + Math.random() * 3,
          life: 100 + Math.random() * 60,
          speed: 2 + Math.random() * 1.5,
          curve: (Math.random() - 0.5) * 0.2,
          // Give each main vine slightly different base greens
          baseR: 60 + Math.random() * 40,
          baseG: 120 + Math.random() * 60,
          baseB: 60 + Math.random() * 40,
        });
      }
    };

    startVines();

    const render = () => {
      // We don't clear the canvas here to allow vines to draw continuous lines.
      // The parent component handles showing/hiding the whole canvas.

      // --- DRAW VINES ---
      vines.forEach((vine) => {
        if (vine.life <= 0) return;

        ctx.beginPath();
        ctx.moveTo(vine.x, vine.y);

        // Move Walker
        vine.x += Math.cos(vine.angle) * vine.speed;
        vine.y += Math.sin(vine.angle) * vine.speed;
        vine.angle += vine.curve + (Math.random() - 0.5) * 0.15;
        vine.life--;
        vine.width *= 0.985;

        ctx.lineTo(vine.x, vine.y);

        // --- NEW COLOR CALCULATION ---
        // 1. Calculate normalized height (0.0 at top, 1.0 at bottom)
        const normalizedY = Math.min(1, Math.max(0, vine.y / height));
        // 2. Calculate red light intensity (stronger near top)
        const redLightIntensity = Math.pow(1.0 - normalizedY, 2); // Square it to make it fall off faster

        // 3. Apply lighting to base colors
        // Add significant red near top, slight green reduction near top
        const finalR = Math.min(255, vine.baseR + redLightIntensity * 180);
        const finalG = Math.min(255, vine.baseG + redLightIntensity * 50);
        const finalB = Math.min(255, vine.baseB * (1 - redLightIntensity * 0.3)); // Make it warmer near top

        ctx.strokeStyle = `rgba(${finalR | 0}, ${finalG | 0}, ${finalB | 0}, ${vine.life / 80})`;
        ctx.lineWidth = vine.width;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Spawn logic (Unchanged)
        if ((vine.life < 15 && Math.random() > 0.6 && vine.width < 2) || (Math.random() < 0.015 && vine.life > 50)) {
          roses.push({
            x: vine.x,
            y: vine.y,
            scale: 7 + Math.random() * 8,
            currentScale: 0,
          });
          if (vine.life < 15) vine.life = 0;
        }

        // Branching logic (Pass on base colors)
        if (Math.random() < 0.025 && vine.width > 2) {
          vines.push({
            ...vine,
            angle: vine.angle + (Math.random() < 0.5 ? 0.9 : -0.9),
            width: vine.width * 0.6,
            life: vine.life * 0.8,
            // Inherit base color with slight mutation
            baseR: vine.baseR + (Math.random() - 0.5) * 20,
            baseG: vine.baseG + (Math.random() - 0.5) * 20,
            baseB: vine.baseB + (Math.random() - 0.5) * 20,
          });
        }
      });

      // --- DRAW ROSES (Painterly Style) ---
      roses.forEach((rose) => {
        if (rose.currentScale < rose.scale) {
          rose.currentScale += 0.25;
        }

        // Iterate with a 'step' to draw petals instead of a dense point cloud
        const step = 3; // Draw every 3rd point from geometry
        for (let i = 0; i < ROSE_GEOMETRY.length; i += step) {
          const p = ROSE_GEOMETRY[i];
          const pixelX = rose.x + p.x * rose.currentScale;
          const pixelY = rose.y + p.y * rose.currentScale;

          if (pixelX > -50 && pixelX < width + 50 && pixelY > -50 && pixelY < height + 50) {
            // Calculate petal size based on distance from center (p.rNorm)
            // Inner petals small, outer petals large.
            const petalRadius = (0.8 + p.rNorm * 3) * (rose.currentScale / 8);

            ctx.beginPath();
            // Use semi-transparent RGB colors. Overlapping creates depth.
            ctx.fillStyle = `rgba(${p.rgb[0]}, ${p.rgb[1]}, ${p.rgb[2]}, 0.3)`;
            // Draw a circle (petal) instead of a rectangle (pixel)
            ctx.arc(pixelX, pixelY, petalRadius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });

      // Cleanup
      vines = vines.filter((v) => v.life > 0);

      // Stop loop condition
      if (vines.length > 0 || roses.length < 40) {
        animationRef.current = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [active, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className='pointer-events-none transition-opacity duration-500'
      style={{ opacity: active ? 1 : 0 }}
      // Optional: mix-blend-mode can make the lighting integration look even better over dark covers
      // style={{ opacity: active ? 1 : 0, mixBlendMode: 'lighten' }}
    />
  );
}
