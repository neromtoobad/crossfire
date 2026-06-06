// POST /api/relay/run
//
// Body: { webhookUrl?: string, memo?: string }
// Response: NDJSON — one RelayEvent per line, final { type: 'done' } sentinel.
//
// Triggers ONE real 1Shot relay on Base mainnet. Costs real USDC. Gated by
// CROSSFIRE_ENABLE_MAINNET_RELAY=true so we don't burn money on accident.

import type { NextRequest } from 'next/server'
import { runMainnetRelay, type RelayEvent } from '../../../../lib/relay-flow.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (process.env.CROSSFIRE_ENABLE_MAINNET_RELAY !== 'true') {
    return new Response(JSON.stringify({
      error: 'mainnet relay disabled — set CROSSFIRE_ENABLE_MAINNET_RELAY=true to enable',
    }), {
      status: 403, headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: { webhookUrl?: string; memo?: string } = {}
  try { body = await req.json() } catch { /* empty body fine */ }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (obj: unknown) => {
        try { controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n')) }
        catch { /* client disconnected */ }
      }

      // Heartbeat every 10s — getStatus polling is slow.
      const heartbeat = setInterval(() => write({ type: 'heartbeat' }), 10000)

      try {
        await runMainnetRelay({
          webhookUrl: body.webhookUrl,
          memo: body.memo,
          onEvent: (e: RelayEvent) => { write(e) },
        })
        write({ type: 'done' })
      } catch (e) {
        write({ type: 'error', message: (e as Error).message })
        write({ type: 'done' })
      } finally {
        clearInterval(heartbeat)
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}

// GET — small health endpoint that tells the UI whether the button is enabled.
export async function GET() {
  return new Response(JSON.stringify({
    enabled: process.env.CROSSFIRE_ENABLE_MAINNET_RELAY === 'true',
  }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
