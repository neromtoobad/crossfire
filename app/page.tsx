// CROSSFIRE dashboard — the single-page UI.
// Top: wallet connect + 4 live market cards (pick one to grant + run a duel)
// Bottom: live state — your latest duel, position, 1Shot relay, sub-agents
//
// Every number is a real read of Base Sepolia state via viem, or a snapshot
// persisted to .crossfire/state.json by the duel/relay scripts.

import { loadDashboard } from '../lib/dashboard-state.js'
import { readAllMarketsLive, type MarketLive } from '../lib/markets-data.js'
import { ConnectButton } from '../components/ConnectButton'

export const dynamic = 'force-dynamic'

const CF = {
  black: '#000000',
  bg: '#060608',
  panel: '#0c0c11',
  panelHi: '#101017',
  edge: '#1b1b23',
  edgeHi: '#2a2a36',
  text: '#ededf2',
  dim: '#8a8a99',
  dimmer: '#5a5a68',
  bull: '#3bc4ff',
  bullDeep: '#0a3a52',
  bear: '#ff2a4d',
  bearDeep: '#520a17',
  white: '#ffffff',
  amber: '#ffbd45',
  display: "'Space Grotesk', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
}

function LogoMark({ size = 30 }: { size?: number }) {
  // The crossing-beams "X" — Bull blue + Bear red meeting at a white nexus.
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block', overflow: 'visible' }}>
      <line x1="16" y1="16" x2="84" y2="84" stroke={CF.bull} strokeWidth="9" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 6px ${CF.bull})`, opacity: 0.9 }} />
      <line x1="84" y1="16" x2="16" y2="84" stroke={CF.bear} strokeWidth="9" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 6px ${CF.bear})`, opacity: 0.9 }} />
      <circle cx="50" cy="50" r="6" fill={CF.white} style={{ filter: `drop-shadow(0 0 8px ${CF.white})` }} />
    </svg>
  )
}

function Panel({
  title,
  children,
  badge,
}: {
  title: string
  children: React.ReactNode
  badge?: { text: string; color: string }
}) {
  return (
    <section style={{
      background: CF.panel, border: `1px solid ${CF.edge}`, borderRadius: 12,
      padding: 18, marginBottom: 14,
    }}>
      <h2 style={{
        fontFamily: CF.mono, fontSize: 10.5, fontWeight: 600, letterSpacing: 1.6,
        textTransform: 'uppercase', color: CF.dim, margin: '0 0 14px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>{title}</span>
        {badge ? <span style={{ color: badge.color, fontFamily: CF.mono, fontSize: 11 }}>{badge.text}</span> : null}
      </h2>
      {children}
    </section>
  )
}

function Kv({ k, v, mono = true, color }: { k: string; v: React.ReactNode; mono?: boolean; color?: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '7px 0', borderBottom: `1px solid ${CF.edge}`,
    }}>
      <span style={{ color: CF.dim, fontFamily: CF.mono, fontSize: 11, letterSpacing: 0.5 }}>{k}</span>
      <span style={{ color: color ?? CF.text, fontSize: 12, fontFamily: mono ? CF.mono : CF.display }}>{v}</span>
    </div>
  )
}

function Tx({ hash, network = 'sepolia' }: { hash: string; network?: 'sepolia' | 'mainnet' }) {
  if (!hash) return null
  const url = network === 'mainnet'
    ? `https://basescan.org/tx/${hash}`
    : `https://sepolia.basescan.org/tx/${hash}`
  return (
    <a href={url} target="_blank" rel="noreferrer" style={{
      color: CF.bull, textDecoration: 'none', fontFamily: CF.mono, fontSize: 12,
    }}>
      {hash.slice(0, 8)}…{hash.slice(-6)}
    </a>
  )
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div style={{ height: 8, background: CF.edge, borderRadius: 8, overflow: 'visible', marginTop: 6, position: 'relative' }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: `${pct}%`, borderRadius: 8, background: color,
        boxShadow: `0 0 12px color-mix(in oklab, ${color} 55%, transparent)`,
      }} />
    </div>
  )
}

