// POST /api/council/run
//
// Body: { marketId: string, stubEvidence?: boolean }
// Response: NDJSON stream — one CouncilEvent per line, plus a final
// { type: 'done' } sentinel. This is the live spine of the demo: the
// kit-mediated A2A redelegation, Venice reasoning, x402 evidence buys,
// quality gate, and on-chain bond posting all stream into the UI.
//
// The orchestrator is a black box from the API's perspective — we just
// hand it an onEvent callback that writes to the stream.

import type { NextRequest } from 'next/server'
import { runCouncil, type CouncilEvent } from '../../../../lib/council/orchestrator.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: { marketId?: string; stubEvidence?: boolean } = {}
  try { body = await req.json() } catch { /* empty body */ }

  const marketId = body.marketId
  if (!marketId) {
    return new Response(JSON.stringify({ error: 'marketId required' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  const stubEvidence = body.stubEvidence === true

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (obj: unknown) => {
        try { controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n')) }
        catch { /* client disconnected */ }
      }

      // Heartbeat so the connection stays warm during the slow x402 leg.
      const heartbeat = setInterval(() => write({ type: 'heartbeat', t: 0 }), 8000)

      try {
        await runCouncil(marketId, {
          stubEvidence,
          persist: true,
          onEvent: (e: CouncilEvent) => { write(e) },
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
