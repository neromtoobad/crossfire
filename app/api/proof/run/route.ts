// POST /api/proof/run
//
// Streams the ERC-7710 over-cap revert proof as NDJSON. One in-cap redeem,
// then one over-cap attempt that must revert at the enforcer.

import type { NextRequest } from 'next/server'
import { runProofFlow, type ProofEvent } from '../../../../lib/proof-flow.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(_req: NextRequest) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (obj: unknown) => {
        try { controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n')) }
        catch { /* client disconnected */ }
      }
      const heartbeat = setInterval(() => write({ type: 'heartbeat' }), 8000)
      try {
        await runProofFlow({ onEvent: (e: ProofEvent) => { write(e) } })
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
