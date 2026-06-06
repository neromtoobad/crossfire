// Phase 5 — Prompt 5.4. The dashboard.
//
// Server component. Every number comes from a real call — viem reads of the
// USER SA / market / EOAs on Base Sepolia, plus persisted duel snapshots
// from .crossfire/state.json. No fabricated data.
//
// Refresh on demand (top-right button reloads the page). Phase 6 polish can
// add live SSE pushes from the webhook.

import { loadDashboard } from '../lib/dashboard-state.js'

export const dynamic = 'force-dynamic'  // always fetch fresh on each request

const COLORS = {
  bg: '#08080a',
  panel: '#101015',
  panelEdge: '#1d1d24',
  text: '#e9e9ef',
  textDim: '#7d7d8c',
  green: '#43d9a6',
  red: '#ff5d5d',
  amber: '#ffbd45',
  blue: '#4ec1ff',
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
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
    <section
      style={{
        background: COLORS.panel,
        border: `1px solid ${COLORS.panelEdge}`,
        borderRadius: 10,
        padding: 18,
        marginBottom: 14,
      }}
    >
      <h2
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          color: COLORS.textDim,
          margin: '0 0 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>{title}</span>
        {badge ? (
          <span style={{ color: badge.color, fontSize: 11 }}>{badge.text}</span>
        ) : null}
      </h2>
      {children}
    </section>
  )
}

