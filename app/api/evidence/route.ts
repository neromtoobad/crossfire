// Phase 3, Prompt 3.1. The x402-gated evidence seller.
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
// ── Phase 8.3, role-keyed evidence ──────────────────────────────────────
// Each council role gets evidence tailored to its domain (MacroScout reads
// structural/regulatory, NewsHawk reads news flow, etc.). The /api/evidence
// route picks from this map when ?role=MacroScout|NewsHawk|CrowdPulse|BookWatcher
// is supplied. Phase 3-era scripts fall back to EVIDENCE_BY_MARKET below.
const EVIDENCE_BY_MARKET_ROLE: Record<string, Record<string, EvidenceItem[]>> = {
  'btc-200k-2026': {
    MacroScout: [{
      marketId: 'btc-200k-2026', signal: 'YES',
      sourceUrl: 'https://www.blackrock.com/us/individual/products/333011/ishares-bitcoin-trust',
      weight: 0.85,
    }],
    NewsHawk: [{
      marketId: 'btc-200k-2026', signal: 'YES',
      sourceUrl: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=13F',
      weight: 0.78,
    }],
    CrowdPulse: [{
      marketId: 'btc-200k-2026', signal: 'YES',
      sourceUrl: 'https://glassnode.com/onchain/bitcoin-net-position-change',
      weight: 0.72,
    }],
    BookWatcher: [{
      marketId: 'btc-200k-2026', signal: 'YES',
      sourceUrl: 'https://www.cmegroup.com/markets/cryptocurrencies/bitcoin/bitcoin.html',
      weight: 0.68,
    }],
  },
  'fed-rate-cut': {
    MacroScout: [{
      marketId: 'fed-rate-cut', signal: 'NO',
      sourceUrl: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',
      weight: 0.74,
    }],
    NewsHawk: [{
      marketId: 'fed-rate-cut', signal: 'NO',
      sourceUrl: 'https://www.bls.gov/cpi/',
      weight: 0.79,
    }],
    CrowdPulse: [{
      marketId: 'fed-rate-cut', signal: 'YES',
      sourceUrl: 'https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html',
      weight: 0.62,
    }],
    BookWatcher: [{
      marketId: 'fed-rate-cut', signal: 'NO',
      sourceUrl: 'https://fred.stlouisfed.org/series/DGS10',
      weight: 0.66,
    }],
  },
  'trump-sbf-pardon': {
    MacroScout: [{
      marketId: 'trump-sbf-pardon', signal: 'NO',
      sourceUrl: 'https://www.justice.gov/pardon/pardon-statistics',
      weight: 0.81,
    }],
    NewsHawk: [{
      marketId: 'trump-sbf-pardon', signal: 'NO',
      sourceUrl: 'https://www.justice.gov/usao-sdny/pr/samuel-bankman-fried',
      weight: 0.83,
    }],
    CrowdPulse: [{
      marketId: 'trump-sbf-pardon', signal: 'NO',
      sourceUrl: 'https://en.wikipedia.org/wiki/Sam_Bankman-Fried',
      weight: 0.74,
    }],
    BookWatcher: [{
      marketId: 'trump-sbf-pardon', signal: 'NO',
      sourceUrl: 'https://polymarket.com/event/trump-pardon-sbf',
      weight: 0.86,
    }],
  },
  'openai-gpt6-2026': {
    MacroScout: [{
      marketId: 'openai-gpt6-2026', signal: 'YES',
      sourceUrl: 'https://openai.com/research',
      weight: 0.71,
    }],
    NewsHawk: [{
      marketId: 'openai-gpt6-2026', signal: 'YES',
      sourceUrl: 'https://www.microsoft.com/en-us/Investor/earnings/FY-2025-Q1/earnings-release.aspx',
      weight: 0.77,
    }],
    CrowdPulse: [{
      marketId: 'openai-gpt6-2026', signal: 'NEUTRAL',
      sourceUrl: 'https://news.ycombinator.com/news',
      weight: 0.55,
    }],
    BookWatcher: [{
      marketId: 'openai-gpt6-2026', signal: 'YES',
      sourceUrl: 'https://polymarket.com/event/openai-gpt-6-2026',
      weight: 0.70,
    }],
  },
}

// Phase-3 backward-compat: per-market catalogue for older scripts.
// Council uses the role-keyed map above when ?role= is supplied.
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

function pickRoleEvidence(marketId: string, role: string): EvidenceItem | null {
  const m = EVIDENCE_BY_MARKET_ROLE[marketId]
  if (!m) return null
  const pool = m[role]
  if (!pool || pool.length === 0) return null
  return pool[Math.floor(Math.random() * pool.length)]!
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url)
  const marketId = url.searchParams.get('marketId') ?? 'phase3-demo-market'
  const sideHint = (url.searchParams.get('side') as 'YES' | 'NO' | null) ?? undefined
  const role = url.searchParams.get('role')  // Phase 8.3, role-keyed evidence

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

  // Phase 8.3: if a role was specified, return role-keyed evidence;
  // otherwise fall through to the legacy side-hint picker.
  const evidence = (role && pickRoleEvidence(marketId, role)) ?? pickEvidence(marketId, sideHint)

  return NextResponse.json({
    evidence,
    settlement: {
      txHash: settlement.txHash,
      usdcSettled: settlement.usdcSettled.toString(),
      facilitator: payload.accepted.extra.facilitators[0],
    },
  })
}
