import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'I. Rozsa'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#030304',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Red cube */}
        <svg width="120" height="120" viewBox="0 0 32 32" style={{ marginBottom: 32 }}>
          <polygon points="16,4 28,10 16,16 4,10" fill="#7f1d1d"/>
          <polygon points="4,10 16,16 16,28 4,22" fill="#450a0a"/>
          <polygon points="16,16 28,10 28,22 16,28" fill="#5b1414"/>
        </svg>
        <div
          style={{
            fontSize: 72,
            fontWeight: 300,
            color: 'rgba(255,255,255,0.9)',
            letterSpacing: '0.15em',
            marginBottom: 16,
          }}
        >
          I. Rozsa
        </div>
        <div
          style={{
            fontSize: 24,
            color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.2em',
          }}
        >
          bedroom producer & composer
        </div>
      </div>
    ),
    { ...size }
  )
}
