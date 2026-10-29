// The mp3s live in an external bucket (Cloudflare R2) rather than `public/`, so
// streaming them doesn't burn the Vercel data-transfer allowance. Track data
// keeps storing root-relative paths; each player resolves them through
// `audioUrl` at the point it builds an <audio> element.
//
// Unset NEXT_PUBLIC_AUDIO_BASE_URL and everything falls back to the local files
// under `public/`, which is what local dev does.
const BASE = (process.env.NEXT_PUBLIC_AUDIO_BASE_URL ?? '').replace(/\/+$/, '');

export function audioUrl(path: string): string {
  return BASE ? `${BASE}${path}` : path;
}

// True once audio is served cross-origin. The Web Audio analyser in the
// Good Talk player needs `crossOrigin` set in that case, or
// createMediaElementSource() taints the stream and reads back as silence.
export const audioIsRemote = BASE.length > 0;
