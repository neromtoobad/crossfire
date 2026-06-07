// POST /api/scout/run
//
// Body: { question: string, yesPrice: number, slug?: string }
// Response: NDJSON — scout-started, the debate-* stream, then scout-verdict,
// plus a final { type: 'done' }.
//
// Runs the live council debate on an arbitrary Polymarket watch market and
// returns the council's verdict + edge vs the live Polymarket price. No
// on-chain bond (no BinaryMarket exists for these).

import type { NextRequest } from 'next/server'
import { runScout, type ScoutEvent } from '../../../../lib/council/scout.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: { question?: string; yesPrice?: number; slug?: string } = {}
  try { body = await req.json() } catch { /* empty */ }

  const question = (body.question ?? '').trim()
  const yesPrice = Number(body.yesPrice)
  if (!question || !Number.isFinite(yesPrice)) {
    return new Response(JSON.stringify({ error: 'question + yesPrice required' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }
  // Clamp to a sane probability.
  const impliedProbYes = Math.min(0.999, Math.max(0.001, yesPrice))

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (obj: unknown) => {
        try { controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n')) }
        catch { /* client gone */ }
      }
      const heartbeat = setInterval(() => write({ type: 'heartbeat' }), 8000)
      try {
        await runScout({
          question,
          impliedProbYes,
          slug: body.slug,
          emit: (e: ScoutEvent) => { write(e) },
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
