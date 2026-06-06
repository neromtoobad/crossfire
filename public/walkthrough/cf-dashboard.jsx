// cf-dashboard.jsx — the full CROSSFIRE screen: header, KPI row, duel, audit, mandate.
const { CF, short, Sidebar, KpiCard, Pill, Bar, LogoMark, DuelHero } = window;

function KpiRow({ s }) {
  const remaining = s.remaining;
  const spentPct = ((CF.mandate.cap - remaining) / CF.mandate.cap) * 100;
  const resolved = s.ignite > 0.4;
  return (
    <div style={{ display: 'flex', gap: 14 }}>
      <KpiCard label="MANDATE REMAINING" accent={CF.color.bull} glow={s.spendGlow}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: CF.font.mono, fontWeight: 700, fontSize: 30, color: CF.color.text, fontVariantNumeric: 'tabular-nums' }}>{remaining.toFixed(2)}</span>
          <span style={{ fontFamily: CF.font.mono, fontSize: 12, color: CF.color.dim }}>/ {CF.mandate.cap.toFixed(2)} USDC</span>
        </div>
        <div style={{ marginTop: 12 }}><Bar pct={spentPct} color={CF.color.bull} height={6} glow={0.4} /></div>
      </KpiCard>

      <KpiCard label="NET POSITION" accent={resolved ? CF.color.bear : CF.color.edgeHi} glow={s.ignite}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: CF.font.display, fontWeight: 700, fontSize: 30, letterSpacing: 1,
            color: resolved ? CF.color.bear : CF.color.dimmer, textShadow: resolved ? `0 0 18px ${CF.color.bear}` : 'none' }}>
            {resolved ? 'NO' : '—'}
          </span>
          <span style={{ fontFamily: CF.font.mono, fontSize: 13, color: resolved ? CF.color.bear : CF.color.dim, whiteSpace: 'nowrap' }}>
            {resolved ? '4.00 USDC' : 'awaiting net'}
          </span>
        </div>
        <div style={{ marginTop: 13, fontFamily: CF.font.mono, fontSize: 10.5, color: CF.color.dim }}>
          winning side &middot; chain-redeemed
        </div>
      </KpiCard>

      <KpiCard label="EVIDENCE SPENT" accent={CF.color.edgeHi}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: CF.font.mono, fontWeight: 700, fontSize: 30, color: CF.color.text, fontVariantNumeric: 'tabular-nums' }}>{s.evidence.toFixed(2)}</span>
          <span style={{ fontFamily: CF.font.mono, fontSize: 12, color: CF.color.dim }}>USDC</span>
        </div>
        <div style={{ marginTop: 13, fontFamily: CF.font.mono, fontSize: 10.5, color: CF.color.dim }}>
          {CF.mandate.evidenceCalls} x402 calls &middot; metered on-chain
        </div>
      </KpiCard>

      <KpiCard label="RELAY STATUS" accent={CF.color.bull}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ fontFamily: CF.font.display, fontWeight: 700, fontSize: 19, color: CF.color.text }}>1Shot</span>
          <Pill kind="success" label="Confirmed" />
        </div>
        <div style={{ marginTop: 13, fontFamily: CF.font.mono, fontSize: 10.5, color: CF.color.dim }}>
          Base mainnet &middot; gas paid ${CF.relay.gasUsdc} USDC
        </div>
      </KpiCard>
    </div>
  );
}

const ACTOR_COLOR = { You: CF.color.text, Orchestrator: CF.color.amber, Bull: CF.color.bull, Bear: CF.color.bear };

const AUDIT_ROWS = [
  { t: '14:22:01', actor: 'You',          action: 'granted mandate',     amt: '50.00', st: 'success', tx: null },
  { t: '14:22:18', actor: 'Bull',         action: 'bought evidence',     amt: '1.00',  st: 'success', tx: CF.tx.bullEvid },
  { t: '14:22:19', actor: 'Bear',         action: 'bought evidence',     amt: '1.00',  st: 'success', tx: CF.tx.bearEvid },
  { t: '14:22:55', actor: 'Orchestrator', action: 'placed bet · NO',     amt: '4.00',  st: 'success', tx: CF.tx.betTransfer },
];
const REFUSED_ROW = { t: '14:23:10', actor: 'Orchestrator', action: 'over-cap redemption · refused by enforcer', amt: '60.00', st: 'refused', tx: null };

