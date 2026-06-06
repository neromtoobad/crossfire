// Phase 5 — Prompt 5.2. Webhook endpoint for 1Shot status pushes.
//
// 1Shot POSTs status updates here with an Ed25519 signature header verified
// against their JWKS. For Phase 5 we accept-without-verify and document the
// production hardening in the README. Persist each payload so the dashboard
// can render the pending → success transition live.

import { NextResponse, type NextRequest } from 'next/server'
import { appendRelayerEvent } from '../../../lib/relayer-state.js'
import { publish } from '../../../lib/webhook-bus.js'

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 })
  }

  // Best-effort extraction — different 1Shot event shapes possible.
  const taskId: string | undefined =
    body?.TaskId ?? body?.taskId ?? body?.task?.id ?? body?.id
  const status: string | undefined =
    body?.status ?? body?.task?.status ?? body?.result?.status
  const txHash: string | undefined =
    body?.txHash ?? body?.transactionHash ?? body?.task?.txHash

  if (!taskId || !status) {
    return NextResponse.json(
      { ok: false, error: 'missing TaskId or status', received: Object.keys(body ?? {}) },
      { status: 400 },
    )
  }

  const receivedAt = Date.now()
  appendRelayerEvent({ receivedAt, taskId, status, txHash, rawPayload: body })
  // Live fan-out — any open NDJSON relay stream subscribed to this taskId
  // (or the global "any webhook" indicator) gets it instantly.
  publish({ receivedAt, taskId, status, txHash, raw: body })

  return NextResponse.json({ ok: true, taskId, status })
}

// Allow GET for quick "is this endpoint up" checks during demo.
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'relayer-webhook' })
}
