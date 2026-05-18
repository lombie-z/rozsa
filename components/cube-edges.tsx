'use client';

import { useMemo } from 'react';

function normalize(v: number[]): number[] {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len === 0) return [0, 0, 1];
  return [v[0] / len, v[1] / len, v[2] / len];
}

function buildBasis(normal: number[], tangentU: number[], tangentV: number[]): number[][] {
  return [
    [tangentU[0], tangentV[0], normal[0]],
    [tangentU[1], tangentV[1], normal[1]],
    [tangentU[2], tangentV[2], normal[2]],
  ];
}

function makeTransform(pos: number[], m: number[][]): string {
  return `matrix3d(${m[0][0]},${m[1][0]},${m[2][0]},0,${m[0][1]},${m[1][1]},${m[2][1]},0,${m[0][2]},${m[1][2]},${m[2][2]},0,${pos[0]},${pos[1]},${pos[2]},1)`;
}

const EDGE_DEFS = [
  { axis: [1, 0, 0], normalA: [0, 1, 0], normalB: [0, 0, 1] },
  { axis: [1, 0, 0], normalA: [0, 1, 0], normalB: [0, 0, -1] },
  { axis: [1, 0, 0], normalA: [0, -1, 0], normalB: [0, 0, 1] },
  { axis: [1, 0, 0], normalA: [0, -1, 0], normalB: [0, 0, -1] },
  { axis: [0, 1, 0], normalA: [1, 0, 0], normalB: [0, 0, 1] },
  { axis: [0, 1, 0], normalA: [1, 0, 0], normalB: [0, 0, -1] },
  { axis: [0, 1, 0], normalA: [-1, 0, 0], normalB: [0, 0, 1] },
  { axis: [0, 1, 0], normalA: [-1, 0, 0], normalB: [0, 0, -1] },
  { axis: [0, 0, 1], normalA: [1, 0, 0], normalB: [0, 1, 0] },
  { axis: [0, 0, 1], normalA: [1, 0, 0], normalB: [0, -1, 0] },
  { axis: [0, 0, 1], normalA: [-1, 0, 0], normalB: [0, 1, 0] },
  { axis: [0, 0, 1], normalA: [-1, 0, 0], normalB: [0, -1, 0] },
];

const CORNER_DEFS = [
  [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
  [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1],
];

interface Props {
  edgeSegments?: number;
  cornerSegments?: number;
  radiusPx?: number;
  cubeSizePx: number;
}

export default function CubeEdges({ edgeSegments = 4, cornerSegments = 2, radiusPx = 14, cubeSizePx }: Props) {
  const cubePx = cubeSizePx;

  const elements = useMemo(() => {
    if (cubePx === 0) return [];
    const S = cubePx;
    const r = radiusPx;
    const N = edgeSegments;
    const M = cornerSegments;
    const faceHalf = S - r;
    const faceSize = 2 * faceHalf;
    const els: { key: string; w: number; h: number; transform: string; type: string; bgOffset: string }[] = [];

    const halfArc = Math.PI / (2 * N);
    const stripChord = 2 * r * Math.sin(halfArc);

    EDGE_DEFS.forEach((edge, ei) => {
      const { axis, normalA, normalB } = edge;
      for (let i = 0; i < N; i++) {
        const theta = (i + 0.5) * (Math.PI / 2) / N;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        const sn = [
          cosT * normalA[0] + sinT * normalB[0],
          cosT * normalA[1] + sinT * normalB[1],
          cosT * normalA[2] + sinT * normalB[2],
        ];
        const pos = [
          faceHalf * normalA[0] + faceHalf * normalB[0] + r * sn[0],
          faceHalf * normalA[1] + faceHalf * normalB[1] + r * sn[1],
          faceHalf * normalA[2] + faceHalf * normalB[2] + r * sn[2],
        ];
        const arcT = [
          -sinT * normalA[0] + cosT * normalB[0],
          -sinT * normalA[1] + cosT * normalB[1],
          -sinT * normalA[2] + cosT * normalB[2],
        ];
        const rot = buildBasis(sn, arcT, axis);
        const bgX = (ei * 37 + i * 23) % 100;
        const bgY = (ei * 53 + i * 17) % 100;
        els.push({ key: `e${ei}-${i}`, w: stripChord, h: faceSize, transform: makeTransform(pos, rot), type: 'edge', bgOffset: `${bgX}% ${bgY}%` });
      }
    });

    const da = Math.PI / (2 * M);
    const db = Math.PI / (2 * M);

    CORNER_DEFS.forEach((signs, ci) => {
      const [sx, sy, sz] = signs;
      const cx = faceHalf * sx;
      const cy = faceHalf * sy;
      const cz = faceHalf * sz;

      for (let j = 0; j < M; j++) {
        for (let k = 0; k < M; k++) {
          const a = (j + 0.5) * da;
          const b = (k + 0.5) * db;
          const nx = Math.cos(b) * Math.cos(a);
          const ny = Math.cos(b) * Math.sin(a);
          const nz = Math.sin(b);
          const normal = normalize([sx * nx, sy * ny, sz * nz]);
          const pos = [cx + r * normal[0], cy + r * normal[1], cz + r * normal[2]];
          const ddaV = normalize([sx * Math.cos(b) * -Math.sin(a), sy * Math.cos(b) * Math.cos(a), 0]);
          const ddbV = normalize([sx * -Math.sin(b) * Math.cos(a), sy * -Math.sin(b) * Math.sin(a), sz * Math.cos(b)]);
          const pw = 2 * r * Math.cos(b) * Math.sin(da / 2);
          const ph = 2 * r * Math.sin(db / 2);
          if (pw < 0.5 || ph < 0.5) continue;
          const rot = buildBasis(normal, ddaV, ddbV);
          const bgX = (ci * 41 + j * 29 + k * 13) % 100;
          const bgY = (ci * 59 + j * 19 + k * 31) % 100;
          els.push({ key: `c${ci}-${j}-${k}`, w: pw, h: ph, transform: makeTransform(pos, rot), type: 'corner', bgOffset: `${bgX}% ${bgY}%` });
        }
      }
    });

    return els;
  }, [cubePx, radiusPx, edgeSegments, cornerSegments]);

  return (
    <>
      {elements.map((el) => (
        <div
          key={el.key}
          className='absolute pointer-events-none'
          style={{
            left: '50%',
            top: '50%',
            width: `${el.w}px`,
            height: `${el.h}px`,
            marginLeft: `${-el.w / 2}px`,
            marginTop: `${-el.h / 2}px`,
            transform: el.transform,
          }}
        >
          <div className='absolute inset-0 overflow-hidden border border-white/[0.06]'>
            <div className='absolute inset-0 bg-[rgba(160,200,240,0.06)]' />
            <div
              className='absolute inset-0 mix-blend-screen opacity-40'
              style={{ backgroundImage: 'url(/textures/ice-texture.jpg)', backgroundSize: 'cover', backgroundPosition: el.bgOffset }}
            />
          </div>
        </div>
      ))}
    </>
  );
}
