// POST /api/debate — run the five agents' live debate over ANY market, by its
// question. Streams NDJSON debate-* events (same shape RunCouncilLive/the War
// Room parse). Venice-only; no on-chain market required — this is the "watch
// them argue" surface for every market.

import type { NextRequest } from 'next/server'
import { runDebate } from '../../../lib/council/debate.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: { marketTitle?: string; impliedProbYes?: number } = {}
  try { body = await req.json() } catch { /* empty */ }
  const marketTitle = body.marketTitle?.trim()
  if (!marketTitle) {
    return new Response(JSON.stringify({ error: 'marketTitle required' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }
  const impliedProbYes = typeof body.impliedProbYes === 'number' ? body.impliedProbYes : 0.5

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (o: unknown) => { try { controller.enqueue(encoder.encode(JSON.stringify(o) + '\n')) } catch { /* closed */ } }
      try {
        write({ type: 'started', marketTitle, impliedProbYes })
        const { roleVotes, skepticVote } = await runDebate({
          marketTitle,
          impliedProbYes,
          evidenceFor: () => '', // pure debate — agents reason from their lane, no paid evidence
          emit: (e) => write(e),
        })
        write({ type: 'verdict', roleVotes, skepticVote })
        write({ type: 'done' })
      } catch (e) {
        write({ type: 'error', message: (e as Error).message || 'Venice was busy — try again.' })
        write({ type: 'done' })
      } finally {
        controller.close()
      }
    },
  })
  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache, no-transform' } })
}