function AuditTable({ s }) {
  const cols = '78px 104px 1fr 78px 96px 120px';
  const cell = { padding: '0 8px', display: 'flex', alignItems: 'center' };
  const showRefused = s.refused > 0.05;
  return (
    <section style={{ flex: 1.55, background: CF.color.panel, border: `1px solid ${CF.color.edge}`, borderRadius: 14,
      padding: '16px 18px 10px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontFamily: CF.font.display, fontWeight: 700, fontSize: 14, letterSpacing: 2.5, color: CF.color.text }}>AUDIT TRAIL</span>
        <span style={{ fontFamily: CF.font.mono, fontSize: 10.5, color: CF.color.dim }}>every action, on-chain</span>
      </div>
      {/* header */}
      <div style={{ display: 'grid', gridTemplateColumns: cols, height: 26, alignItems: 'center',
        fontFamily: CF.font.mono, fontSize: 9.5, letterSpacing: 1.2, color: CF.color.dimmer,
        borderBottom: `1px solid ${CF.color.edge}` }}>
        <div style={cell}>TIME</div><div style={cell}>ACTOR</div><div style={cell}>ACTION</div>
        <div style={{ ...cell, justifyContent: 'flex-end' }}>AMOUNT</div><div style={cell}>STATUS</div><div style={cell}>TX</div>
      </div>
      {/* rows */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {AUDIT_ROWS.map((r, i) => (
          <AuditRow key={i} r={r} cols={cols} cell={cell} />
        ))}
        {showRefused && (
          <div style={{ transform: `translateY(${(1 - s.refusedRow) * -10}px)`, opacity: s.refusedRow }}>
            <AuditRow r={REFUSED_ROW} cols={cols} cell={cell} loud glow={s.refused} />
          </div>
        )}
      </div>
    </section>
  );
}

function AuditRow({ r, cols, cell, loud, glow = 0 }) {
  const refused = r.st === 'refused';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: cols, height: loud ? 44 : 34, alignItems: 'center',
      borderBottom: `1px solid ${loud ? 'color-mix(in oklab, ' + CF.color.bear + ' 45%, transparent)' : CF.color.edge}`,
      borderTop: loud ? `1px solid color-mix(in oklab, ${CF.color.bear} 45%, transparent)` : 'none',
      fontFamily: CF.font.mono, fontSize: loud ? 12.5 : 11.5,
      background: loud ? `color-mix(in oklab, ${CF.color.bear} ${13 + glow * 10}%, transparent)` : 'transparent',
      boxShadow: loud ? `inset 3px 0 0 ${CF.color.bear}, inset 0 0 ${30 * glow}px color-mix(in oklab, ${CF.color.bear} ${16 * glow}%, transparent), 0 0 ${24 * glow}px color-mix(in oklab, ${CF.color.bear} ${30 * glow}%, transparent)` : 'none' }}>
      <div style={{ ...cell, color: CF.color.dim }}>{r.t}</div>
      <div style={{ ...cell, color: ACTOR_COLOR[r.actor], fontWeight: 600 }}>{r.actor}</div>
      <div style={{ ...cell, color: refused ? CF.color.bear : CF.color.text, fontWeight: refused ? 700 : 400, whiteSpace: 'nowrap' }}>
        {r.action}
      </div>
      <div style={{ ...cell, justifyContent: 'flex-end', color: refused ? CF.color.bear : CF.color.text, fontWeight: 600 }}>{r.amt}</div>
      <div style={cell}><Pill kind={r.st} glow={loud ? glow : 0} /></div>
      <div style={{ ...cell, color: CF.color.bull }}>{r.tx ? short(r.tx, 6, 4) : <span style={{ color: CF.color.dimmer }}>&mdash;</span>}</div>
    </div>
  );
}

