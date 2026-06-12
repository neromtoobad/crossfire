// AgentAvatar, the agent's Venice-generated robot portrait in a tinted,
// colour-ringed frame. Falls back to the letter monogram if no portrait.
// Pure presentational (no hooks) so it renders in server or client components.

import { punditOf, type Pundit } from '../lib/pundits'
import { CF, alpha } from '../lib/theme'

export function AgentAvatar({
  role,
  pundit,
  size = 32,
  radius,
  ring = true,
}: {
  role?: string
  pundit?: Pundit
  size?: number
  radius?: number          // defaults to a rounded square; pass 999 for a circle
  ring?: boolean
}) {
  const p = pundit ?? (role ? punditOf(role) : undefined)
  const r = radius ?? Math.round(size * 0.28)
  const color = p?.color ?? CF.ink3
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: size, height: size, borderRadius: r, overflow: 'hidden', flexShrink: 0,
        background: p?.tint ?? CF.surface2,
        border: ring ? `1.5px solid ${alpha(color, 50)}` : 'none',
      }}
    >
      {p?.portrait ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.portrait}
          alt={p.handle}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 18%' }}
        />
      ) : (
        <span style={{ fontFamily: CF.mono, fontWeight: 700, color, fontSize: Math.round(size * 0.42) }}>
          {p?.avatar ?? '·'}
        </span>
      )}
    </span>
  )
}
