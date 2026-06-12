// Optional durable KV (Upstash Redis over REST), server-only.
//
// WHY REST: Vercel serverless has no persistent filesystem and no TCP-friendly
// runtime for a classic Redis client, but the Upstash REST API is a plain
// fetch(), works anywhere, no SDK, bundle-safe.
//
// WHY OPTIONAL: if no KV is configured, every call is a no-op and the app falls
// back to the client localStorage store. So the Vault works with ZERO setup,
// and cross-device sync lights up the moment a KV is provisioned in Vercel
// (one click in the dashboard → it injects KV_REST_API_URL/TOKEN → redeploy).
//
// Vercel's Upstash Marketplace integration injects either the KV_* names
// (legacy Vercel KV) or the UPSTASH_* names, we accept both.

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || ''
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ''

export const kvEnabled = Boolean(KV_URL && KV_TOKEN)

async function cmd(args: (string | number)[]): Promise<unknown> {
  const res = await fetch(KV_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`KV ${res.status}`)
  return (await res.json() as { result?: unknown }).result ?? null
}

export async function kvGetJSON<T>(key: string, fallback: T): Promise<T> {
  if (!kvEnabled) return fallback
  try {
    const r = await cmd(['GET', key])
    return typeof r === 'string' ? (JSON.parse(r) as T) : fallback
  } catch { return fallback }
}

export async function kvSetJSON(key: string, value: unknown): Promise<void> {
  if (!kvEnabled) return
  try { await cmd(['SET', key, JSON.stringify(value)]) } catch { /* best effort, localStorage still holds it */ }
}
