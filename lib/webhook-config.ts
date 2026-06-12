// Phase 7.7 — webhook URL discovery.
//
// Source priority:
//   1. CROSSFIRE_WEBHOOK_URL env var (highest — manually configured)
//   2. .crossfire/webhook-url file (written by `npm run tunnel`)
//   3. null (polling-only, no webhook)
//
// The discovered URL is suffixed with /api/relayer-webhook before being
// passed to 1Shot.

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { STATE_BASE } from './state-dir.js'

const FILE = resolve(STATE_BASE, 'webhook-url')

function normalize(base: string): string {
  const trimmed = base.replace(/\/+$/, '')
  return `${trimmed}/api/relayer-webhook`
}

export function getConfiguredWebhookUrl(): { url: string; source: string } | null {
  const env = process.env.CROSSFIRE_WEBHOOK_URL
  if (env && env.trim()) {
    return { url: normalize(env.trim()), source: 'env' }
  }
  if (existsSync(FILE)) {
    try {
      const raw = readFileSync(FILE, 'utf8').trim()
      if (raw) return { url: normalize(raw), source: 'tunnel' }
    } catch { /* fall through */ }
  }
  return null
}
