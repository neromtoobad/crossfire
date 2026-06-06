// cf-ui.jsx — CROSSFIRE UI atoms: logo mark, pills, bars, sidebar, KPI cards.
const { CF, short } = window;

// ── Crossing-beams "X" mark — the brand anchor ──
// Two beams (Bull blue + Bear red) meeting at a nexus. `ignite` 0..1 whitens
// the nexus; `lean` -1..1 tints toward Bull(-) or Bear(+).
function LogoMark({ size = 30, ignite = 0, lean = 0, glow = 0.55 }) {
  const g = glow;
  const nexusColor = ignite > 0.02
    ? `color-mix(in oklab, #fff ${ignite * 100}%, ${lean < 0 ? CF.color.bull : CF.color.bear})`
    : (Math.abs(lean) < 0.06 ? CF.color.dim : (lean < 0 ? CF.color.bull : CF.color.bear));
  const nexR = 7 + ignite * 5;
  const blur = (4 + ignite * 18) * g;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block', overflow: 'visible' }}>
      <line x1="16" y1="16" x2="84" y2="84" stroke={CF.color.bull} strokeWidth="9" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 ${6 * g}px ${CF.color.bull})`, opacity: 0.9 }} />
      <line x1="84" y1="16" x2="16" y2="84" stroke={CF.color.bear} strokeWidth="9" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 ${6 * g}px ${CF.color.bear})`, opacity: 0.9 }} />
      <circle cx="50" cy="50" r={nexR} fill={nexusColor}
        style={{ filter: `drop-shadow(0 0 ${blur}px ${nexusColor})` }} />
    </svg>
  );
}

function Wordmark({ size = 18, color = CF.color.text, opacity = 1 }) {
  return (
    <span style={{
      fontFamily: CF.font.display, fontWeight: 700, fontSize: size,
      letterSpacing: size * 0.22, color, opacity, paddingLeft: size * 0.22,
    }}>CROSSFIRE</span>
  );
}

// ── status pill ──
const PILL = {
  success: { c: CF.color.bull,  t: 'Success' },
  pending: { c: CF.color.amber, t: 'Pending' },
  refused: { c: CF.color.bear,  t: 'Refused' },
  white:   { c: CF.color.white, t: 'Resolved' },
};
function Pill({ kind = 'success', label, glow = 0 }) {
  const p = PILL[kind] || PILL.success;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: '4px 11px 4px 9px', borderRadius: 999,
      border: `1px solid color-mix(in oklab, ${p.c} 38%, transparent)`,
      background: `color-mix(in oklab, ${p.c} 12%, transparent)`,
      color: p.c, fontFamily: CF.font.mono, fontSize: 12, fontWeight: 500,
      letterSpacing: 0.3, whiteSpace: 'nowrap',
      boxShadow: glow > 0 ? `0 0 ${14 * glow}px color-mix(in oklab, ${p.c} ${40 * glow}%, transparent)` : 'none',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: 999, background: p.c,
        boxShadow: `0 0 6px ${p.c}` }} />
      {label || p.t}
    </span>
  );
}

// ── spend / budget bar ──
function Bar({ pct, color, height = 8, glow = 0.5, track = CF.color.edge }) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ height, background: track, borderRadius: height, overflow: 'visible', position: 'relative' }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: `${p}%`, borderRadius: height, background: color,
        boxShadow: `0 0 ${12 * glow}px color-mix(in oklab, ${color} ${55 * glow}%, transparent)`,
        transition: 'none',
      }} />
    </div>
  );
}

// thin crossing-beam divider (the X motif as a section rule)
function BeamDivider({ width = '100%' }) {
  return (
    <div style={{ width, height: 1, position: 'relative', margin: '0',
      background: `linear-gradient(90deg, transparent, ${CF.color.edge} 12%, ${CF.color.edge} 88%, transparent)` }}>
      <div style={{ position: 'absolute', left: '50%', top: -2, width: 5, height: 5, marginLeft: -2.5,
        transform: 'rotate(45deg)', background: CF.color.edgeHi }} />
    </div>
  );
}

