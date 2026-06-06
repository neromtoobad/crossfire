// cf-scenes.jsx — timeline state, modal, captions, camera, outro, root App.
const { CF, short, LogoMark, Wordmark, Pill, Bar, Dashboard,
        Stage, Sprite, useTime, Easing, interpolate, animate, clamp } = window;

// ── master state machine: everything is a pure function of time t ──
function computeState(t) {
  // mandate / grant modal
  const modalIn  = animate({ from: 0, to: 1, start: 4.8, end: 5.5, ease: Easing.easeOutCubic })(t);
  const modalOut = animate({ from: 0, to: 1, start: 9.5, end: 10.1, ease: Easing.easeInCubic })(t);
  const modal = modalIn * (1 - modalOut);
  const signing = t > 7.5 && t < 8.4 ? 1 : 0;
  const signed = animate({ from: 0, to: 1, start: 8.4, end: 8.9, ease: Easing.easeOutCubic })(t);
  const grantGlow = clamp(modal * (0.4 + signing * 0.6 + signed * 0.4), 0, 1);

  // duel — stakes climb
  const bull = animate({ from: 0, to: CF.duel.bull.stake, start: 11.0, end: 13.4, ease: Easing.easeOutCubic })(t);
  const bear = animate({ from: 0, to: CF.duel.bear.stake, start: 11.2, end: 14.4, ease: Easing.easeOutCubic })(t);
  const evidProg = animate({ from: 0, to: 1, start: 11.0, end: 14.2, ease: Easing.easeOutQuad })(t);
  const evidence = evidProg * CF.mandate.evidence;
  const bullUsed = evidProg * 1.0 + bull;
  const bearUsed = evidProg * 1.0 + bear;
  const bullBar = clamp(bullUsed / CF.duel.bull.cap * 100, 0, 100);
  const bearBar = clamp(bearUsed / CF.duel.bear.cap * 100, 0, 100);
  const bullEnergy = clamp(bull / CF.duel.bull.stake, 0, 1);
  const bearEnergy = clamp(bear / CF.duel.bear.stake, 0, 1);
  const sum = bull + bear;
  const leanRaw = sum > 0.01 ? (bear - bull) / sum : 0;       // + = Bear
  const lean = leanRaw * clamp((t - 11.5) / 2, 0, 1);

  const netReveal = animate({ from: 0, to: 1, start: 14.8, end: 16.2, ease: Easing.easeOutCubic })(t);
  const ignite = animate({ from: 0, to: 1, start: 16.8, end: 17.4, ease: Easing.easeOutCubic })(t);

  // spend reflected on KPI / mandate
  const betSpent = ignite * CF.duel.betSize;
  const remaining = t < 8.9 ? CF.mandate.cap : (CF.mandate.cap - evidence - betSpent);
  const spendGlow = clamp((bull + bear) / 11.6 * 0.5 * (1 - ignite * 0.3), 0, 0.5);

  // refused beat
  const refused = animate({ from: 0, to: 1, start: 19.6, end: 20.4, ease: Easing.easeOutCubic })(t)
                * (1 - animate({ from: 0, to: 1, start: 26.5, end: 27.2, ease: Easing.easeInCubic })(t));
  const refusedRow = animate({ from: 0, to: 1, start: 22.9, end: 23.6, ease: Easing.easeOutBack })(t)
                   * (1 - animate({ from: 0, to: 1, start: 26.6, end: 27.2, ease: Easing.easeInCubic })(t));
  const refusedFlash = (t > 19.6 && t < 20.6) ? Math.max(0, Math.sin((t - 19.6) / 1.0 * Math.PI)) : 0;

  // outro
  const outro = animate({ from: 0, to: 1, start: 27.2, end: 28.4, ease: Easing.easeOutCubic })(t);
  const logoIgnite = 0.10 + 0.06 * Math.sin(t * 1.4);

  // expiry clock
  let esec = 86399 - Math.floor(Math.max(0, t) * 2.5);
  if (esec < 0) esec = 0;
  const expiry = [esec / 3600, (esec % 3600) / 60, esec % 60].map((x) => String(Math.floor(x)).padStart(2, '0')).join(':');

  return {
    modal, signing, signed, grantGlow,
    bull, bear, evidence, bullBar, bearBar, bullEnergy, bearEnergy, lean,
    netReveal, ignite, remaining, spendGlow,
    refused, refusedRow, refusedFlash, outro, logoIgnite, expiry,
    duelFocus: t > 10.6 && t < 19.4,
  };
}

