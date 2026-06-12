// Venice, wallet-native. Two orthogonal upgrades live here:
//
//   · TEE model (#2): forecaster reasoning runs on a Venice E2EE / Trusted-
//     Execution model (e2ee-*, supportsTeeAttestation). TE, not even Venice
//     sees this prompt. Works on either payment path.
//   · x402 payment (#4): inference is paid from a delegated wallet's USDC on
//     Base via venice-x402-client. The mandate cap then covers BOTH evidence
//     buys AND the AI inference cost, the thing Venice-livestream judges look
//     for. Falls back to the API-key client until the wallet is funded.
//
// Pay path is chosen at call time from the wallet's spendable balance, so the
// app keeps working before the ~$5 top-up and upgrades itself once funded.

import { venice } from './venice.js'
import { env } from './env.js'

// A fast Trusted-Execution model, private, attestable, low-latency for the
// live debate. Override per call when a heavier model is worth the wait.
export const TEE_MODEL = 'e2ee-glm-4-7-flash-p'

export type PayVia = 'x402-wallet' | 'api-key'
export type ForecasterReply = {
  content: string
  model: string
  payVia: PayVia
  tee: boolean
  walletAddress?: string
}

// ── lazy x402 wallet client ───────────────────────────────────────────────
let _client: any | null = null
let _clientTried = false
async function x402Client(): Promise<any | null> {
  if (_clientTried) return _client
  _clientTried = true
  try {
    const pk = env.USER_PRIVATE_KEY
    if (!pk) return null
    const { VeniceClient } = await import('venice-x402-client')
    _client = new VeniceClient(pk.startsWith('0x') ? pk : `0x${pk}`)
  } catch {
    _client = null
  }
  return _client
}

/** Wallet x402 status, surfaced in the UI so the demo can show it's live. */
export async function veniceWalletStatus(): Promise<{
  configured: boolean
  walletAddress?: string
  balanceUsd?: number
  canPay: boolean
  minimumTopUpUsd?: number
}> {
  const c = await x402Client()
  if (!c) return { configured: false, canPay: false }
  try {
    const b = await c.getBalance()
    return {
      configured: true,
      walletAddress: b.walletAddress,
      balanceUsd: b.balanceUsd,
      canPay: !!b.canConsume,
      minimumTopUpUsd: b.minimumTopUpUsd,
    }
  } catch {
    return { configured: true, canPay: false }
  }
}

/**
 * One forecaster reasoning turn on a TEE model. Pays via the x402 wallet when
 * it has spendable balance; otherwise the API-key client (same TEE model).
 * `disable_thinking` returns the final answer directly in `content` (the E2EE
 * tier uses reasoning models that otherwise spend the whole budget thinking).
 */
export async function forecasterChat({
  messages,
  model = TEE_MODEL,
  temperature = 0.5,
  maxTokens = 320,
}: {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
  model?: string
  temperature?: number
  maxTokens?: number
}): Promise<ForecasterReply> {
  const tee = model.startsWith('e2ee-')
  const c = await x402Client()

  // ── x402 wallet path (preferred when funded) ──
  if (c) {
    try {
      const bal = await c.getBalance()
      if (bal?.canConsume) {
        const res = await c.chat({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          venice_parameters: { disable_thinking: true },
        })
        const m = res?.choices?.[0]?.message ?? {}
        const content = (m.content || m.reasoning_content || '').trim()
        return { content, model, payVia: 'x402-wallet', tee, walletAddress: bal.walletAddress }
      }
    } catch {
      // fall through to the API-key path
    }
  }

  // ── API-key fallback (always works; same TEE model) ──
  const res = await venice.chat.completions.create({
    model,
    messages: messages as any,
    temperature,
    max_tokens: maxTokens,
    // @ts-expect-error venice-specific passthrough
    venice_parameters: { disable_thinking: true },
  })
  const msg: any = res.choices?.[0]?.message ?? {}
  const content = (msg.content || msg.reasoning_content || '').trim()
  return { content, model, payVia: 'api-key', tee }
}
