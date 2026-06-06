// x402-gated thesis endpoint.
//
// Without PAYMENT-SIGNATURE → 402 + PAYMENT-REQUIRED header (price = call.unlockUsdc).
// With valid signature → facilitator settles, server records the unlock,
// returns the locked thesis JSON.
//
// GET ?user=0x... → returns the locked content if the user already unlocked,
// otherwise 402 (same as POST without payment).

import { NextResponse, type NextRequest } from 'next/server'
import { parseUnits } from 'viem'
import { getCallById } from '../../../../lib/calls-data.js'
import {
  decodePaymentSignatureHeader,
  encodePaymentRequiredHeader,
  paymentRequired,
  settlePayment,
} from '../../../../lib/x402-facilitator.js'
import { addUnlock, getUnlock, hasUnlocked } from '../../../../lib/unlock-store.js'

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

  const sig = req.headers.get('PAYMENT-SIGNATURE') ?? req.headers.get('payment-signature')

  if (!sig) {
    return new NextResponse(JSON.stringify({ error: 'payment required' }), {
      status: 402,
      headers: {
        'PAYMENT-REQUIRED': encodePaymentRequiredHeader(buildRequirement(call)),
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
