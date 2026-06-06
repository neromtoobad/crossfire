// POST /api/relay/run
//
// Body: { webhookUrl?: string, memo?: string }
// Response: NDJSON — one RelayEvent per line, final { type: 'done' } sentinel.
//
// Triggers ONE real 1Shot relay on Base mainnet. Costs real USDC. Gated by
// CROSSFIRE_ENABLE_MAINNET_RELAY=true so we don't burn money on accident.
//
// If a webhook URL is configured (via CROSSFIRE_WEBHOOK_URL env or the
// .crossfire/webhook-url file written by `npm run tunnel`), we pass it to
// 1Shot and subscribe to the in-memory webhook bus by taskId so arrivals
// stream into the relay log alongside the poller's status ticks.

import type { NextRequest } from 'next/server'
import { runMainnetRelay, type RelayEvent } from '../../../../lib/relay-flow.js'
import { getConfiguredWebhookUrl } from '../../../../lib/webhook-config.js'
import { subscribe, type WebhookHit } from '../../../../lib/webhook-bus.js'

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

  // Webhook URL precedence: explicit body > env > tunnel file > none.
  const configured = getConfiguredWebhookUrl()
  const webhookUrl = body.webhookUrl ?? configured?.url
  const webhookSource = body.webhookUrl ? 'body' : configured?.source ?? null

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (obj: unknown) => {
        try { controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n')) }
        catch { /* client disconnected */ }
      }

      const heartbeat = setInterval(() => write({ type: 'heartbeat' }), 10000)

      // Announce webhook config up front so the UI knows whether to expect
      // arrivals or fall back to polling.
      write({
        type: 'webhook-config',
        url: webhookUrl ?? null,
        source: webhookSource,
      })

      // Subscribe to the bus as soon as we know our TaskId. We resolve the
      // subscription lazily inside onEvent so the unsubscribe survives a
      // crash mid-run.
      let unsubscribe: (() => void) | null = null
      const onWebhook = (hit: WebhookHit) => {
        write({
          type: 'webhook-received',
          taskId: hit.taskId,
          status: hit.status,
          txHash: hit.txHash,
          receivedAt: hit.receivedAt,
        })
      }

      try {
        await runMainnetRelay({
          webhookUrl,
          memo: body.memo,
          onEvent: (e: RelayEvent) => {
            write(e)
            if (e.type === 'submitted' && webhookUrl && !unsubscribe) {
              unsubscribe = subscribe(e.taskId, onWebhook)
            }
          },
        })
        write({ type: 'done' })
      } catch (e) {
        write({ type: 'error', message: (e as Error).message })
        write({ type: 'done' })
      } finally {
        clearInterval(heartbeat)
        if (unsubscribe) unsubscribe()
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

// GET — small health endpoint that tells the UI whether the button is enabled
// AND whether a webhook URL is configured.
export async function GET() {
  const enabled = process.env.CROSSFIRE_ENABLE_MAINNET_RELAY === 'true'
  const configured = getConfiguredWebhookUrl()
  return new Response(JSON.stringify({
    enabled,
    webhook: configured
      ? { url: configured.url, source: configured.source }
      : null,
  }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
