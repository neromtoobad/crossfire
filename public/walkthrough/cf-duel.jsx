// cf-duel.jsx — "The Duel": Bull vs Bear panels + the crossing-beams nexus.
const { CF, short, LogoMark, Pill, Bar } = window;

// One agent panel (Bull = blue/YES on the left, Bear = red/NO on the right).
function DuelAgent({ side, stake, usedPct, energy, won, dim }) {
  const isBull = side === 'bull';
  const c = isBull ? CF.color.bull : CF.color.bear;
  const d = isBull ? CF.duel.bull : CF.duel.bear;
  const deep = isBull ? CF.color.bullDeep : CF.color.bearDeep;
  const align = isBull ? 'flex-start' : 'flex-end';
  const txt = isBull ? 'left' : 'right';
  const lit = 0.35 + energy * 0.65;
  return (
    <div style={{
      width: 372, flexShrink: 0, alignSelf: 'stretch',
      background: `linear-gradient(${isBull ? 135 : 225}deg, color-mix(in oklab, ${deep} ${28 + energy * 22}%, ${CF.color.panel}) 0%, ${CF.color.panel} 62%)`,
      border: `1px solid color-mix(in oklab, ${c} ${22 + energy * 30}%, ${CF.color.edge})`,
      borderRadius: 14, padding: '20px 22px', display: 'flex', flexDirection: 'column',
      alignItems: align, textAlign: txt, position: 'relative', overflow: 'hidden',
      boxShadow: won ? `inset 0 0 60px color-mix(in oklab, ${c} 26%, transparent)` : 'none',
      opacity: dim ? 0.5 : 1,
    }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexDirection: isBull ? 'row' : 'row-reverse' }}>
        <span style={{ width: 9, height: 9, borderRadius: 999, background: c, boxShadow: `0 0 ${10 * lit}px ${c}` }} />
        <span style={{ fontFamily: CF.font.display, fontWeight: 700, fontSize: 18, letterSpacing: 3, color: c }}>
          {isBull ? 'BULL' : 'BEAR'}
        </span>
        <span style={{ fontFamily: CF.font.mono, fontSize: 11, color: CF.color.dim, letterSpacing: 1 }}>
          ARGUES {d.side}
        </span>
      </div>

      {/* stake */}
      <div style={{ marginTop: 22 }}>
        <div style={{ fontFamily: CF.font.mono, fontSize: 10.5, letterSpacing: 1.6, color: CF.color.dim }}>COMMITTED STAKE</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flexDirection: isBull ? 'row' : 'row-reverse', marginTop: 4 }}>
          <span style={{ fontFamily: CF.font.mono, fontWeight: 700, fontSize: 46, color: won ? CF.color.white : c, lineHeight: 1,
            textShadow: won ? `0 0 22px ${c}` : 'none', fontVariantNumeric: 'tabular-nums' }}>
            {stake.toFixed(2)}
          </span>
          <span style={{ fontFamily: CF.font.mono, fontSize: 15, color: CF.color.dim }}>USDC</span>
        </div>
      </div>

      {/* budget bar */}
      <div style={{ width: '100%', marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
          <span style={{ fontFamily: CF.font.mono, fontSize: 10.5, color: CF.color.dim, letterSpacing: 1 }}>SUB-BUDGET</span>
          <span style={{ fontFamily: CF.font.mono, fontSize: 11, color: CF.color.text }}>
            {(d.cap * usedPct / 100).toFixed(2)} / {d.cap.toFixed(2)}
          </span>
        </div>
        <Bar pct={usedPct} color={c} height={7} glow={lit} />
      </div>

      {/* rationale */}
      <div style={{ width: '100%', marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexDirection: isBull ? 'row' : 'row-reverse', marginBottom: 7 }}>
          <span style={{ fontFamily: CF.font.mono, fontSize: 9.5, letterSpacing: 1.4, color: c, opacity: 0.85,
            border: `1px solid color-mix(in oklab, ${c} 35%, transparent)`, padding: '2px 6px', borderRadius: 4 }}>VENICE</span>
        </div>
        <p style={{ margin: 0, fontFamily: CF.font.display, fontSize: 13, lineHeight: 1.5, color: CF.color.dim,
          textWrap: 'pretty', maxWidth: 300 }}>{d.rationale}</p>
      </div>

      {/* verdict card */}
      <div style={{ width: '100%', marginTop: 'auto', paddingTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexDirection: isBull ? 'row' : 'row-reverse',
          background: `color-mix(in oklab, ${c} ${6 + energy * 6}%, ${CF.color.panelHi})`,
          border: `1px solid color-mix(in oklab, ${c} ${won ? 50 : 20}%, ${CF.color.edge})`,
          borderRadius: 11, padding: '12px 14px',
          boxShadow: won ? `0 0 22px color-mix(in oklab, ${c} 30%, transparent)` : 'none' }}>
          <div style={{ textAlign: txt }}>
            <div style={{ fontFamily: CF.font.mono, fontSize: 9.5, letterSpacing: 1.4, color: CF.color.dim }}>VERDICT</div>
            <div style={{ fontFamily: CF.font.display, fontWeight: 700, fontSize: 22, letterSpacing: 1,
              color: won ? CF.color.white : c, marginTop: 2, textShadow: won ? `0 0 14px ${c}` : 'none' }}>{d.side}</div>
          </div>
          <div style={{ textAlign: isBull ? 'right' : 'left' }}>
            <div style={{ fontFamily: CF.font.mono, fontSize: 10, color: CF.color.dim }}>est P</div>
            <div style={{ fontFamily: CF.font.mono, fontWeight: 700, fontSize: 16, color: c, marginTop: 2 }}>{d.est.toFixed(2)}</div>
            <div style={{ width: 70, marginTop: 6 }}><Bar pct={d.est * 100} color={c} height={4} glow={lit} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// The crossing beams + nexus. lean: -1 (Bull) .. +1 (Bear). ignite 0..1. refused 0..1.
function CrossBeams({ bullEnergy = 0, bearEnergy = 0, lean = 0, ignite = 0, netReveal = 0, refused = 0 }) {
  const W = 560, H = 430;
  const len = 600, ang = 33;
  const nexusX = lean * 26; // shift toward dominant side
  const nexBase = Math.abs(lean) < 0.05 ? CF.color.dim : (lean < 0 ? CF.color.bull : CF.color.bear);
  const nexColor = ignite > 0.02 ? `color-mix(in oklab, #fff ${ignite * 100}%, ${nexBase})` : nexBase;
  const nexR = 12 + Math.abs(lean) * 5 + ignite * 16;
  const nexGlow = (10 + Math.abs(lean) * 16 + ignite * 70);
  const refC = CF.color.bear;

  const beam = (color, energy, rot) => ({
    position: 'absolute', left: '50%', top: '50%', width: len, height: 3 + energy * 3,
    marginTop: -(3 + energy * 3) / 2, marginLeft: -len / 2,
    transform: `translateX(${nexusX}px) rotate(${rot}deg)`,
    background: `linear-gradient(90deg, transparent 0%, color-mix(in oklab, ${color} ${20 + energy * 40}%, transparent) 30%, ${color} 50%, color-mix(in oklab, ${color} ${20 + energy * 40}%, transparent) 70%, transparent 100%)`,
    boxShadow: `0 0 ${8 + energy * 22}px color-mix(in oklab, ${color} ${30 + energy * 50}%, transparent)`,
    opacity: 0.55 + energy * 0.45, borderRadius: 4,
  });

  return (
    <div style={{ width: W, height: H, position: 'relative', flex: 1, alignSelf: 'stretch',
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* dark backing so nexus + label stay legible over the beams */}
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 360, height: 320,
        transform: 'translate(-50%, -34%)', pointerEvents: 'none',
        background: 'radial-gradient(closest-side, rgba(2,2,5,0.7), transparent 72%)' }} />
      {/* beams */}
      <div style={beam(CF.color.bull, bullEnergy, -ang)} />
      <div style={beam(CF.color.bear, bearEnergy, ang)} />

      {/* refused red cage flash overlay */}
      {refused > 0.01 && (
        <div style={{ position: 'absolute', inset: -20, borderRadius: 20,
          boxShadow: `inset 0 0 ${80 * refused}px color-mix(in oklab, ${refC} ${50 * refused}%, transparent)`,
          border: `1px solid color-mix(in oklab, ${refC} ${60 * refused}%, transparent)`, pointerEvents: 'none' }} />
      )}

      {/* nexus */}
      <div style={{ position: 'absolute', left: '50%', top: '50%',
        transform: `translate(calc(-50% + ${nexusX}px), -50%)`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* ignite ring */}
        {ignite > 0.02 && (
          <div style={{ position: 'absolute', width: nexR * 2 + 40 * ignite, height: nexR * 2 + 40 * ignite,
            borderRadius: 999, border: `2px solid color-mix(in oklab, #fff ${70 * ignite}%, transparent)`,
            opacity: 1 - ignite * 0.4 }} />
        )}
        <div style={{ width: nexR * 2, height: nexR * 2, borderRadius: 999, background: nexColor,
          boxShadow: `0 0 ${nexGlow}px ${nexColor}, 0 0 ${nexGlow * 2}px color-mix(in oklab, ${nexColor} 50%, transparent)` }} />
      </div>

      {/* nexus label / net readout */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, ${nexR + 26}px)`,
        textAlign: 'center', width: 320 }}>
        {refused > 0.3 ? (
          <div style={{ opacity: refused }}>
            <div style={{ fontFamily: CF.font.mono, fontSize: 13, fontWeight: 700, color: refC, letterSpacing: 1,
              textShadow: `0 0 16px ${refC}` }}>REFUSED ON-CHAIN</div>
            <div style={{ fontFamily: CF.font.mono, fontSize: 11, color: 'color-mix(in oklab, #fff 70%, ' + refC + ')', marginTop: 6 }}>
              {CF.enforcer}
            </div>
          </div>
        ) : ignite > 0.25 ? (
          <div style={{ opacity: Math.min(1, ignite * 1.4) }}>
            <div style={{ fontFamily: CF.font.display, fontWeight: 700, fontSize: 20, color: CF.color.white, letterSpacing: 2,
              textShadow: '0 0 20px #fff' }}>NO &middot; BET PLACED</div>
            <div style={{ fontFamily: CF.font.mono, fontSize: 13, color: CF.color.bear, marginTop: 5 }}>
              4.00 USDC &middot; net of conviction
            </div>
          </div>
        ) : netReveal > 0.02 ? (
          <div style={{ opacity: netReveal }}>
            <div style={{ fontFamily: CF.font.mono, fontSize: 11, letterSpacing: 1.5, color: CF.color.dim }}>NET CONVICTION</div>
            <div style={{ fontFamily: CF.font.mono, fontWeight: 700, fontSize: 22, color: CF.color.bear, marginTop: 3 }}>
              &minus;4.00 <span style={{ fontSize: 13, color: CF.color.dim }}>USDC &rarr; NO</span>
            </div>
          </div>
        ) : (
          <div style={{ opacity: 0.5 }}>
            <div style={{ fontFamily: CF.font.mono, fontSize: 11, letterSpacing: 1.5, color: CF.color.dim }}>UNDECIDED</div>
          </div>
        )}
      </div>
    </div>
  );
}

// Full duel hero block.
function DuelHero({ s }) {
  const won = s.ignite > 0.4;
  return (
    <section style={{
      background: `radial-gradient(120% 90% at 50% 30%, ${CF.color.panelHi} 0%, ${CF.color.panel} 55%, ${CF.color.bg} 100%)`,
      border: `1px solid ${CF.color.edge}`, borderRadius: 16, padding: '20px 24px 22px',
      display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, position: 'relative', overflow: 'hidden',
    }}>
      {/* header strip */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ fontFamily: CF.font.display, fontWeight: 700, fontSize: 15, letterSpacing: 3, color: CF.color.text, whiteSpace: 'nowrap' }}>THE DUEL</span>
          <span style={{ fontFamily: CF.font.mono, fontSize: 11.5, color: CF.color.dim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{CF.market}</span>
        </div>
        {won
          ? <Pill kind="white" label="RESOLVED" glow={s.ignite} />
          : s.refused > 0.3
            ? <Pill kind="refused" label="ENFORCER REFUSED" glow={s.refused} />
            : <Pill kind="pending" label="LIVE" glow={0.4} />}
      </div>

      <div style={{ display: 'flex', alignItems: 'stretch', gap: 18, flex: 1, minHeight: 0 }}>
        <DuelAgent side="bull" stake={s.bull} usedPct={s.bullBar} energy={s.bullEnergy} won={won && CF.duel.winner === 'YES'} dim={s.refused > 0.4} />
        <CrossBeams bullEnergy={s.bullEnergy} bearEnergy={s.bearEnergy} lean={s.lean} ignite={s.ignite} netReveal={s.netReveal} refused={s.refused} />
        <DuelAgent side="bear" stake={s.bear} usedPct={s.bearBar} energy={s.bearEnergy} won={won && CF.duel.winner === 'NO'} dim={s.refused > 0.4} />
      </div>

      {/* footer: settlement tx */}
      <div style={{ height: 20, marginTop: 8, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {s.ignite > 0.6 && s.refused < 0.2 && (
          <div style={{ fontFamily: CF.font.mono, fontSize: 11, color: CF.color.dim, opacity: Math.min(1, (s.ignite - 0.6) * 3) }}>
            bet redeemed through Bear&rsquo;s chain &middot; <span style={{ color: CF.color.bull }}>{short(CF.tx.betTransfer, 8, 6)}</span>
          </div>
        )}
        {s.refused > 0.4 && (
          <div style={{ fontFamily: CF.font.mono, fontSize: 11, color: CF.color.bear, opacity: s.refused }}>
            over-cap redemption 60.00 &gt; 50.00 &middot; reverted at the caveat enforcer &middot; no gas spent
          </div>
        )}
      </div>
    </section>
  );
}

Object.assign(window, { DuelAgent, CrossBeams, DuelHero });
