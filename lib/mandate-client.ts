// Client-side mandate store (localStorage, keyed by wallet), same rationale as
// bets-client.ts: Vercel /tmp is per-instance + ephemeral, so the granted
// ERC-7715 mandate must live in the user's browser to survive the round-trip to
// the Vault. Revoke flips a local flag (the real chain-side revoke happens in
// the wallet; this reflects it so the kill-switch is visible end to end).

export type StoredMandate = {
  user: string                    // wallet address, lowercased
  marketId: string                // the call's market, the key shown in the Vault
  marketTitle?: string
  capUsdc: number
  expiresAt: number               // unix MILLISECONDS
  context?: string                // ERC-7715 permission context (the receipt)
  redeemer?: string
  ts: number
  revoked?: boolean
}

const KEY = 'cf-mandates-v1'

function readAll(): StoredMandate[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(window.localStorage.getItem(KEY) || '[]') as StoredMandate[] } catch { return [] }
}
function writeAll(ms: StoredMandate[]): void {
  try { window.localStorage.setItem(KEY, JSON.stringify(ms)) } catch { /* best effort */ }
}

/** One active mandate per user+market; re-granting refreshes cap/expiry. */
export function recordMandateLocal(m: StoredMandate): void {
  const user = m.user.toLowerCase()
  const kept = readAll().filter((x) => !(x.user.toLowerCase() === user && x.marketId === m.marketId))
  kept.push({ ...m, user })
  writeAll(kept)
}

/** Active (non-revoked) mandates for a user, newest first. */
export function listMandatesLocal(user: string): StoredMandate[] {
  const u = user.toLowerCase()
  return readAll()
    .filter((m) => m.user.toLowerCase() === u && !m.revoked)
    .sort((a, b) => b.ts - a.ts)
}

export function revokeMandateLocal(user: string, marketId: string): void {
  const u = user.toLowerCase()
  writeAll(readAll().map((m) =>
    m.user.toLowerCase() === u && m.marketId === marketId ? { ...m, revoked: true } : m,
  ))
}
