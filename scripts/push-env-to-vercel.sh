#!/usr/bin/env bash
# One command to make the LIVE Vercel site fully work: pushes every variable
# from .env.local to Vercel (production + preview + development), then redeploys
# to production. Run it yourself — your keys go straight from your file to your
# own Vercel project; they never pass through anyone else.
#
#   bash scripts/push-env-to-vercel.sh
#
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

if [ ! -f .env.local ]; then echo "✗ .env.local not found"; exit 1; fi
if ! command -v vercel >/dev/null 2>&1; then echo "✗ vercel CLI not found"; exit 1; fi

echo "→ Pushing env vars from .env.local to Vercel…"
n=0
while IFS= read -r line || [ -n "$line" ]; do
  line="${line%$'\r'}"                       # strip CR (CRLF files)
  case "$line" in ''|\#*) continue;; esac     # skip blanks + comments
  key="${line%%=*}"
  val="${line#*=}"
  [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
  # strip one layer of surrounding quotes if present
  val="${val%\"}"; val="${val#\"}"; val="${val%\'}"; val="${val#\'}"
  for target in production preview development; do
    vercel env rm "$key" "$target" -y           >/dev/null 2>&1   # remove if it exists
    printf '%s' "$val" | vercel env add "$key" "$target" >/dev/null 2>&1
  done
  n=$((n+1)); echo "  ✓ $key"
done < .env.local
echo "→ Set $n variables."

echo "→ Redeploying to production (builds on Vercel)…"
vercel --prod --yes

echo "✓ Done. Your live site now has the full environment."
