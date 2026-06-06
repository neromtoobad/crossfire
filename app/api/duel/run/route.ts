// POST /api/duel/run — streams duel progress as newline-delimited JSON
// (NDJSON). The client reads with fetch + ReadableStream so we don't need
// EventSource (which requires GET).
//
// Body: { user, marketId }
// Stream emits: DuelEvent objects, one per line.

import { type NextRequest } from 'next/server'
import { getMarketMeta } from '../../../../lib/markets-data.js'
import { getActiveMandate } from '../../../../lib/mandate-store.js'
import { runUserDuel, type DuelEvent } from '../../../../lib/duel-engine.js'
import { appendDuel } from '../../../../lib/relayer-state.js'

export async function POST(req: NextRequest): Promise<Response> {
  let body: any
  try { body = await req.json() }
  catch { return new Response(JSON.stringify({ error: 'invalid JSON' }), { status: 400 }) }

  const { user, marketId } = body
  if (!user || !marketId) {
    return new Response(JSON.stringify({ error: 'user + marketId required' }), { status: 400 })
  }

  const marketMeta = getMarketMeta(marketId)
  if (!marketMeta) {
    return new Response(JSON.stringify({ error: `unknown market: ${marketId}` }), { status: 400 })
  }

  const mandate = getActiveMandate(user, marketId)
  if (!mandate) {
    return new Response(JSON.stringify({ error: 'no active mandate for this user+market' }), { status: 400 })
  }

  // Compose the signed delegation back from storage. The stored form already
  // includes the signature; the engine treats it as the "signed root".
  const signedRoot = mandate.signedDelegation

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const emit = async (event: DuelEvent) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
        } catch {/* stream closed */}
      }

      try {
        const outcome = await runUserDuel({
          signedRoot,
          user: user as `0x${string}`,
          marketId,
          marketAddress: marketMeta.address,
          marketTitle: marketMeta.title,
          capUsdc: mandate.capUsdc,
          onEvent: emit,
        })

        // Persist to .crossfire/state.json so the dashboard can show recent duels.
        appendDuel({
          runAt: Date.now(),
          bullStake: outcome.bullStake,
          bearStake: outcome.bearStake,
          netUsdc: outcome.netUsdc,
          side: outcome.decision,
          abstained: outcome.decision === 'ABSTAIN',
          betTransferTx: outcome.betTransferTx,
          buyOnBehalfTx: outcome.buyOnBehalfTx,
          bullRationale: outcome.bullRationale,
          bearRationale: outcome.bearRationale,
          evidenceTxHashes: { bull: [], bear: [] },
          marketAfter: {
            totalYes: '0', totalNo: '0', impliedProb: 0,
            userSaPosition: { yes: '0', no: '0' },
          },
        })
      } catch (e) {
        await emit({ type: 'error', message: (e as Error).message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
