#!/usr/bin/env tsx
// Phase 7.7 — start a cloudflared quick tunnel pointing at localhost:3000,
// capture the *.trycloudflare.com URL from stderr, and write it to
// .crossfire/webhook-url so the relay route can pick it up.
//
// Usage:
//   npm run tunnel
//
// Leaves cloudflared running in the foreground (CTRL-C to stop). The file
// stays after the tunnel exits — `npm run tunnel:clear` removes it.

import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, existsSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'

const STATE_DIR = resolve(process.cwd(), '.crossfire')
const URL_FILE = resolve(STATE_DIR, 'webhook-url')
const PORT = Number(process.env.PORT ?? 3000)

const TUNNEL_URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i

function ensureClean() {
  if (process.argv.includes('--clear')) {
    if (existsSync(URL_FILE)) {
      unlinkSync(URL_FILE)
      console.log(`✓ removed ${URL_FILE}`)
    } else {
      console.log(`(nothing to clear at ${URL_FILE})`)
    }
    process.exit(0)
  }
}

function main() {
  ensureClean()
  mkdirSync(STATE_DIR, { recursive: true })

  console.log(`▸ starting cloudflared tunnel → http://localhost:${PORT}`)
  console.log(`  output will be written to: ${URL_FILE}`)
  console.log(`  CTRL-C to stop\n`)

  const proc = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${PORT}`, '--no-autoupdate'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let captured = false
  const captureUrl = (chunk: Buffer | string) => {
    const text = String(chunk)
    process.stderr.write(text)
    if (captured) return
    const m = text.match(TUNNEL_URL_RE)
    if (m) {
      const url = m[0]
      writeFileSync(URL_FILE, url + '\n')
      console.log(`\n✓ tunnel URL captured: ${url}`)
      console.log(`  saved to: ${URL_FILE}`)
      console.log(`  Webhook target for 1Shot: ${url}/api/relayer-webhook\n`)
      captured = true
    }
  }
  proc.stdout?.on('data', captureUrl)
  proc.stderr?.on('data', captureUrl)

  const shutdown = () => {
    if (existsSync(URL_FILE)) {
      try { unlinkSync(URL_FILE) } catch { /* ignore */ }
    }
    if (!proc.killed) proc.kill('SIGTERM')
  }
  process.on('SIGINT', () => { console.log('\n▸ stopping tunnel…'); shutdown(); process.exit(0) })
  process.on('SIGTERM', () => { shutdown(); process.exit(0) })

  proc.on('exit', (code) => {
    shutdown()
    process.exit(code ?? 0)
  })
}

main()
