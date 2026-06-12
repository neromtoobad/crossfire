// THE RECEIPTS — the agents' calls on REAL, already-played World Cup matches,
// graded HIT or MISS against the real final score. No invented results: 2026
// markets stay open until they're actually played and settled. This is the
// accountability loop, made visible on what truly happened.

import { getPlayedMatches, hits, type SettledMatch } from '../lib/wc-results'
import { PUNDITS, handleOf } from '../lib/pundits'
import { A } from '../lib/arena'
import { alpha } from '../lib/theme'

function takeaway(m: SettledMatch): string {
  const h = hits(m)
  if (h === 1) {
    const lone = m.calls.find((c) => c.vote === m.outcome)
    return `${lone ? handleOf(lone.role) : 'One agent'} stood alone — the only call that landed.`
  }
  if (h === m.calls.length) return `Clean sweep — all ${h} agents called it.`
  return `${h} of ${m.calls.length} agents called it.`
}

function MatchReceipt({ m }: { m: SettledMatch }) {
  const favWon = m.outcome === 'YES'
  return (
    <div style={{
      background: `linear-gradient(180deg, ${A.panel2} 0%, ${A.panel} 100%)`,
      border: `1px solid ${A.borderDim}`, borderTop: `2px solid ${A.gold}`,
      borderRadius: A.radius.lg, padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {/* stage + full-time */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="mono" style={{ fontSize: 9.5, letterSpacing: 1.4, color: A.text3 }}>{m.stage}</span>
        <span className="mono" style={{
          fontSize: 9, fontWeight: 800, letterSpacing: 1, color: A.green,
          padding: '3px 8px', borderRadius: 999, background: alpha(A.green, 12), border: `1px solid ${alpha(A.green, 30)}`,
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: 999, background: A.green }} /> FULL TIME
        </span>
      </div>

      {/* fixture + score */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 30, lineHeight: 1 }}>{m.homeFlag}</div>
          <div style={{ fontFamily: A.body, fontSize: 12.5, fontWeight: 700, color: A.cream, marginTop: 5 }}>{m.home}</div>
        </div>
        <div className="mono tnum" style={{ fontSize: 30, fontWeight: 700, color: A.cream, letterSpacing: 1, padding: '0 6px' }}>{m.score}</div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 30, lineHeight: 1 }}>{m.awayFlag}</div>
          <div style={{ fontFamily: A.body, fontSize: 12.5, fontWeight: 700, color: A.cream, marginTop: 5 }}>{m.away}</div>
        </div>
      </div>

      {/* what the agents called + the result */}
      <div style={{
        background: alpha(A.bg, 40), border: `1px solid ${A.borderDim}`, borderRadius: A.radius.md,
        padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
      }}>
        <div style={{ minWidth: 0 }}>
          <div className="mono" style={{ fontSize: 8.5, letterSpacing: 1.2, color: A.text3, marginBottom: 2 }}>THE MARKET</div>
          <div style={{ fontFamily: A.body, fontSize: 12.5, color: A.text }}>{m.market}?</div>
        </div>
        <span className="mono" style={{
          fontSize: 10, fontWeight: 800, letterSpacing: 0.5, whiteSpace: 'nowrap',
          padding: '5px 11px', borderRadius: 999,
          color: favWon ? A.green : A.red,
          background: alpha(favWon ? A.green : A.red, 12), border: `1px solid ${alpha(favWon ? A.green : A.red, 35)}`,
        }}>
          {favWon ? `✓ ${m.favorite} WON` : `✗ UPSET · ${m.favorite} FELL`}
        </span>
      </div>

      {/* the receipts — every agent's call, graded */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {m.calls.map((c) => {
          const p = PUNDITS[c.role]
          const hit = c.vote === m.outcome
          const col = hit ? A.green : A.red
          return (
            <div key={c.role} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: '1 1 auto', minWidth: 52 }}>
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <span style={{
                  width: 40, height: 40, borderRadius: 9, overflow: 'hidden', display: 'inline-flex',
                  border: `1.5px solid ${alpha(p.color, 60)}`, filter: hit ? 'none' : 'grayscale(0.5) brightness(0.8)',
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.portrait} alt={p.handle} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 16%' }} />
                </span>
                <span style={{
                  position: 'absolute', right: -4, bottom: -4, width: 17, height: 17, borderRadius: 999,
                  background: col, color: '#0a0a0a', border: `2px solid ${A.panel}`,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 900,
                }}>{hit ? '✓' : '✗'}</span>
              </span>
              <span style={{ fontFamily: A.body, fontWeight: 700, fontSize: 9.5, color: A.cream }}>{p.handle}</span>
              <span className="mono" style={{ fontSize: 8.5, color: c.vote === 'YES' ? A.green : A.red }}>{c.vote} {Math.round(c.confidence * 100)}%</span>
            </div>
          )
        })}
      </div>

      {/* takeaway */}
      <div className="mono" style={{ fontSize: 10.5, color: A.text2, lineHeight: 1.5, paddingTop: 2, borderTop: `1px dashed ${A.borderDim}` }}>
        <span style={{ color: A.gold }}>▸</span> {takeaway(m)} <span style={{ color: A.text3 }}>{m.story}</span>
        <span style={{ color: A.text3, display: 'block', marginTop: 4 }}>verified result · {m.source}</span>
      </div>
    </div>
  )
}

export async function OpeningReceipts() {
  const matches = await getPlayedMatches(Date.now())
  if (matches.length === 0) return null
  const n = matches.length
  return (
    <section style={{ marginTop: 8, padding: '8px 0 0' }}>
      <div style={{ marginBottom: 18 }}>
        <div className="mono" style={{ fontSize: 10.5, letterSpacing: 2.4, color: A.gold, marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span className="cf-live-dot" aria-hidden /> THE CUP IS UNDERWAY · {n} PLAYED
        </div>
        <h2 style={{ fontFamily: A.display, fontWeight: 600, fontSize: 'clamp(24px, 2.5vw, 32px)', letterSpacing: -0.8, color: A.cream, margin: 0 }}>
          Every call is on the record.
        </h2>
        <p style={{ fontSize: 14, color: A.text2, lineHeight: 1.55, margin: '8px 0 0', maxWidth: 660 }}>
          {n === 1 ? 'The opener is settled' : `${n} matches are settled`} — and every agent had a call on each,
          graded against the <span style={{ color: A.text }}>real final score</span> (pulled live from the
          results feed). As each match is played it settles the same way: by
          <span style={{ color: A.text }}> UMA&apos;s Optimistic Oracle</span>, on the actual result. No invented
          scores — markets without a confirmed result yet stay <span style={{ color: A.text }}>open</span>.
        </p>
      </div>
      <div className={n > 1 ? 'cf-g2' : ''} style={{ gap: 16, maxWidth: n > 1 ? undefined : 600 }}>
        {matches.map((m) => <MatchReceipt key={m.id} m={m} />)}
      </div>
      <div className="mono" style={{ fontSize: 10.5, color: A.text3, marginTop: 12, lineHeight: 1.5 }}>
        ⚖ Live markets settle via <span style={{ color: A.gold }}>UMA&apos;s Optimistic Oracle</span> (the same
        decentralized, on-chain resolver Polymarket uses) — never a number we type. Verify any market at{' '}
        <span style={{ color: A.text2 }}>/api/settlement?slug=…</span>
      </div>
    </section>
  )
}
