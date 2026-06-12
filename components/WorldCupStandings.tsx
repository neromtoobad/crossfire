// Live 2026 World Cup group tables — the real tournament standings (ESPN). On
// the home page we show the groups that have actually kicked off ("fixtures
// played so far"); the full 48-team table lives on /fixtures.

import Link from 'next/link'
import { getWorldCupStandings, type GroupTable } from '../lib/wc-standings'
import { CF, alpha } from '../lib/theme'

export async function WorldCupStandings({ full = false }: { full?: boolean }) {
  const { groups, matchesPlayed, live } = await getWorldCupStandings(Date.now())

  // sort played-first; the home shows only groups underway, the page shows all
  const sorted = [...groups].sort((a, b) => b.played - a.played)
  const shown = full ? sorted : sorted.filter((g) => g.played > 0)
  const display = shown.length ? shown : sorted.slice(0, 4)

  return (
    <section style={{ padding: '52px 0 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="mono" style={{ fontSize: 10.5, letterSpacing: 2.4, color: CF.gold, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 9 }}>
            {live ? <span className="cf-live-dot" aria-hidden /> : null}
            WORLD CUP 2026 · LIVE TABLE
          </div>
          <h2 style={{ fontFamily: CF.display, fontWeight: 600, fontSize: 'clamp(26px, 2.6vw, 34px)', letterSpacing: -0.8, color: CF.ink, margin: 0 }}>
            {matchesPlayed === 0 ? 'The group stage' : `${matchesPlayed} ${matchesPlayed === 1 ? 'fixture' : 'fixtures'} played so far`}
          </h2>
          <p className="mono" style={{ fontSize: 11, color: CF.ink3, marginTop: 8 }}>
            real results from ESPN · {live ? 'updated live' : 'last verified snapshot'}
          </p>
        </div>
        {!full ? (
          <Link href="/fixtures" className="mono" style={{ fontSize: 11.5, letterSpacing: 0.5, color: CF.gold, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Full group stage →
          </Link>
        ) : null}
      </div>

      {display.length === 0 ? (
        <div style={{ padding: '20px', background: CF.surface, border: `1px solid ${CF.line}`, borderRadius: CF.radius.lg, color: CF.ink3, fontFamily: CF.body, fontSize: 14 }}>
          The tournament hasn’t kicked off yet — tables fill in as fixtures are played.
        </div>
      ) : (
        <div className="cf-g3 cf-stagger" style={{ gap: 14 }}>
          {display.map((g) => <GroupCard key={g.name} g={g} />)}
        </div>
      )}
    </section>
  )
}

function GroupCard({ g }: { g: GroupTable }) {
  return (
    <div style={{ background: CF.surface, border: `1px solid ${CF.line}`, borderRadius: CF.radius.lg, boxShadow: CF.shadow.card, overflow: 'hidden', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${CF.line}` }}>
        <span style={{ fontFamily: CF.body, fontWeight: 700, fontSize: 13.5, color: CF.ink, letterSpacing: 0.4 }}>{g.name}</span>
        <span className="mono" style={{ fontSize: 9.5, color: g.played > 0 ? CF.gold : CF.ink4 }}>{g.played > 0 ? `${Math.round(g.played / 2)} played` : 'to kick off'}</span>
      </div>
      {/* header row */}
      <div style={{ display: 'grid', gridTemplateColumns: '18px 1fr 20px 28px 46px 24px', gap: 6, padding: '7px 16px', borderBottom: `1px solid ${CF.line}` }}>
        {['', 'TEAM', 'P', 'GD', 'W-D-L', 'PTS'].map((h, i) => (
          <span key={i} className="mono" style={{ fontSize: 8.5, color: CF.ink4, letterSpacing: 0.6, textAlign: i >= 2 ? 'right' : 'left' }}>{h}</span>
        ))}
      </div>
      {g.teams.map((t, i) => {
        const qualifying = t.rank <= 2
        return (
          <div key={t.abbr + i} style={{
            display: 'grid', gridTemplateColumns: '18px 1fr 20px 28px 46px 24px', gap: 6,
            padding: '9px 16px', alignItems: 'center',
            borderBottom: i < g.teams.length - 1 ? `1px solid ${alpha(CF.line, 60)}` : 'none',
            borderLeft: `2px solid ${qualifying ? CF.positive : 'transparent'}`,
          }}>
            <span className="mono tnum" style={{ fontSize: 10, color: qualifying ? CF.positive : CF.ink4, fontWeight: 700 }}>{t.rank}</span>
            <span style={{ minWidth: 0, fontFamily: CF.body, fontSize: 12.5, color: CF.ink, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t.name} <span className="mono" style={{ color: CF.ink4, fontSize: 9.5 }}>{t.abbr}</span>
            </span>
            <span className="mono tnum" style={{ fontSize: 11, color: CF.ink3, textAlign: 'right' }}>{t.played}</span>
            <span className="mono tnum" style={{ fontSize: 11, color: t.gd > 0 ? CF.positive : t.gd < 0 ? CF.bear : CF.ink3, textAlign: 'right' }}>{t.gd > 0 ? '+' : ''}{t.gd}</span>
            <span className="mono tnum" style={{ fontSize: 10.5, color: CF.ink3, textAlign: 'right', whiteSpace: 'nowrap' }}>{t.wins}-{t.draws}-{t.losses}</span>
            <span className="mono tnum" style={{ fontSize: 13, color: CF.ink, fontWeight: 700, textAlign: 'right' }}>{t.points}</span>
          </div>
        )
      })}
    </div>
  )
}