// ── camera ──
const CAM_T  = [0,   4.2,  5.0,  9.4,  10.8, 12.2, 18.8, 19.6, 22.6, 23.5, 26.4, 27.3, 30];
const CAM_Z  = [1.00,1.045,1.00, 1.00, 1.05, 1.34, 1.34, 1.50, 1.48, 1.50, 1.50, 0.96, 0.96];
const CAM_X  = [960, 960,  960,  960,  1010, 1084, 1084, 1084, 1084, 745,  745,  960,  960];
const CAM_Y  = [540, 540,  540,  540,  510,  475,  475,  458,  458,  760,  760,  540,  540];
const camZ = interpolate(CAM_T, CAM_Z, Easing.easeInOutCubic);
const camX = interpolate(CAM_T, CAM_X, Easing.easeInOutCubic);
const camY = interpolate(CAM_T, CAM_Y, Easing.easeInOutCubic);

// ── grant-mandate modal ──
function GrantModal({ s }) {
  if (s.modal < 0.01) return null;
  const k = Easing.easeOutCubic(s.modal);
  const Field = ({ label, value, fill, accent }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: CF.font.mono, fontSize: 11, letterSpacing: 1, color: CF.color.dim }}>{label}</span>
        <span style={{ fontFamily: CF.font.mono, fontSize: 13, color: CF.color.text, fontWeight: 600 }}>{value}</span>
      </div>
      {fill != null && (
        <div style={{ height: 6, background: CF.color.edge, borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ width: `${fill}%`, height: '100%', background: accent || CF.color.bull,
            boxShadow: `0 0 10px ${accent || CF.color.bull}` }} />
        </div>
      )}
    </div>
  );
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `rgba(0,0,0,${0.66 * s.modal})`, backdropFilter: `blur(${3 * s.modal}px)` }}>
      <div style={{ width: 460, background: CF.color.panelHi, border: `1px solid ${CF.color.edgeHi}`,
        borderRadius: 18, padding: '26px 28px 24px', transform: `translateY(${(1 - k) * 40}px) scale(${0.96 + k * 0.04})`,
        opacity: s.modal, boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 50px color-mix(in oklab, ${CF.color.bull} 12%, transparent)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 22 }}>
          <LogoMark size={26} ignite={s.signed} glow={0.6} />
          <span style={{ fontFamily: CF.font.display, fontWeight: 700, fontSize: 18, letterSpacing: 2, color: CF.color.text }}>GRANT MANDATE</span>
        </div>
        <Field label="CAP" value="50.00 USDC" fill={100} accent={CF.color.bull} />
        <Field label="DURATION" value="24 hours" fill={62} accent={CF.color.dim} />
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: CF.font.mono, fontSize: 11, letterSpacing: 1, color: CF.color.dim, marginBottom: 8 }}>MARKET</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            border: `1px solid ${CF.color.edgeHi}`, borderRadius: 9, padding: '11px 13px',
            fontFamily: CF.font.display, fontSize: 13.5, color: CF.color.text }}>
            <span>{CF.market}</span>
            <span style={{ color: CF.color.dim, fontFamily: CF.font.mono }}>&#9662;</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 7, marginBottom: 20 }}>
          <span style={{ fontFamily: CF.font.mono, fontSize: 10.5, color: CF.color.dim }}>allowed targets:</span>
          {['USDC', 'MARKET'].map((x) => (
            <span key={x} style={{ fontFamily: CF.font.mono, fontSize: 10, color: CF.color.dim,
              border: `1px solid ${CF.color.edge}`, borderRadius: 5, padding: '2px 7px' }}>{x}</span>
          ))}
        </div>
        {/* sign button / state */}
        <div style={{ borderRadius: 11, padding: '14px 0', textAlign: 'center',
          background: s.signed > 0.5 ? `color-mix(in oklab, ${CF.color.bull} 14%, transparent)` : `color-mix(in oklab, ${CF.color.bull} ${18 + s.grantGlow * 14}%, transparent)`,
          border: `1px solid color-mix(in oklab, ${CF.color.bull} ${45 + s.grantGlow * 30}%, transparent)`,
          color: CF.color.bull, fontFamily: CF.font.display, fontWeight: 700, fontSize: 15, letterSpacing: 1.5,
          boxShadow: `0 0 ${20 * s.grantGlow}px color-mix(in oklab, ${CF.color.bull} 40%, transparent)` }}>
          {s.signed > 0.5
            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
                <span style={{ width: 16, height: 16, borderRadius: 999, background: CF.color.bull, color: CF.color.black,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>&#10003;</span>
                MANDATE ACTIVE &middot; ERC-7710
              </span>
            : s.signing ? 'WAITING FOR SIGNATURE…' : 'SIGN'}
        </div>
        <div style={{ marginTop: 14, fontFamily: CF.font.mono, fontSize: 10.5, lineHeight: 1.5, color: CF.color.dim, textAlign: 'center' }}>
          one signature &middot; a capped, expiring budget &middot; the chain enforces every limit
        </div>
      </div>
    </div>
  );
}

