#!/usr/bin/env bash
# Push every mp3 under public/ to the R2 bucket, preserving the path so the
# bucket key matches the root-relative path the players already use
# (public/good-talk/audio/x.mp3 -> good-talk/audio/x.mp3).
#
# Needs wrangler and a Cloudflare login:  npx wrangler login
# Usage:  ./scripts/upload-audio.sh [bucket-name]
set -euo pipefail

BUCKET="${1:-rozsa-audio}"
cd "$(dirname "$0")/.."

count=0
while IFS= read -r f; do
  key="${f#public/}"
  printf '  %-50s %s\n' "$key" "$(du -h "$f" | cut -f1)"
  npx wrangler r2 object put "$BUCKET/$key" \
    --file "$f" \
    --content-type audio/mpeg \
    --cache-control 'public, max-age=31536000, immutable' \
    --remote
  count=$((count + 1))
done < <(find public -name '*.mp3' | sort)

if [ "$count" -eq 0 ]; then
  echo "no mp3s found under public/" >&2
  exit 1
fi
echo "uploaded $count files to r2://$BUCKET"
