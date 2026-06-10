// /agents/[handle] — an AI agent's profile: record, ROI, calibration by stage,
// and its actual Venice-written reasoning on recent calls. The "study before
// you back" page. Arena dark/gold via CF tokens.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { loadCalls } from '../../../lib/calls-data'
import { computeAgentStats } from '../../../lib/leaderboard'
import { getResolution } from '../../../lib/resolutions'
import { PUNDITS, PUNDIT_ROLES, roleOfSlug, slugOf } from '../../../lib/pundits'
import { ConnectButton } from '../../../components/ConnectButton'
import { AgentPicks } from '../../../components/AgentPicks'
import { BrandLogo } from '../../../components/Logo'
import { CF, alpha } from '../../../lib/theme'

export const dynamic = 'force-dynamic'

export default async function AgentProfile({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  const role = roleOfSlug(handle)
  if (!role) notFound()

  const p = PUNDITS[role]
  const calls = loadCalls()
  const stats = computeAgentStats(calls)
  const me = stats.find((s) => s.role === role)!
  const rank = [...stats].sort((a, b) => b.winRate - a.winRate).findIndex((s) => s.role === role) + 1
  const winPct = me.callsResolved ? Math.round(me.winRate * 100) : null

  // this agent's track record: its vote + reasoning per call, with outcome
  const record = calls
    .map((c) => {
      const v = c.votes.find((x) => x.role === role)
      if (!v) return null
      const res = getResolution(c.marketId) // 'YES' | 'NO' | 'PENDING'
      const outcome = res === 'PENDING' ? 'pending' : v.vote === res ? 'hit' : 'miss'
      return { c, v, outcome }
    })
    .filter(Boolean)
    .sort((a, b) => b!.c.publishedAt - a!.c.publishedAt) as { c: typeof calls[number]; v: NonNullable<ReturnType<typeof calls[number]['votes']['find']>>; outcome: 'hit' | 'miss' | 'pending' }[]

  const resolved = record.filter((r) => r.outcome !== 'pending')

  // serializable pick rows for the client list — the thesis content itself
  // NEVER ships here; it's returned by the unlock API after payment.
  const pickRows = record.map(({ c, v, outcome }) => ({
    callId: c.id,
    marketTitle: c.marketTitle,
    unlockUsdc: c.unlockUsdc || 0.1,
    vote: v.vote,
    confidence: v.confidence,
    oneLiner: v.oneLiner,
    outcome,
    hasThesis: !!c.locked?.thesis,
  }))

  const brierColor = me.callsResolved === 0 ? CF.ink3 : me.brierScore < 0.21 ? CF.bull : me.brierScore < 0.27 ? CF.amber : CF.bear
  const brierLabel = me.callsResolved === 0 ? 'unscored' : me.brierScore < 0.12 ? 'sharp' : me.brierScore < 0.21 ? 'calibrated' : me.brierScore < 0.27 ? 'fair' : 'miscalibrated'

  return (
    <main style={{ background: CF.bg, color: CF.ink, minHeight: '100vh', padding: '0 24px 96px' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        {/* nav */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 18px', borderBottom: `1px solid ${CF.line}` }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BrandLogo size={26} />
            <span style={{ fontFamily: CF.body, fontWeight: 700, fontSize: 13, letterSpacing: 3.4, color: CF.ink }}>CROSSFIRE</span>
          </Link>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <Link href="/leaderboard" style={navStyle}>← All agents</Link>
            <Link href="/agents" style={navStyle}>Agents</Link>
            <ConnectButton variant="primary" />
          </div>
        </header>

        {/* hero */}
        <section style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 28, alignItems: 'center', padding: '44px 0 30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <span style={{
              width: 84, height: 84, borderRadius: 14, flexShrink: 0, overflow: 'hidden',
              display: 'inline-flex', border: `2px solid ${p.color}`,
              boxShadow: `0 0 24px ${alpha(p.color, 40)}`,
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.portrait} alt={`${p.handle} — AI agent`} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 16%' }} />
            </span>
            <div>
              <div className="mono" style={{ fontSize: 10.5, letterSpacing: 2, color: CF.ink3, marginBottom: 6 }}>AI AGENT · RANK #{rank} OF 5</div>
              <h1 style={{ fontFamily: CF.display, fontWeight: 500, fontSize: 'clamp(34px, 5vw, 46px)', lineHeight: 1, letterSpacing: -1.4, margin: '0 0 6px', color: CF.ink }}>
                {p.handle}
              </h1>
              <div style={{ fontFamily: CF.body, fontSize: 15, color: p.color, fontWeight: 600 }}>{p.persona} · {p.archetype}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="mono" style={{ fontSize: 10.5, letterSpacing: 1.4, color: CF.ink4, marginBottom: 4 }}>WIN RATE</div>
            <div className="mono tnum" style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1.5, color: winPct === null ? CF.ink3 : winPct >= 60 ? CF.positive : winPct >= 40 ? CF.amber : CF.bear }}>
              {winPct === null ? '—' : `${winPct}%`}
            </div>
          </div>
        </section>

        {/* voice */}
        <p style={{ fontFamily: CF.body, fontSize: 16.5, color: CF.ink2, lineHeight: 1.6, margin: '0 0 30px', maxWidth: 680 }}>
          {p.blurb}
        </p>

        {/* stat tiles */}
        <section className="cf-g4 cf-stagger" style={{ gap: 12, marginBottom: 14 }}>
          {[
            { label: 'CALLS MADE', value: `${me.callsTotal}` },
            { label: 'RESOLVED', value: `${me.callsResolved}` },
            { label: 'WIN RATE', value: me.callsResolved ? `${Math.round(me.winRate * 100)}%` : '—', color: me.winRate >= 0.6 ? CF.bull : me.winRate >= 0.4 ? CF.amber : CF.bear },
            { label: 'BUDGET ×', value: `${me.budgetMultiplier.toFixed(2)}×`, color: me.budgetMultiplier > 1 ? CF.bull : me.budgetMultiplier < 1 ? CF.bear : CF.ink2 },
          ].map((t) => (
            <div key={t.label} style={{ padding: '16px 18px', background: CF.surface, border: `1px solid ${CF.line}`, borderRadius: CF.radius.lg, boxShadow: CF.shadow.card }}>
              <div className="mono" style={{ fontSize: 9.5, color: CF.ink4, letterSpacing: 1.4, marginBottom: 8 }}>{t.label}</div>
              <div className="mono tnum" style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.4, color: (t as { color?: string }).color ?? CF.ink }}>{t.value}</div>
            </div>
          ))}
        </section>

        {/* calibration by stage */}
        <section style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '6px 0 8px', marginBottom: 30 }}>
          <span className="mono" style={{ fontSize: 10.5, color: CF.ink3, letterSpacing: 1.4 }}>CALIBRATION</span>
          <span className="mono" style={{ padding: '4px 10px', borderRadius: 999, background: alpha(brierColor, 12), color: brierColor, border: `1px solid ${alpha(brierColor, 25)}`, fontSize: 10.5, fontWeight: 600, letterSpacing: 0.5 }}>
            {brierLabel}{me.callsResolved ? ` · Brier ${me.brierScore.toFixed(3)}` : ''}
          </span>
          {Object.entries(me.byCategory).sort((a, b) => a[1].brier - b[1].brier).map(([cat, c]) => {
            const col = c.brier < 0.15 ? CF.bull : c.brier < 0.25 ? CF.amber : CF.bear
            return (
              <span key={cat} className="mono" style={{ fontSize: 11, color: CF.ink3 }} title={`${c.won}/${c.resolved} right`}>
                {cat} <span className="tnum" style={{ color: col, fontWeight: 600 }}>{c.brier.toFixed(2)}</span>
              </span>
            )
          })}
        </section>

        {/* track record — the Venice reasoning */}
        <section>
          <div className="mono" style={{ fontSize: 11, letterSpacing: 2.2, color: CF.ink3, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'inline-block', width: 18, height: 1, background: CF.ink }} />