function Kv({ k, v, mono = true, color }: { k: string; v: React.ReactNode; mono?: boolean; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px dashed ${COLORS.panelEdge}` }}>
      <span style={{ color: COLORS.textDim, fontSize: 12 }}>{k}</span>
      <span style={{ color: color ?? COLORS.text, fontSize: 12, fontFamily: mono ? COLORS.mono : 'inherit' }}>{v}</span>
    </div>
  )
}

function Tx({ hash, network = 'sepolia' }: { hash: string; network?: 'sepolia' | 'mainnet' }) {
  if (!hash) return null
  const url = network === 'mainnet'
    ? `https://basescan.org/tx/${hash}`
    : `https://sepolia.basescan.org/tx/${hash}`
  return (
    <a href={url} target="_blank" rel="noreferrer" style={{ color: COLORS.blue, textDecoration: 'none', fontFamily: COLORS.mono, fontSize: 12 }}>
      {hash.slice(0, 8)}…{hash.slice(-6)}
    </a>
  )
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div style={{ height: 8, background: COLORS.panelEdge, borderRadius: 4, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 200ms' }} />
    </div>
  )
}

export default async function Dashboard() {
  const d = await loadDashboard()

  return (
    <main style={{ background: COLORS.bg, color: COLORS.text, minHeight: '100vh', padding: 32, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: -0.3 }}>CROSSFIRE</h1>
          <div style={{ color: COLORS.textDim, fontSize: 12, marginTop: 4 }}>
            adversarial agents · chain-enforced mandate · base-sepolia
          </div>
        </div>
        <a
          href="/"
          style={{
            color: COLORS.textDim,
            border: `1px solid ${COLORS.panelEdge}`,
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: 12,
            textDecoration: 'none',
          }}
        >
          ↻ refresh
        </a>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* MANDATE PANEL */}
        <Panel
          title="Root mandate"
          badge={{
            text: d.addresses.user.saDeployed ? 'USER SA DEPLOYED' : 'COUNTERFACTUAL',
            color: d.addresses.user.saDeployed ? COLORS.green : COLORS.amber,
          }}
        >
          <Kv k="USER EOA" v={d.addresses.user.eoa} />
          <Kv k="USER SA" v={d.addresses.user.sa} />
          <Kv k="USDC available" v={`${d.balances.userSaUsdc} USDC`} color={COLORS.green} />
          <Kv k="Root cap" v={`${d.mandate.rootCap} USDC`} />
          <Kv k="ETH (gas)" v={`${Number(d.balances.userSaEth).toFixed(4)}`} />
          <div style={{ marginTop: 12, fontSize: 11, color: COLORS.textDim, lineHeight: 1.5 }}>
            One signature, two opposed sub-budgets. <br />
            <b>{d.mandate.note}</b>
          </div>
        </Panel>

        {/* MARKET PANEL */}
        {d.market ? (
          <Panel
            title="Binary market"
            badge={{ text: `P(YES) = ${d.market.impliedProb.toFixed(3)}`, color: COLORS.blue }}
          >
            <Kv k="Market" v={d.market.address ?? '—'} />
            <Kv k="Question" v={d.market.question ?? '—'} mono={false} />
            <Kv k="Closes" v={d.market.closeTime ? new Date(d.market.closeTime).toLocaleString() : '—'} mono={false} />
            <Kv k="Total YES" v={`${d.market.totalYes} USDC`} color={COLORS.green} />
            <Kv k="Total NO" v={`${d.market.totalNo} USDC`} color={COLORS.red} />
            <Kv k="USER SA position" v={`YES=${d.market.userSaPosition.yes}  NO=${d.market.userSaPosition.no}`} />
          </Panel>
        ) : (
          <Panel title="Binary market" badge={{ text: 'NOT DEPLOYED', color: COLORS.amber }}>
            <div style={{ color: COLORS.textDim, fontSize: 12 }}>
              Run <code>npm run deploy:market</code> to deploy and set MARKET_ADDRESS.
            </div>
          </Panel>
        )}

        {/* LATEST DUEL */}
        <Panel
          title="Latest duel"
          badge={
            d.latestDuel
              ? d.latestDuel.abstained
                ? { text: 'ABSTAIN', color: COLORS.amber }
                : { text: d.latestDuel.side, color: d.latestDuel.side === 'YES' ? COLORS.green : COLORS.red }
              : { text: 'NONE', color: COLORS.textDim }
          }
        >
          {d.latestDuel ? (
            <>
              <Kv k="Run at" v={new Date(d.latestDuel.runAt).toLocaleString()} mono={false} />
              <Kv k="Bull stake" v={`${d.latestDuel.bullStake.toFixed(2)} USDC`} color={COLORS.green} />
              <Bar value={d.latestDuel.bullStake} max={20} color={COLORS.green} />
              <Kv k="Bear stake" v={`${d.latestDuel.bearStake.toFixed(2)} USDC`} color={COLORS.red} />
              <Bar value={d.latestDuel.bearStake} max={20} color={COLORS.red} />
              <Kv k="Net" v={`${d.latestDuel.netUsdc.toFixed(2)} USDC`} color={d.latestDuel.netUsdc > 0 ? COLORS.green : COLORS.red} />
              {!d.latestDuel.abstained ? (
                <>
                  <Kv k="Bet transfer" v={d.latestDuel.betTransferTx ? <Tx hash={d.latestDuel.betTransferTx} /> : '—'} />
                  <Kv k="Credit (buyOnBehalf)" v={d.latestDuel.buyOnBehalfTx ? <Tx hash={d.latestDuel.buyOnBehalfTx} /> : '—'} />
                </>
              ) : null}
              <div style={{ marginTop: 12, padding: 10, background: COLORS.bg, borderRadius: 6, fontSize: 11, lineHeight: 1.5 }}>
                <div style={{ color: COLORS.green, marginBottom: 4 }}>BULL (YES):</div>
                <div style={{ color: COLORS.textDim }}>{d.latestDuel.bullRationale}</div>
                <div style={{ color: COLORS.red, marginTop: 8, marginBottom: 4 }}>BEAR (NO):</div>
                <div style={{ color: COLORS.textDim }}>{d.latestDuel.bearRationale}</div>
              </div>
            </>
          ) : (
            <div style={{ color: COLORS.textDim, fontSize: 12 }}>
              No duel run yet. Run <code>npm run duel</code>.
            </div>
          )}
        </Panel>

        {/* 1SHOT RELAY STATUS */}
        <Panel
          title="1Shot mainnet relay"
          badge={
            d.latestRelayDispatch
              ? { text: 'DISPATCHED', color: COLORS.blue }
              : { text: 'PENDING', color: COLORS.textDim }
          }
        >
          {d.latestRelayDispatch ? (
            <>
              <Kv k="TaskId" v={d.latestRelayDispatch.taskId} />
              <Kv k="Dispatched" v={new Date(d.latestRelayDispatch.dispatchedAt).toLocaleString()} mono={false} />
              <Kv k="Chain" v={`chainId ${d.latestRelayDispatch.chainId} (Base mainnet)`} mono={false} />
              {d.latestRelayDispatch.memo ? <Kv k="Memo" v={d.latestRelayDispatch.memo} mono={false} /> : null}
            </>
          ) : (
            <div style={{ color: COLORS.textDim, fontSize: 12 }}>
              No mainnet relay yet. Run <code>npm run relay:bet</code>.
            </div>
          )}
          <div style={{ marginTop: 12, fontSize: 11, color: COLORS.textDim, fontWeight: 600, marginBottom: 6 }}>
            WEBHOOK EVENTS (latest)
          </div>
          {d.relayerEvents.length > 0 ? (
            d.relayerEvents.slice(0, 5).map((e, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 11, fontFamily: COLORS.mono }}>
                <span style={{ color: COLORS.textDim }}>{new Date(e.receivedAt).toLocaleTimeString()}</span>
                <span style={{ color: e.status === 'Confirmed' ? COLORS.green : COLORS.amber }}>{e.status}</span>
                <span style={{ color: COLORS.text }}>{e.taskId.slice(0, 8)}…</span>
                {e.txHash ? <Tx hash={e.txHash} network="mainnet" /> : <span>—</span>}
              </div>
            ))
          ) : (
            <div style={{ color: COLORS.textDim, fontSize: 11 }}>No webhook events yet.</div>
          )}
        </Panel>

        {/* AUDIT TRAIL */}
        <Panel title="Audit trail (recent duels)">
          {d.recentDuels.length === 0 ? (
            <div style={{ color: COLORS.textDim, fontSize: 12 }}>—</div>
          ) : (
            <table style={{ width: '100%', fontSize: 11, fontFamily: COLORS.mono, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: COLORS.textDim }}>
                  <th style={{ textAlign: 'left', padding: '6px 4px' }}>WHEN</th>
                  <th style={{ textAlign: 'left', padding: '6px 4px' }}>SIDE</th>
                  <th style={{ textAlign: 'right', padding: '6px 4px' }}>BULL</th>
                  <th style={{ textAlign: 'right', padding: '6px 4px' }}>BEAR</th>
                  <th style={{ textAlign: 'right', padding: '6px 4px' }}>NET</th>
                  <th style={{ textAlign: 'right', padding: '6px 4px' }}>BET TX</th>
                </tr>
              </thead>
              <tbody>
                {d.recentDuels.map((duel, i) => (
                  <tr key={i} style={{ borderTop: `1px dashed ${COLORS.panelEdge}` }}>
                    <td style={{ padding: '6px 4px', color: COLORS.textDim }}>{new Date(duel.runAt).toLocaleTimeString()}</td>
                    <td style={{ padding: '6px 4px', color: duel.abstained ? COLORS.amber : duel.side === 'YES' ? COLORS.green : COLORS.red }}>
                      {duel.abstained ? 'ABSTAIN' : duel.side}
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'right' }}>{duel.bullStake.toFixed(2)}</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right' }}>{duel.bearStake.toFixed(2)}</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right' }}>{duel.netUsdc.toFixed(2)}</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right' }}>{duel.betTransferTx ? <Tx hash={duel.betTransferTx} /> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        {/* SUB-AGENTS */}
        <Panel title="Sub-agents">
          <Kv k="ORCH EOA" v={d.addresses.orch.eoa} />
          <Kv k="↳ USDC held" v={`${d.balances.orchEoaUsdc} USDC`} />
          <Kv k="BULL EOA" v={d.addresses.bull.eoa} />
          <Kv k="↳ USDC held" v={`${d.balances.bullEoaUsdc} USDC`} />
          <Kv k="BEAR EOA" v={d.addresses.bear.eoa} />
          <Kv k="↳ USDC held" v={`${d.balances.bearEoaUsdc} USDC`} />
          <div style={{ marginTop: 12, fontSize: 11, color: COLORS.textDim }}>
            Sub-caps (20 USDC each) are signed FRESH each run. Cumulative spend resets per signing.
          </div>
        </Panel>
      </div>

      <footer style={{ marginTop: 20, color: COLORS.textDim, fontSize: 11, textAlign: 'center' }}>
        generated {new Date(d.generatedAt).toLocaleString()} · proof in PROOF.md
      </footer>
    </main>
  )
}
