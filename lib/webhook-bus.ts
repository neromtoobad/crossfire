// Phase 7.7 — in-memory pub-sub for 1Shot webhook arrivals.
//
// Lives in the Next.js node runtime: the webhook route publishes here as
// soon as 1Shot POSTs a status; the relay stream route subscribes and
// surfaces arrivals into the live log. Per-taskId fan-out, with a small
// global stream for the "any webhook received" indicator on the landing.
//
// Persistence is still handled by relayer-state.ts — this bus is the
// real-time channel only. If the server restarts, queued listeners go
// away, but persisted events survive.

export type WebhookHit = {
  receivedAt: number
  taskId: string
  status: string
  txHash?: string
  raw: unknown
}

type Listener = (hit: WebhookHit) => void

const byTask = new Map<string, Set<Listener>>()
const global = new Set<Listener>()
const recent: WebhookHit[] = [] // last 50, newest first

export function publish(hit: WebhookHit): void {
  recent.unshift(hit)
  if (recent.length > 50) recent.length = 50

  const subs = byTask.get(hit.taskId)
  if (subs) for (const fn of subs) { try { fn(hit) } catch { /* ignore listener errors */ } }
  for (const fn of global) { try { fn(hit) } catch { /* ignore */ } }
}

export function subscribe(taskId: string, fn: Listener): () => void {
  let subs = byTask.get(taskId)
  if (!subs) { subs = new Set(); byTask.set(taskId, subs) }
  subs.add(fn)
  return () => {
    subs!.delete(fn)
    if (subs!.size === 0) byTask.delete(taskId)
  }
}

export function subscribeAny(fn: Listener): () => void {
  global.add(fn)
  return () => { global.delete(fn) }
}

export function recentHits(limit = 10): WebhookHit[] {
  return recent.slice(0, limit)
}