function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: '4px 11px 4px 9px', borderRadius: 999,
      border: `1px solid color-mix(in oklab, ${color} 38%, transparent)`,
      background: `color-mix(in oklab, ${color} 12%, transparent)`,
      color, fontFamily: CF.mono, fontSize: 11, fontWeight: 500, letterSpacing: 0.4,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: 999, background: color,
        boxShadow: `0 0 6px ${color}`,
      }} />
      {text}
    </span>
  )
}

export default async function Dashboard() {
  const [d, markets] = await Promise.all([loadDashboard(), readAllMarketsLive()])
  const remaining = parseFloat(d.balances.userSaUsdc)

  return (
    <main style={{ background: CF.bg, color: CF.text, minHeight: '100vh', padding: 28, maxWidth: 1440, margin: '0 auto' }}>
      {/* ── Hero header — logo + connect ──────────────────────────────── */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <LogoMark size={34} />
          <div>
            <div style={{
              fontFamily: CF.display, fontWeight: 700, fontSize: 22, letterSpacing: 4,
              color: CF.text,
            }}>CROSSFIRE</div>
            <div style={{ fontFamily: CF.mono, fontSize: 11, color: CF.dim, letterSpacing: 0.5, marginTop: 2 }}>
              adversarial agents · chain-enforced mandate · base-sepolia
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <a href="https://github.com/neromtoobad/crossfire" target="_blank" rel="noreferrer" style={{
            padding: '10px 14px', borderRadius: 8, textDecoration: 'none',
            border: `1px solid ${CF.edge}`, color: CF.dim,
            fontFamily: CF.mono, fontSize: 12,
          }}>
            GitHub ↗
          </a>
          <a href="/" style={{
            padding: '10px 14px', borderRadius: 8, textDecoration: 'none',
            border: `1px solid ${CF.edge}`, color: CF.dim,
            fontFamily: CF.mono, fontSize: 12,
          }}>
            ↻ refresh
          </a>
          <ConnectButton variant="primary" />
        </div>
      </header>

      {/* ── PICK A MARKET — 4 live cards ─────────────────────────────── */}
      <section style={{ marginBottom: 24 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12,
        }}>
          <h2 style={{
            fontFamily: CF.display, fontWeight: 700, fontSize: 18, color: CF.text,
            margin: 0, letterSpacing: -0.2,
          }}>
            Pick a market
          </h2>
          <div style={{ fontFamily: CF.mono, fontSize: 11, color: CF.dim }}>
            click any → grant a capped mandate → send the agents
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {markets.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: 20, fontFamily: CF.mono, color: CF.dim, background: CF.panel, border: `1px solid ${CF.edge}`, borderRadius: 12 }}>
              No markets deployed yet. Run <code style={{ color: CF.bull }}>npm run deploy:markets</code>.
            </div>
          ) : (
            markets.map((m) => <MarketCard key={m.id} m={m} />)
          )}
        </div>
      </section>

      {/* ── KPI strip ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 14 }}>
        <Kpi label="ROOT MANDATE" accent={CF.bull}>
          <div style={{ fontFamily: CF.mono, fontSize: 24, fontWeight: 600, color: CF.text }}>
            {remaining.toFixed(2)} <span style={{ color: CF.dim, fontSize: 14 }}>/ 50 USDC</span>
          </div>
          <div style={{ marginTop: 8 }}>
            <Bar value={remaining} max={50} color={CF.bull} />
          </div>
          <div style={{ fontFamily: CF.mono, fontSize: 10.5, color: CF.dim, marginTop: 6 }}>
            remaining · fresh salt resets cap per signing
          </div>
        </Kpi>

        <Kpi label="MARKET" accent={d.latestDuel?.side === 'YES' ? CF.bull : d.latestDuel?.side === 'NO' ? CF.bear : CF.dim}>
          {d.market ? (
            <>
              <div style={{ fontFamily: CF.mono, fontSize: 24, fontWeight: 600, color: CF.text }}>
                P(YES) {d.market.impliedProb.toFixed(3)}
              </div>
              <div style={{ fontFamily: CF.mono, fontSize: 11, color: CF.dim, marginTop: 8 }}>
                YES <span style={{ color: CF.bull }}>{d.market.totalYes}</span> ·
                NO <span style={{ color: CF.bear }}> {d.market.totalNo}</span>
              </div>
            </>
          ) : (
            <div style={{ fontFamily: CF.mono, fontSize: 13, color: CF.dim }}>not deployed</div>
          )}
        </Kpi>

        <Kpi label="LATEST DUEL" accent={d.latestDuel?.abstained ? CF.amber : d.latestDuel?.side === 'YES' ? CF.bull : CF.bear}>
          {d.latestDuel ? (
            <>
              <div style={{ fontFamily: CF.mono, fontSize: 22, fontWeight: 600, color: CF.text }}>
                {d.latestDuel.abstained ? 'ABSTAIN' : d.latestDuel.side}
                <span style={{ color: CF.dim, fontSize: 14, marginLeft: 8 }}>
                  {!d.latestDuel.abstained && `· ${Math.abs(d.latestDuel.netUsdc).toFixed(2)} USDC`}
                </span>
              </div>
              <div style={{ fontFamily: CF.mono, fontSize: 11, color: CF.dim, marginTop: 8 }}>
                Bull <span style={{ color: CF.bull }}>{d.latestDuel.bullStake.toFixed(2)}</span> vs Bear <span style={{ color: CF.bear }}>{d.latestDuel.bearStake.toFixed(2)}</span>
              </div>
            </>
          ) : (
            <div style={{ fontFamily: CF.mono, fontSize: 13, color: CF.dim }}>no duel yet</div>
          )}
        </Kpi>

        <Kpi label="1SHOT MAINNET" accent={CF.bull}>
          {d.latestRelayDispatch ? (
            <>
              <div style={{ fontFamily: CF.mono, fontSize: 14, fontWeight: 600, color: CF.text }}>
                {d.latestRelayDispatch.taskId.slice(0, 10)}…
              </div>
              <div style={{ fontFamily: CF.mono, fontSize: 11, color: CF.dim, marginTop: 8 }}>
                gas paid in USDC · chain {d.latestRelayDispatch.chainId}
              </div>
            </>
          ) : (
            <div style={{ fontFamily: CF.mono, fontSize: 13, color: CF.dim }}>no relay yet</div>
          )}
        </Kpi>
      </div>

      {/* ── The Duel (hero) + side panels ────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        {/* Hero: The Duel */}
        <Panel
          title="The Duel"
          badge={
            d.latestDuel
              ? d.latestDuel.abstained
                ? { text: 'ABSTAIN — market genuinely uncertain', color: CF.amber }
                : { text: `Net ${d.latestDuel.netUsdc.toFixed(2)} USDC → ${d.latestDuel.side}`, color: d.latestDuel.side === 'YES' ? CF.bull : CF.bear }
              : { text: 'no run yet', color: CF.dim }
          }
        >
          {d.latestDuel ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 20, alignItems: 'center', padding: '10px 0 6px' }}>
              {/* BULL */}
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontFamily: CF.display, fontSize: 11, fontWeight: 700, letterSpacing: 3, color: CF.bull }}>BULL</span>
                  <span style={{ fontFamily: CF.mono, fontSize: 10, color: CF.dim }}>YES</span>
                </div>
                <div style={{ fontFamily: CF.mono, fontSize: 34, fontWeight: 600, color: CF.text, letterSpacing: -0.5 }}>
                  {d.latestDuel.bullStake.toFixed(2)}
                  <span style={{ fontSize: 14, color: CF.dim, marginLeft: 6 }}>USDC</span>
                </div>
                <div style={{ marginTop: 10 }}>
                  <Bar value={d.latestDuel.bullStake} max={20} color={CF.bull} />
                </div>
                <div style={{ fontFamily: CF.display, fontSize: 12, color: CF.dim, marginTop: 12, lineHeight: 1.5, minHeight: 50 }}>
                  {d.latestDuel.bullRationale}
                </div>
              </div>

              {/* center crossing-beams + net */}
              <div style={{ textAlign: 'center', padding: '0 8px' }}>
                <LogoMark size={56} />
                <div style={{
                  fontFamily: CF.mono, fontSize: 10, letterSpacing: 2, color: CF.dim, marginTop: 12,
                }}>NET</div>
                <div style={{
                  fontFamily: CF.mono, fontSize: 22, fontWeight: 600,
                  color: d.latestDuel.abstained ? CF.amber : (d.latestDuel.netUsdc > 0 ? CF.bull : CF.bear),
                }}>
                  {d.latestDuel.netUsdc > 0 ? '+' : ''}{d.latestDuel.netUsdc.toFixed(2)}
                </div>
              </div>

              {/* BEAR */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8, justifyContent: 'flex-end' }}>
                  <span style={{ fontFamily: CF.mono, fontSize: 10, color: CF.dim }}>NO</span>
                  <span style={{ fontFamily: CF.display, fontSize: 11, fontWeight: 700, letterSpacing: 3, color: CF.bear }}>BEAR</span>
                </div>
                <div style={{ fontFamily: CF.mono, fontSize: 34, fontWeight: 600, color: CF.text, letterSpacing: -0.5 }}>
                  {d.latestDuel.bearStake.toFixed(2)}
                  <span style={{ fontSize: 14, color: CF.dim, marginLeft: 6 }}>USDC</span>
                </div>
                <div style={{ marginTop: 10 }}>
                  <Bar value={d.latestDuel.bearStake} max={20} color={CF.bear} />
                </div>
                <div style={{ fontFamily: CF.display, fontSize: 12, color: CF.dim, marginTop: 12, lineHeight: 1.5, minHeight: 50 }}>
                  {d.latestDuel.bearRationale}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: CF.dim, fontFamily: CF.mono, fontSize: 13, padding: '24px 0' }}>
              Run <code style={{ color: CF.bull }}>npm run duel</code> to see the duel.
            </div>
          )}

          {!!d.latestDuel && !d.latestDuel.abstained ? (
            <div style={{ marginTop: 14, padding: '12px 14px', background: CF.bg, borderRadius: 8, fontFamily: CF.mono, fontSize: 12, color: CF.dim, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <span>bet transfer · {d.latestDuel.betTransferTx ? <Tx hash={d.latestDuel.betTransferTx} /> : '—'}</span>
              <span>credit · {d.latestDuel.buyOnBehalfTx ? <Tx hash={d.latestDuel.buyOnBehalfTx} /> : '—'}</span>
            </div>
          ) : null}
        </Panel>

        {/* Mandate panel */}
        <Panel
          title="Root mandate"
          badge={{
            text: d.addresses.user.saDeployed ? 'ACTIVE' : 'COUNTERFACTUAL',
            color: d.addresses.user.saDeployed ? CF.bull : CF.amber,
          }}
        >
          <Kv k="user EOA" v={`${d.addresses.user.eoa.slice(0, 6)}…${d.addresses.user.eoa.slice(-4)}`} />
          <Kv k="user SA" v={`${d.addresses.user.sa.slice(0, 6)}…${d.addresses.user.sa.slice(-4)}`} />
          <Kv k="USDC available" v={`${d.balances.userSaUsdc}`} color={CF.bull} />
          <Kv k="ETH (gas)" v={`${Number(d.balances.userSaEth).toFixed(4)}`} />
          <div style={{ marginTop: 14, padding: 12, background: CF.bg, borderRadius: 8, fontFamily: CF.mono, fontSize: 11, color: CF.dim, lineHeight: 1.5 }}>
            One signature → two opposed sub-budgets of <span style={{ color: CF.bull }}>20</span> /
            <span style={{ color: CF.bear }}> 20</span> USDC each.
          </div>
        </Panel>
      </div>

      {/* ── Audit + Market + Relay + Sub-agents ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
        <Panel title="Audit trail (recent duels)">
          {d.recentDuels.length === 0 ? (
            <div style={{ color: CF.dim, fontFamily: CF.mono, fontSize: 12 }}>—</div>
          ) : (
            <table style={{ width: '100%', fontFamily: CF.mono, fontSize: 11, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: CF.dimmer, letterSpacing: 1 }}>
                  <th style={{ textAlign: 'left', padding: '6px 4px' }}>WHEN</th>
                  <th style={{ textAlign: 'left', padding: '6px 4px' }}>SIDE</th>
                  <th style={{ textAlign: 'right', padding: '6px 4px' }}>BULL</th>
                  <th style={{ textAlign: 'right', padding: '6px 4px' }}>BEAR</th>
                  <th style={{ textAlign: 'right', padding: '6px 4px' }}>NET</th>
                  <th style={{ textAlign: 'right', padding: '6px 4px' }}>BET</th>
                </tr>
              </thead>
              <tbody>
                {d.recentDuels.map((duel, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${CF.edge}` }}>
                    <td style={{ padding: '8px 4px', color: CF.dim }}>{new Date(duel.runAt).toLocaleTimeString()}</td>
                    <td style={{ padding: '8px 4px', color: duel.abstained ? CF.amber : duel.side === 'YES' ? CF.bull : CF.bear, fontWeight: 600 }}>
                      {duel.abstained ? 'ABSTAIN' : duel.side}
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', color: CF.bull }}>{duel.bullStake.toFixed(2)}</td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', color: CF.bear }}>{duel.bearStake.toFixed(2)}</td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', color: duel.netUsdc > 0 ? CF.bull : duel.netUsdc < 0 ? CF.bear : CF.dim }}>
                      {duel.netUsdc.toFixed(2)}
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'right' }}>{duel.betTransferTx ? <Tx hash={duel.betTransferTx} /> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="1Shot mainnet relay" badge={d.latestRelayDispatch ? { text: 'DISPATCHED', color: CF.bull } : { text: 'PENDING', color: CF.dim }}>
          {d.latestRelayDispatch ? (
            <>
              <Kv k="TaskId" v={`${d.latestRelayDispatch.taskId.slice(0, 14)}…`} />
              <Kv k="Chain" v={`Base mainnet (${d.latestRelayDispatch.chainId})`} mono={false} />
              <Kv k="Dispatched" v={new Date(d.latestRelayDispatch.dispatchedAt).toLocaleTimeString()} mono={false} />
              <Kv k="On-chain" v={<a href="https://basescan.org/tx/0x5a093da29349a1519e67aed5f0b6a518109ade6fed6a5f53ca35f8d6a1312651" target="_blank" rel="noreferrer" style={{ color: CF.bull, textDecoration: 'none', fontFamily: CF.mono, fontSize: 12 }}>0x5a09…2651 ↗</a>} />
              <div style={{ marginTop: 12, fontFamily: CF.mono, fontSize: 10.5, color: CF.dimmer, letterSpacing: 0.5 }}>WEBHOOK EVENTS</div>
              {d.relayerEvents.length > 0 ? (
                d.relayerEvents.slice(0, 4).map((e, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 11, fontFamily: CF.mono, borderTop: `1px solid ${CF.edge}` }}>
                    <span style={{ color: CF.dim }}>{new Date(e.receivedAt).toLocaleTimeString()}</span>
                    <span style={{ color: e.status === 'Confirmed' ? CF.bull : CF.amber }}>{e.status}</span>
                    <span style={{ color: CF.text }}>{e.taskId.slice(0, 8)}…</span>
                  </div>
                ))
              ) : (
                <div style={{ color: CF.dimmer, fontFamily: CF.mono, fontSize: 11, padding: '6px 0' }}>polled (no live webhook)</div>
              )}
            </>
          ) : (
            <div style={{ color: CF.dim, fontFamily: CF.mono, fontSize: 12 }}>
              Run <code style={{ color: CF.bull }}>npm run relay:bet</code> for the mainnet proof.
            </div>
          )}
        </Panel>

        <Panel title="Sub-agents">
          <Kv k="ORCH EOA" v={`${d.addresses.orch.eoa.slice(0, 6)}…${d.addresses.orch.eoa.slice(-4)}`} />
          <Kv k="↳ USDC" v={d.balances.orchEoaUsdc} />
          <Kv k="BULL EOA" v={`${d.addresses.bull.eoa.slice(0, 6)}…${d.addresses.bull.eoa.slice(-4)}`} color={CF.bull} />
          <Kv k="↳ USDC" v={d.balances.bullEoaUsdc} color={CF.bull} />
          <Kv k="BEAR EOA" v={`${d.addresses.bear.eoa.slice(0, 6)}…${d.addresses.bear.eoa.slice(-4)}`} color={CF.bear} />
          <Kv k="↳ USDC" v={d.balances.bearEoaUsdc} color={CF.bear} />
        </Panel>

        {d.market ? (
          <Panel title="Binary market" badge={{ text: `P(YES) = ${d.market.impliedProb.toFixed(3)}`, color: CF.bull }}>
            <Kv k="market" v={`${d.market.address?.slice(0, 6)}…${d.market.address?.slice(-4)}`} />
            <Kv k="question" v={d.market.question ?? '—'} mono={false} />
            <Kv k="closes" v={d.market.closeTime ? new Date(d.market.closeTime).toLocaleString() : '—'} mono={false} />
            <Kv k="total YES" v={`${d.market.totalYes}`} color={CF.bull} />
            <Kv k="total NO" v={`${d.market.totalNo}`} color={CF.bear} />
            <Kv k="USER SA position" v={`YES ${d.market.userSaPosition.yes} · NO ${d.market.userSaPosition.no}`} />
          </Panel>
        ) : (
          <Panel title="Binary market" badge={{ text: 'NOT DEPLOYED', color: CF.amber }}>
            <div style={{ color: CF.dim, fontFamily: CF.mono, fontSize: 12 }}>
              Run <code style={{ color: CF.bull }}>npm run deploy:market</code>.
            </div>
          </Panel>
        )}
      </div>

      <footer style={{
        marginTop: 18, paddingTop: 14, borderTop: `1px solid ${CF.edge}`,
        fontFamily: CF.mono, fontSize: 10.5, color: CF.dimmer, textAlign: 'center', letterSpacing: 0.5,
      }}>
        no code stops this · the chain does · generated {new Date(d.generatedAt).toLocaleTimeString()} · proof in PROOF.md
      </footer>
    </main>
  )
}

function MarketCard({ m }: { m: MarketLive }) {
  const yesPct = Math.round(m.impliedProbYes * 100)
  const isYesFavoured = m.impliedProbYes >= 0.5
  const lead = isYesFavoured ? CF.bull : CF.bear
  return (
    <a href={`/market/${m.id}`} style={{
      display: 'block', padding: '18px 18px 16px',
      background: CF.panel, border: `1px solid ${CF.edge}`, borderRadius: 12,
      textDecoration: 'none', color: CF.text, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 2.5,
        background: lead, boxShadow: `0 0 10px ${lead}`,
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ fontFamily: CF.display, fontSize: 15, fontWeight: 600, color: CF.text, lineHeight: 1.35, paddingRight: 12, flex: 1 }}>
          {m.title}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: CF.mono, fontSize: 22, fontWeight: 600, color: lead, letterSpacing: -0.5 }}>
            {yesPct}<span style={{ fontSize: 13, color: CF.dim }}>%</span>
          </div>
          <div style={{ fontFamily: CF.mono, fontSize: 9.5, color: CF.dim, letterSpacing: 1, marginTop: 2 }}>P(YES)</div>
        </div>
      </div>
      <div style={{ height: 5, background: CF.edge, borderRadius: 6, overflow: 'hidden', display: 'flex', marginBottom: 8 }}>
        <div style={{ width: `${yesPct}%`, background: CF.bull, boxShadow: `0 0 6px ${CF.bull}` }} />
        <div style={{ width: `${100 - yesPct}%`, background: CF.bear, boxShadow: `0 0 6px ${CF.bear}` }} />
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: CF.mono, fontSize: 10.5, color: CF.dim,
      }}>
        <span>YES <span style={{ color: CF.bull }}>{m.totalYes}</span> · NO <span style={{ color: CF.bear }}>{m.totalNo}</span></span>
        <span style={{ color: lead, fontFamily: CF.display, fontWeight: 600, fontSize: 11.5 }}>
          send agents →
        </span>
      </div>
    </a>
  )
}

function Kpi({
  label,
  accent,
  children,
}: {
  label: string
  accent: string
  children: React.ReactNode
}) {
  return (
    <div style={{
      background: CF.panel, border: `1px solid ${CF.edge}`, borderRadius: 12,
      padding: '15px 17px 16px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 2.5,
        background: accent, boxShadow: `0 0 10px ${accent}`,
      }} />
      <div style={{
        fontFamily: CF.mono, fontSize: 10.5, letterSpacing: 1.6, color: CF.dim, marginBottom: 11,
      }}>{label}</div>
      {children}
    </div>
  )
}