function MandatePanel({ s }) {
  const Row = ({ k, v, color }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0',
      borderBottom: `1px dashed ${CF.color.edge}` }}>
      <span style={{ fontFamily: CF.font.mono, fontSize: 11.5, color: CF.color.dim }}>{k}</span>
      <span style={{ fontFamily: CF.font.mono, fontSize: 12.5, color: color || CF.color.text, fontWeight: 600 }}>{v}</span>
    </div>
  );
  const btn = (bg, bd, col, glow) => ({
    flex: 1, padding: '11px 0', borderRadius: 9, border: `1px solid ${bd}`, background: bg, color: col,
    fontFamily: CF.font.display, fontWeight: 600, fontSize: 13.5, letterSpacing: 1, textAlign: 'center',
    boxShadow: glow ? `0 0 16px color-mix(in oklab, ${col} 35%, transparent)` : 'none',
  });
  return (
    <section style={{ flex: 1, background: CF.color.panel, border: `1px solid ${CF.color.edge}`, borderRadius: 14,
      padding: '16px 18px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontFamily: CF.font.display, fontWeight: 700, fontSize: 14, letterSpacing: 2.5, color: CF.color.text }}>ROOT MANDATE</span>
        <Pill kind="success" label="USER SA" />
      </div>
      <Row k="Cap" v={`${CF.mandate.cap.toFixed(2)} USDC`} />
      <Row k="Spent" v={`${(CF.mandate.cap - s.remaining).toFixed(2)} USDC`} />
      <Row k="Remaining" v={`${s.remaining.toFixed(2)} USDC`} color={CF.color.bull} />
      <Row k="Expires in" v={s.expiry} color={CF.color.amber} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0 12px' }}>
        <span style={{ fontFamily: CF.font.mono, fontSize: 11.5, color: CF.color.dim }}>Allowed targets</span>
        <span style={{ display: 'flex', gap: 6 }}>
          {['USDC', 'MARKET'].map((t) => (
            <span key={t} style={{ fontFamily: CF.font.mono, fontSize: 10.5, color: CF.color.dim,
              border: `1px solid ${CF.color.edgeHi}`, borderRadius: 5, padding: '2px 7px' }}>{t}</span>
          ))}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
        <div style={btn(`color-mix(in oklab, ${CF.color.bull} 16%, transparent)`, `color-mix(in oklab, ${CF.color.bull} 45%, transparent)`, CF.color.bull, s.grantGlow)}>GRANT</div>
        <div style={btn('transparent', `color-mix(in oklab, ${CF.color.bear} 35%, transparent)`, CF.color.bear, 0)}>REVOKE</div>
      </div>
    </section>
  );
}

function Dashboard({ s }) {
  return (
    <div style={{ width: 1920, height: 1080, background: CF.color.bg, display: 'flex', overflow: 'hidden',
      fontFamily: CF.font.display, color: CF.color.text }}>
      <Sidebar active={s.refused > 0.3 ? 'audit' : (s.duelFocus ? 'duel' : 'dash')} logoIgnite={s.logoIgnite} glow={0.6} />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '30px 38px 32px', gap: 18, minWidth: 0 }}>
        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: CF.font.display, fontWeight: 700, fontSize: 26, letterSpacing: 1, color: CF.color.text }}>Dashboard</h1>
            <div style={{ marginTop: 5, fontFamily: CF.font.mono, fontSize: 12, color: CF.color.dim, whiteSpace: 'nowrap' }}>
              adversarial agents &middot; chain-enforced mandate &middot; <span style={{ color: CF.color.dimmer }}>base-sepolia</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: CF.font.mono, fontSize: 11.5, color: CF.color.dim, display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: CF.color.bull, boxShadow: `0 0 7px ${CF.color.bull}` }} />
              live
            </span>
            <div style={{ fontFamily: CF.font.mono, fontSize: 12, color: CF.color.dim, border: `1px solid ${CF.color.edge}`,
              borderRadius: 8, padding: '7px 13px' }}>{short(CF.addr.userSa, 8, 6)}</div>
          </div>
        </div>

        <KpiRow s={s} />
        <DuelHero s={s} />
        <div style={{ display: 'flex', gap: 16, height: 252, flexShrink: 0 }}>
          <AuditTable s={s} />
          <MandatePanel s={s} />
        </div>
      </main>
    </div>
  );
}

Object.assign(window, { Dashboard });
