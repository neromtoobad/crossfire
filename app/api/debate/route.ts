// POST /api/debate — run the five agents' live debate over ANY market, by its
// question. Streams NDJSON debate-* events (same shape RunCouncilLive/the War
// Room parse). Venice-only; no on-chain market required — this is the "watch
// them argue" surface for every market.

import type { NextRequest } from 'next/server'
import { runDebate, runWinnerDebate } from '../../../lib/council/debate.js'
import { getCachedWinnerPicks } from '../../../lib/winner-picks.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: { marketTitle?: string; impliedProbYes?: number; winner?: boolean } = {}
  try { body = await req.json() } catch { /* empty */ }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (o: unknown) => { try { controller.enqueue(encoder.encode(JSON.stringify(o) + '\n')) } catch { /* closed */ } }
      try {
        if (body.winner) {
          // multi-candidate debate: each agent defends the nation it picked
          const data = getCachedWinnerPicks()
          if (!data?.picks?.length) throw new Error('No winner picks yet — run the agents first.')
          write({ type: 'started', marketTitle: 'Who lifts the 2026 World Cup?', impliedProbYes: 0.5 })
          await runWinnerDebate({ picks: data.picks, emit: (e) => write(e) })
          write({ type: 'done' })
          return
        }
        const marketTitle = body.marketTitle?.trim()
        if (!marketTitle) { write({ type: 'error', message: 'marketTitle required' }); write({ type: 'done' }); return }
        const impliedProbYes = typeof body.impliedProbYes === 'number' ? body.impliedProbYes : 0.5
        write({ type: 'started', marketTitle, impliedProbYes })
        const { roleVotes, skepticVote } = await runDebate({
          marketTitle, impliedProbYes,
          evidenceFor: () => '',
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