// ── kicker caption (lower third, mono, with X tick) ──
function Caption({ text, color = CF.color.dim, accent }) {
  const { progress, duration, localTime } = window.useSprite();
  const enter = clamp(localTime / 0.5, 0, 1);
  const exit = clamp((duration - localTime) / 0.4, 0, 1);
  const op = Math.min(enter, exit);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 64, display: 'flex', justifyContent: 'center',
      opacity: op, transform: `translateY(${(1 - enter) * 10}px)` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '10px 22px', borderRadius: 999,
        background: 'rgba(6,6,8,0.72)', border: `1px solid ${CF.color.edge}`, backdropFilter: 'blur(6px)' }}>
        <LogoMark size={16} glow={0.5} lean={accent === CF.color.bear ? 0.6 : 0} ignite={accent === CF.color.white ? 0.8 : 0} />
        <span style={{ fontFamily: CF.font.mono, fontSize: 15, letterSpacing: 2.5, color, fontWeight: 500 }}>{text}</span>
      </div>
    </div>
  );
}

// ── outro veil ──
function Outro({ s }) {
  if (s.outro < 0.01) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 26,
      background: `rgba(2,2,4,${0.93 * s.outro})`, opacity: s.outro }}>
      <LogoMark size={120} ignite={clamp(s.outro * 0.9, 0, 1)} glow={0.8} />
      <Wordmark size={46} />
      <div style={{ fontFamily: CF.font.mono, fontSize: 16, letterSpacing: 3, color: CF.color.dim, marginTop: 4 }}>
        NO CODE STOPS THIS. THE CHAIN DOES.
      </div>
    </div>
  );
}

// ── full-frame tints ──
function FrameFX({ s }) {
  return (
    <React.Fragment>
      {/* permanent vignette */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        boxShadow: 'inset 0 0 200px rgba(0,0,0,0.55)' }} />
      {/* refused red flash */}
      {s.refusedFlash > 0.01 && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(120% 100% at 50% 50%, transparent 40%, color-mix(in oklab, ${CF.color.bear} ${28 * s.refusedFlash}%, transparent) 100%)` }} />
      )}
      {s.refused > 0.05 && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
          boxShadow: `inset 0 0 160px color-mix(in oklab, ${CF.color.bear} ${22 * s.refused}%, transparent)` }} />
      )}
    </React.Fragment>
  );
}

function Scene() {
  const t = useTime();
  const tl = window.useTimeline();
  React.useEffect(() => {
    window.__cfSeek = (to) => { tl.setPlaying(false); tl.setTime(to); };
  }, [tl]);
  const s = computeState(t);
  const z = camZ(t), cx = camX(t), cy = camY(t);
  const tx = 960 - z * cx, ty = 540 - z * cy;
  return (
    <div style={{ position: 'absolute', inset: 0, background: CF.color.black, overflow: 'hidden' }}>
      {/* camera layer */}
      <div style={{ position: 'absolute', width: 1920, height: 1080, transformOrigin: '0 0',
        transform: `translate(${tx}px, ${ty}px) scale(${z})`, willChange: 'transform' }}>
        <Dashboard s={s} />
      </div>

      {/* fixed overlays */}
      <FrameFX s={s} />
      <GrantModal s={s} />

      <Sprite start={0.8} end={4.3}><Caption text="ONE MANDATE · TWO AGENTS · THE CHAIN DECIDES" /></Sprite>
      <Sprite start={5.6} end={9.3}><Caption text="ONE SIGNATURE — A CAPPED, EXPIRING BUDGET" accent={CF.color.bull} color={CF.color.bull} /></Sprite>
      <Sprite start={11.4} end={16.4}><Caption text="CONVICTION IS COSTLY — THE BET IS THE NET" /></Sprite>
      <Sprite start={17.3} end={19.2}><Caption text="NET −4.00 USDC → NO BET PLACED" accent={CF.color.white} color={CF.color.white} /></Sprite>
      <Sprite start={20.4} end={22.9}><Caption text="OVER BUDGET? THE CHAIN REFUSES — NOT CODE" accent={CF.color.bear} color={CF.color.bear} /></Sprite>

      <Outro s={s} />

      {/* timestamp label for comments */}
      <div data-video-root data-screen-label={`t=${t.toFixed(1)}s`} style={{ display: 'none' }} />
    </div>
  );
}

function App() {
  return (
    <Stage width={1920} height={1080} duration={30} background={CF.color.black} persistKey="crossfire" fps={60}>
      <Scene />
    </Stage>
  );
}

window.useSprite = window.useSprite; // ensure available
Object.assign(window, { computeState, Scene, App });
