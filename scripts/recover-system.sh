#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[recover] root: ${ROOT_DIR}"

echo "[recover] installing frontend dependencies"
cd "${ROOT_DIR}"
npm ci

echo "[recover] verifying frontend build"
npm run lint
npm run typecheck
npm run build

echo "[recover] installing worker dependencies"
cd "${ROOT_DIR}/worker"
npm install

echo "[recover] validating worker configuration"
if ! command -v npx >/dev/null 2>&1; then
  echo "[recover] npx command is required but missing" >&2
  exit 1
fi

echo "[recover] reminder: set required secrets before deploy"
echo "  npx wrangler secret put ELEVENLABS_API_KEY"
echo "  npx wrangler secret put GEMINI_API_KEY   # optional"
echo "  npx wrangler secret put ALLOWED_ORIGINS  # optional comma-separated allowlist"

echo "[recover] done"
