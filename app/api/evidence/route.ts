// Phase 3 — Prompt 3.1. The x402-gated evidence seller.
//
// Without a valid PAYMENT-SIGNATURE → returns 402 with PAYMENT-REQUIRED header.
// With one → settles the payment on-chain (real USDC moves) and returns one
// evidence item. Settlement makes this "real costly signal", not simulated.

import { NextResponse, type NextRequest } from 'next/server'
import {
  decodePaymentSignatureHeader,
  encodePaymentRequiredHeader,
  paymentRequired,
  settlePayment,
} from '../../../lib/x402-facilitator.js'
import type { EvidenceItem } from '../../../lib/x402-types.js'

// Static evidence catalogue keyed by market id. For Phase 3 we don't care
// about realism; we care that the buyer actually paid for it. Phase 4+ can
// swap this for live URLs scraped by Venice.
// Deliberately asymmetric weights for the Phase 4 demo: YES side has strong
// evidence (0.9), NO side has weak evidence (0.3). With symmetric inputs the
// adversarial agents tend to compute identical edges and abstain — true to
// the market but boring on stage. Real CROSSFIRE would have agents picking
// their own evidence per side; this static catalogue is a stand-in.
const EVIDENCE_BY_MARKET: Record<string, EvidenceItem[]> = {
  'phase3-demo-market': [
    {
      marketId: 'phase3-demo-market',
      signal: 'YES',
      sourceUrl: 'https://en.wikipedia.org/wiki/Prediction_market',
      weight: 0.9,
    },
    {
      marketId: 'phase3-demo-market',
      signal: 'NO',
      sourceUrl: 'https://en.wikipedia.org/wiki/Adversarial_collaboration',
      weight: 0.3,
    },
    {
      marketId: 'phase3-demo-market',
      signal: 'NEUTRAL',
      sourceUrl: 'https://en.wikipedia.org/wiki/Bayesian_inference',
      weight: 0.5,
    },
  ],
  'phase4-demo-market': [
    {
      marketId: 'phase4-demo-market',
      signal: 'YES',
      sourceUrl: 'https://en.wikipedia.org/wiki/Prediction_market',
      weight: 0.9,
    },
    {
      marketId: 'phase4-demo-market',
      signal: 'NO',
      sourceUrl: 'https://en.wikipedia.org/wiki/Adversarial_collaboration',
      weight: 0.3,
    },
  ],
}

function pickEvidence(marketId: string, sideHint?: 'YES' | 'NO'): EvidenceItem {
  const pool = EVIDENCE_BY_MARKET[marketId] ?? EVIDENCE_BY_MARKET['phase3-demo-market']!
  if (sideHint) {
    const match = pool.find((e) => e.signal === sideHint)
    if (match) return match
  }
  return pool[Math.floor(Math.random() * pool.length)]!
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url)
  const marketId = url.searchParams.get('marketId') ?? 'phase3-demo-market'
  const sideHint = (url.searchParams.get('side') as 'YES' | 'NO' | null) ?? undefined

  const sig = req.headers.get('PAYMENT-SIGNATURE') ?? req.headers.get('payment-signature')

  // (1) No PAYMENT-SIGNATURE → return 402 with the requirements header.
  if (!sig) {
    const required = paymentRequired()
    return new NextResponse(JSON.stringify({ error: 'payment required' }), {
      status: 402,
      headers: {
        'PAYMENT-REQUIRED': encodePaymentRequiredHeader(required),
        'Content-Type': 'application/json',
      },
    })
  }

  // (2) PAYMENT-SIGNATURE present → decode, validate shape, settle on-chain.
  let payload
  try {
    payload = decodePaymentSignatureHeader(sig)
  } catch (e) {
    return NextResponse.json(
      { error: 'invalid PAYMENT-SIGNATURE', detail: (e as Error).message },
      { status: 400 },
    )
  }

  let settlement
  try {
    settlement = await settlePayment(payload)
  } catch (e) {
    return NextResponse.json(
      { error: 'settlement failed', detail: (e as Error).message },
      { status: 402 },
    )
  }

  const evidence = pickEvidence(marketId, sideHint)
  return NextResponse.json({
    evidence,
    settlement: {
      txHash: settlement.txHash,
      usdcSettled: settlement.usdcSettled.toString(),
      facilitator: payload.accepted.extra.facilitators[0],
    },
  })
}
