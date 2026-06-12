// Pure time helpers, no server-only deps, safe to import from client
// components (keeps lib/calls-data, with its node:fs imports, out of the
// client bundle).

export function relativeTime(ms: number): string {
  const delta = Date.now() - ms
  const hr = Math.floor(delta / 3600000)
  if (hr < 1) return 'just now'
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  return `${d}d ago`
}