THE CALLS · {resolved.length} graded on real results · backtest
          </div>
          <AgentPicks picks={pickRows} color={p.color} />
        </section>

        {/* other agents */}
        <section style={{ marginTop: 40, paddingTop: 24, borderTop: `1px solid ${CF.line}` }}>
          <div className="mono" style={{ fontSize: 10.5, letterSpacing: 1.6, color: CF.ink3, marginBottom: 14 }}>OTHER AGENTS</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {PUNDIT_ROLES.filter((r) => r !== role).map((r) => {
              const o = PUNDITS[r]
              return (
                <Link key={r} href={`/agents/${slugOf(r)}`} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 14px 8px 9px', borderRadius: 999, background: CF.surface, border: `1px solid ${CF.line}` }}>
                  <span style={{ width: 26, height: 26, borderRadius: 6, overflow: 'hidden', display: 'inline-flex', border: `1.5px solid ${o.color}`, flexShrink: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={o.portrait} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 16%' }} />
                  </span>
                  <span style={{ fontFamily: CF.body, fontWeight: 600, fontSize: 13, color: CF.ink }}>{o.handle}</span>
                </Link>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}

const navStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: CF.radius.md, fontFamily: CF.body, fontSize: 13, fontWeight: 500, color: CF.ink2 }
