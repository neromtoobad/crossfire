// x402-gated thesis endpoint.
//
// Without PAYMENT-SIGNATURE → 402 + PAYMENT-REQUIRED header (price = call.unlockUsdc).
// With valid signature → facilitator settles, server records the unlock,
// returns the locked thesis JSON.
//
// GET ?user=0x... → returns the locked content if the user already unlocked,
// otherwise 402 (same as POST without payment).

import { NextResponse, type NextRequest } from 'next/server'
import { parseUnits, type Hex } from 'viem'
import { getCallById } from '../../../../lib/calls-data.js'
import {
  decodePaymentSignatureHeader,
  encodePaymentRequiredHeader,
  paymentRequired,
  settlePayment,
  verifyDirectTransfer,
  SELLER_PAY_TO,
} from '../../../../lib/x402-facilitator.js'
import { addUnlock, getUnlock, hasUnlocked, isTxUsed } from '../../../../lib/unlock-store.js'
import { USDC_SEPOLIA } from '../../../../lib/config.js'

function buildRequirement(call: ReturnType<typeof getCallById>) {
  const base = paymentRequired()
  // override amount to the call's unlock price (defaults to 0.1 USDC)
  const unlockPriceUsdc = call?.unlockUsdc ?? 0.10
  return {
    ...base,
    amount: parseUnits(String(unlockPriceUsdc), 6).toString(),
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ callId: string }> },
) {
  const { callId } = await params
  const url = new URL(req.url)
  const user = url.searchParams.get('user')

  const call = getCallById(callId)
  if (!call) return NextResponse.json({ error: 'unknown call' }, { status: 404 })

  if (user && hasUnlocked(user, callId)) {
    const unlock = getUnlock(user, callId)
    return NextResponse.json({
      unlocked: true,
      locked: call.locked,
      unlock: unlock ?? null,
    })
  }

  // not unlocked → return 402
  return new NextResponse(JSON.stringify({ unlocked: false }), {
    status: 402,
    headers: {
      'PAYMENT-REQUIRED': encodePaymentRequiredHeader(buildRequirement(call)),
      'Content-Type': 'application/json',
    },
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ callId: string }> },
) {
  const { callId } = await params
  const call = getCallById(callId)
  if (!call) return NextResponse.json({ error: 'unknown call' }, { status: 404 })

  const requirement = buildRequirement(call)

  // ── PATH A: direct USDC transfer (x402 "exact" scheme) ───────────────────
  // Robust path: the buyer's wallet sent a plain USDC.transfer(payTo, amount).
  // Headers carry the tx hash + the connected address. We verify on-chain.
  const txHash = (req.headers.get('PAYMENT-TXHASH') ?? req.headers.get('payment-txhash')) as Hex | null
  const fromHeader = (req.headers.get('PAYMENT-FROM') ?? req.headers.get('payment-from')) as Hex | null
  if (txHash) {
    if (!fromHeader) {
      return NextResponse.json({ error: 'missing PAYMENT-FROM header' }, { status: 400 })
    }
    // Idempotent: already unlocked by this wallet?
    if (hasUnlocked(fromHeader, callId)) {
      return NextResponse.json({
        unlocked: true, locked: call.locked,
        unlock: getUnlock(fromHeader, callId) ?? null, alreadyUnlocked: true,
      })
    }
    // Replay guard: a given transfer tx can unlock exactly one call.
    if (isTxUsed(txHash)) {
      return NextResponse.json({ error: 'this transfer was already used for an unlock' }, { status: 409 })
    }
    const verdict = await verifyDirectTransfer({
      txHash,
      expectedFrom: fromHeader,
      payTo: SELLER_PAY_TO,
      asset: USDC_SEPOLIA,
      minAmount: BigInt(requirement.amount),
    })
    if (!verdict.ok) {
      return NextResponse.json({ error: 'transfer verification failed', detail: verdict.reason }, { status: 402 })
    }
    addUnlock({
      user: fromHeader, callId,
      amountUsdc: Number(requirement.amount) / 1e6,
      settlementTxHash: txHash,
      unlockedAt: Date.now(),
    })
    return NextResponse.json({
      unlocked: true, locked: call.locked,
      unlock: {
        user: fromHeader, callId,
        amountUsdc: Number(requirement.amount) / 1e6,
        settlementTxHash: txHash, unlockedAt: Date.now(),
      },
    })
  }

  // ── PATH B: ERC-7710 delegation (PAYMENT-SIGNATURE) ──────────────────────
  const sig = req.headers.get('PAYMENT-SIGNATURE') ?? req.headers.get('payment-signature')

  if (!sig) {
    return new NextResponse(JSON.stringify({ error: 'payment required' }), {
      status: 402,
      headers: {
        'PAYMENT-REQUIRED': encodePaymentRequiredHeader(requirement),
        'Content-Type': 'application/json',
      },
    })
  }

  let payload
  try {
    payload = decodePaymentSignatureHeader(sig)
  } catch (e) {
    return NextResponse.json(
      { error: 'invalid PAYMENT-SIGNATURE', detail: (e as Error).message },
      { status: 400 },
    )
  }

  const user = payload.payload.delegator
  if (!user) return NextResponse.json({ error: 'no delegator in payload' }, { status: 400 })

  // If they've already unlocked, just return the content (idempotent).
  if (hasUnlocked(user, callId)) {
    return NextResponse.json({
      unlocked: true,
      locked: call.locked,
      unlock: getUnlock(user, callId) ?? null,
      alreadyUnlocked: true,
    })
  }

  // Settle the payment on-chain.
  let settlement
  try {
    settlement = await settlePayment(payload)
  } catch (e) {
    return NextResponse.json(
      { error: 'settlement failed', detail: (e as Error).message },
      { status: 402 },
    )
  }

  addUnlock({
    user,
    callId,
    amountUsdc: Number(payload.accepted.amount) / 1e6,
    settlementTxHash: settlement.txHash,
    unlockedAt: Date.now(),
  })

  return NextResponse.json({
    unlocked: true,
    locked: call.locked,
    unlock: {
      user,
      callId,
      amountUsdc: Number(payload.accepted.amount) / 1e6,
      settlementTxHash: settlement.txHash,
      unlockedAt: Date.now(),
    },
  })
}