// ── nav icons (simple geometry only) ──
function NavIcon({ name, active }) {
  const c = active ? CF.color.text : CF.color.dim;
  const s = { width: 17, height: 17, display: 'block' };
  switch (name) {
    case 'dash': return <svg style={s} viewBox="0 0 16 16"><g fill={c}><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="4" rx="1"/><rect x="9" y="7" width="6" height="8" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/></g></svg>;
    case 'duel': return <svg style={s} viewBox="0 0 16 16"><line x1="3" y1="3" x2="13" y2="13" stroke={CF.color.bull} strokeWidth="2.2" strokeLinecap="round"/><line x1="13" y1="3" x2="3" y2="13" stroke={CF.color.bear} strokeWidth="2.2" strokeLinecap="round"/></svg>;
    case 'mandate': return <svg style={s} viewBox="0 0 16 16"><rect x="1.5" y="3" width="13" height="10" rx="2" fill="none" stroke={c} strokeWidth="1.6"/><line x1="4" y1="6.5" x2="12" y2="6.5" stroke={c} strokeWidth="1.6"/></svg>;
    case 'markets': return <svg style={s} viewBox="0 0 16 16"><g fill={c}><rect x="1" y="8" width="3" height="7" rx="1"/><rect x="6.5" y="4" width="3" height="11" rx="1"/><rect x="12" y="1" width="3" height="14" rx="1"/></g></svg>;
    case 'audit': return <svg style={s} viewBox="0 0 16 16"><g stroke={c} strokeWidth="1.6" strokeLinecap="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="14" y2="8"/><line x1="2" y1="12" x2="10" y2="12"/></g></svg>;
    case 'settings': return <svg style={s} viewBox="0 0 16 16"><circle cx="8" cy="8" r="3" fill="none" stroke={c} strokeWidth="1.6"/><circle cx="8" cy="8" r="6.2" fill="none" stroke={c} strokeWidth="1.6" strokeDasharray="2 3"/></svg>;
    default: return null;
  }
}

const NAV = [
  { name: 'dash', label: 'Dashboard' },
  { name: 'duel', label: 'The Duel' },
  { name: 'mandate', label: 'Mandates' },
  { name: 'markets', label: 'Markets' },
  { name: 'audit', label: 'Audit' },
  { name: 'settings', label: 'Settings' },
];

function Sidebar({ active = 'dash', logoIgnite = 0, glow = 0.55 }) {
  return (
    <aside style={{
      width: 248, flexShrink: 0, height: '100%', background: CF.color.black,
      borderRight: `1px solid ${CF.color.edge}`, display: 'flex', flexDirection: 'column',
      padding: '26px 18px 20px',
    }}>
      {/* lockup */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '0 6px 26px' }}>
        <LogoMark size={30} ignite={logoIgnite} glow={glow} />
        <Wordmark size={18} />
      </div>
      <BeamDivider />

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 22 }}>
        <div style={{ fontFamily: CF.font.mono, fontSize: 10.5, letterSpacing: 2, color: CF.color.dimmer, padding: '0 12px 10px' }}>CONSOLE</div>
        {NAV.map((n) => {
          const on = n.name === active;
          return (
            <div key={n.name} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8,
              background: on ? `color-mix(in oklab, ${CF.color.bull} 9%, transparent)` : 'transparent',
              border: `1px solid ${on ? 'color-mix(in oklab, ' + CF.color.bull + ' 22%, transparent)' : 'transparent'}`,
              color: on ? CF.color.text : CF.color.dim,
              fontFamily: CF.font.display, fontSize: 14.5, fontWeight: on ? 600 : 500,
              position: 'relative', whiteSpace: 'nowrap',
            }}>
              {on && <div style={{ position: 'absolute', left: -18, top: 8, bottom: 8, width: 2.5,
                background: CF.color.bull, borderRadius: 2, boxShadow: `0 0 10px ${CF.color.bull}` }} />}
              <NavIcon name={n.name} active={on} />
              <span>{n.label}</span>
            </div>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <BeamDivider />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 6px' }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: `linear-gradient(135deg, ${CF.color.bullDeep}, ${CF.color.bearDeep})`,
            border: `1px solid ${CF.color.edgeHi}` }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: CF.font.display, fontSize: 13, color: CF.color.text, fontWeight: 600 }}>Connected</div>
            <div style={{ fontFamily: CF.font.mono, fontSize: 11, color: CF.color.dim }}>{short(CF.addr.userEoa, 6, 4)}</div>
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
          padding: '6px 11px', borderRadius: 999, border: `1px solid ${CF.color.edgeHi}`,
          background: CF.color.panel,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: '#0052ff', boxShadow: '0 0 7px #0052ff' }} />
          <span style={{ fontFamily: CF.font.mono, fontSize: 11.5, color: CF.color.text, letterSpacing: 0.3 }}>Base</span>
        </div>
      </div>
    </aside>
  );
}

function KpiCard({ label, children, accent, glow = 0 }) {
  return (
    <div style={{
      flex: 1, background: CF.color.panel, border: `1px solid ${CF.color.edge}`,
      borderRadius: 12, padding: '15px 17px 16px', position: 'relative', overflow: 'hidden',
      boxShadow: glow > 0 && accent ? `inset 0 0 ${30 * glow}px color-mix(in oklab, ${accent} ${18 * glow}%, transparent)` : 'none',
    }}>
      {accent && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2.5, background: accent,
        boxShadow: `0 0 ${10 * (0.4 + glow)}px ${accent}` }} />}
      <div style={{ fontFamily: CF.font.mono, fontSize: 10.5, letterSpacing: 1.6, color: CF.color.dim, marginBottom: 11 }}>{label}</div>
      {children}
    </div>
  );
}

Object.assign(window, { LogoMark, Wordmark, Pill, Bar, BeamDivider, NavIcon, Sidebar, KpiCard });
