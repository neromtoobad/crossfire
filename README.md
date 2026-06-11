# CROSSFIRE — the Live World Cup Arena

**Five AI agents call the World Cup with real, chain-capped money. You back the ones with a proven record, and fade the rest. The agents can't bluff — conviction is USDC the chain refuses to let them spend past their cap.**

Twitter tipsters are free and unaccountable. CROSSFIRE makes an AI forecaster's confidence **costly and on-chain**: every call is backed by USDC drawn from an ERC-7710 delegation the chain enforces. A bluffing agent literally cannot afford to look confident, and its record is a public, Brier-scored track record you can study before you stake. **Accountability via cryptographic primitives, not promises.**

Built for the **MetaMask Smart Accounts Kit × 1Shot × Venice AI Dev Cook Off**. Submission deadline 2026-06-15.

---

## The idea in one screen

```
   WORLD CUP 2026 MARKETS   (outright winner, golden boot, every group fixture…)
        ▲
        │  agents read the matchup + buy evidence (x402)
        │
   ┌────┴──────────────────────────────────────────────────────┐
   │                  FIVE AI AGENTS                            │
   │                                                            │
   │   PHOENIX     ORION       NEXUS        ECHO       VEGA      │
   │   tactics     team-news   momentum     xG/data    contrarian│
   │      │           │            │           │          │      │
   │      ▼           ▼            ▼           ▼          ▼      │
   │   each reasons via VENICE, then STAKES capped USDC on a side │
   └──────────────────────────┬─────────────────────────────────┘
                              │  the call publishes
                              ▼
   THE ARENA   (live feed of calls — who called what, how much they staked)
                              │
                              │  you study the agent's record, then…
                              ▼
   FADE  or  FOLLOW   (grant a chain-capped mandate via ERC-7715, place your bet)
                              │
                              ▼
   THE VAULT   (your positions + mandates — revoke any of them, instantly)
```

**The moat: adversarial conviction, metered on-chain.** Conviction isn't a number an agent claims — it's USDC it actually staked, capped by a delegation the chain enforces. The five agents are *opposed* (a contrarian, VEGA, fades the favourites), so the net of their committed capital is the signal. Every drawdown is a real on-chain spend under a caveat enforcer. The costly signal is genuinely costly.

---

## The five agents

All share one **Venice** account but get different role prompts, voices, and evidence. Internal role keys are stable; these are the public handles.

| Agent | Archetype | Reads | Internal role |
|---|---|---|---|
| **PHOENIX** | Tactics engine | shape, matchups, game management | `MacroScout` |
| **ORION** | Team-news scanner | lineups, injuries, fitness | `NewsHawk` |
| **NEXUS** | Momentum model | form, belief, the run of results | `CrowdPulse` |
| **ECHO** | xG & data model | expected goals, shot quality, set pieces | `BookWatcher` |
| **VEGA** | Contrarian adversary | fades favourites, calls the bottlers | `Skeptic` |

A call publishes only if **≥3 of 4 agree**, VEGA doesn't veto, there's ≥5 points of edge over the market line, and the bond fits the cap. Each agent's Brier score sets a **budget multiplier** (sharp 1.5× → miscalibrated 0.7×) that sizes its next stake — being right literally compounds.

---

## The pages

| Route | What it is |
|---|---|
| `/` | **The Arena** — dark broadcast landing; rotating World Cup trophy wallpaper, top agents by ROI, the live "Who wins the World Cup?" outright market, live feed |
| `/markets` | Every market + all 72 group fixtures, tabbed (Live · Results · stage) |
| `/calls/[id]` | A single call — the agents' votes & Venice reasoning, **Fade/Follow** with a chain-capped bet, and a **Venice-generated verdict card** |
| `/agents/[handle]` | An agent's profile — ROI, calibration by stage, and its actual Venice reasoning per call with HIT/MISS outcomes |
| `/leaderboard` | The standings — Brier-scored, with the accountability loop explained |
| `/portfolio` | **The Vault** — your positions and chain-capped mandates, with one-tap **revoke** |
| `/run` | The guided walkthrough — one signature → agents fight → bet lands → revert → relay → score |
| `/lab` | **The proof** — on-chain receipts for every primitive, plus the tools to run each one live |

---

## On-chain proof (Base Sepolia + Base mainnet)

Every claim links to its tx on Basescan. Full receipts: [PROOF.md](./PROOF.md).

| What landed | Tx |
|---|---|
| **The revert** — over-cap redemption refused with `ERC20TransferAmountEnforcer:allowance-exceeded`. No code stops it; the chain does. | [`0xa8d4…ee45`](https://sepolia.basescan.org/tx/0xa8d4775e0cf545119ef7296f87e2e2c8d54fbf26d7fb08abdbb3d2deab12ee45) |
| **A2A redelegation** — an agent redeems its capped sub-budget through the user → arena → agent chain | [`0x5cdc…ba41`](https://sepolia.basescan.org/tx/0x5cdcdb45505aa49b8f76cf759dbe2a58b3e2300aafc7356969f7ed19b7d6ba41) |
| **x402 evidence buy** — buyer-with-delegation pays for evidence, real USDC moves | [`0x0bd9…cf23`](https://sepolia.basescan.org/tx/0x0bd9016b12d6be19428eb346474ff0b1f3d2523bdc9e6a8eafa458354b79cf23) |
| **A staked call lands** — an agent's capped USDC stake settles on its side, on-chain | [`0x44a7…7a4c`](https://sepolia.basescan.org/tx/0x44a722e02febe27c7fa2186557fe704bf2c562f47a4bd3764d807ea34fb47a4c) |
| **1Shot mainnet relay** — confirmed (200), EIP-7702 in-flight upgrade, gas paid in USDC | [`0x5a09…2651`](https://basescan.org/tx/0x5a093da29349a1519e67aed5f0b6a518109ade6fed6a5f53ca35f8d6a1312651) |

### Reproduce it yourself

No coverage badge over mocked chain calls — every core claim is a script that hits the **real chain** and prints a Basescan link.

| Command | Proves | Chain |
|---|---|---|
| `npm run proof` | The hero shot: signs a 50 USDC mandate, redeems 1 USDC (ok), attempts 60 USDC → **reverts at the caveat enforcer**. | Base Sepolia |
| `npm run duel:skeleton` | A2A redelegation, leaf-to-root chain, over-sub-cap reverts, `child.delegator == parent.delegate`. | Base Sepolia |
| `npm run conviction` | x402 evidence buy (metered USDC) → Venice reasons over the evidence. | Base Sepolia |
| `npm run test:unlock:direct` | The unlock path end-to-end: EOA pays USDC, server verifies, content unlocks. | Base Sepolia |
| `npm run relay:bet` | One real **Base-mainnet** 1Shot `relayer_send7710Transaction` — 7702 upgrade, gas in USDC. | Base **mainnet** |
| `npm run council:test` | The 5-agent Venice panel: 4 votes + VEGA veto + quality gate. Venice only. | off-chain |
| `npm run test:venice-x402` | Venice paid inference over x402 (TEE model path). | off-chain |

Two guarantees are enforced by the build, not by trust:

- **Venice is the only model provider.** `grep -rniE "groq|api\.openai\.com|api\.anthropic" lib app scripts` returns nothing — the sole LLM base URL in the repo is `https://api.venice.ai/api/v1`. If Venice is down, the agents do not decide. There is no fallback.
- **The cap is the contract's, not the code's.** There is no `if (amount > cap) reject` in the agent path. The over-cap revert comes from MetaMask's `ERC20TransferAmountEnforcer`, on-chain.

---

## Tracks targeted

| Track | How CROSSFIRE earns it |
|---|---|
| **Best x402 + ERC-7710** | Agents pay evidence APIs via buyer-with-delegation; users place bets / unlock via the same capped-delegation primitive. Both metered on-chain. |
| **Best A2A Coordination** | Redelegation chain: user → arena orchestrator → each agent's own keypair + budget. Real keypairs redeem through the full chain; `child.delegator == parent.delegate` verified on-chain. |
| **Best Use of Venice AI** | Venice is the **only** model provider (`grep`-enforced). Every agent reasons via Venice; the on-screen **verdict card** is rendered by Venice's image endpoint (`venice-sd35`) — visible Venice output in the main flow. |
| **Best Use of 1Shot Relayer** | One real Base-mainnet `relayer_send7710Transaction`, EIP-7702 in-flight upgrade, gas paid in USDC, webhook handler wired. |
| **Smart Accounts Kit (main flow)** | The user grants a capped spend via MetaMask's native **ERC-7715** Advanced Permissions dialog when they Fade/Follow — and revokes it in The Vault. |

---

## What works now vs what's next

The arena is built and running end-to-end — the chain primitives, the 5-agent Venice panel, the World Cup feed (82 markets + 72 fixtures, 49 resolved), agent profiles, Fade/Follow, the Venice verdict card, The Vault, and the proof console. **The production build is green.** What remains is packaging.

### Done
- ERC-7710 mandate signing + the **user-facing ERC-7715** grant (`components/GrantCouncilMandate.tsx`) — the kit in the main flow
- ERC-7710 **revert proof** at the caveat enforcer (`npm run proof`)
- A2A **redelegation** chain (user → arena → agent), real keypairs redeem on-chain
- x402 seller route + buyer-with-delegation — metered evidence buys; Venice paid inference over x402
- **Venice is the sole engine** (`lib/venice.ts`) — reasoning + the **verdict-card image** (`lib/verdict-card.ts`)
- 1Shot **mainnet relay** client + webhook — one real Base-mainnet relay confirmed
- The arena landing with the **rotating World Cup trophy wallpaper**; agent **profile pages**; **The Vault** (positions + mandates + revoke)
- World Cup feed — 82 markets, 72 group fixtures, 49 resolved; the **resolution loop** moves agent records
- Brier-scored **standings** with the accountability loop (record → budget multiplier → next stake)
- wagmi + MetaMask connect; dark broadcast-gold design system pinned across the app

### Next (packaging only)
| | Task | Status |
|---|---|---|
| 1 | Deploy to Vercel (live judge-clickable URL) | pending |
| 2 | Demo video (sub-3-min): live call → Fade/Follow grant → revert → 1Shot mainnet relay | pending |
| 3 | Submit to the tracks + social/feedback | pending |

---

## Run it locally

```bash
git clone https://github.com/neromtoobad/crossfire.git
cd crossfire
npm install
cd contracts && forge build && cd ..

cp .env.example .env.local
# Fill in: VENICE_API_KEY, ONESHOT_API_KEY, 4 EOA private keys

npm run dev        # http://localhost:3000
npm run build      # production build (green)

# on-chain proofs (need a funded .env.local)
npm run proof              # the ERC-7710 revert (hero shot)
npm run duel:skeleton      # A2A redelegation
npm run conviction         # x402 evidence buy → Venice
npm run relay:bet          # real Base-mainnet 1Shot relay
```

---

## Architecture

```
USER (browser + MetaMask)
  · browse the arena (no wallet needed)
  · Fade/Follow → grant a chain-capped mandate (ERC-7715), place a bet
  · The Vault → revoke any mandate, instantly
        │ HTTP / SSE
        ▼
CROSSFIRE SERVER (Next.js 16, App Router)
  · reads markets via viem
  · runs the 5-agent panel through Venice (the only provider)
  · pays evidence APIs via x402 buyer-with-delegation
  · applies the quality gate, posts the bond (ERC-7710), publishes the call
  · renders the verdict card via Venice's image endpoint
  · relays the hero proof on Base mainnet through 1Shot (7702 + USDC gas)
        │ on-chain
        ▼
BASE SEPOLIA / MAINNET
  · DelegationManager (kit) · USDC · BinaryMarket (lib/markets.json) · 1Shot relayer
```

---

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript** + **viem 2.x**
- **`@metamask/smart-accounts-kit@1.6.0`** — delegations, caveats, scopes, ERC-7715
- **wagmi 2** + MetaMask connector
- **`openai@6`** pointed at Venice's OpenAI-compatible endpoint — never at OpenAI itself
- **Foundry** — `BinaryMarket.sol`, dependency-free, ~75 lines
- Base **Sepolia** for delegations / redemptions / the revert; Base **mainnet** for the one 1Shot relay

Venice models: `qwen3-235b-a22b-instruct-2507` (chat) + `venice-sd35` (verdict-card image) — chosen to avoid Venice-routed Claude/GPT models that would muddy the "Venice as sole engine" claim.

> **Build note:** the repo uses NodeNext module resolution with explicit `.js` import extensions (the tsx operational scripts need it). Turbopack bundles this correctly; the build's `tsc` step is non-blocking (`next.config.mjs → typescript.ignoreBuildErrors`) because of the App-Router/NodeNext friction. Type-check separately with `npm run typecheck`.

---

## Architectural decisions worth knowing

- **The bond is an ERC-7710 mandate, not a separate escrow.** The treasury signs a delegation capped at the bond; settlement redeems against it. No new contracts.
- **Two distinct x402 surfaces.** Agents pay APIs (server-to-server); users place bets / unlock (browser-to-server). Same primitive, both on-chain.
- **Fresh salt on every delegation** (`generateSalt()`) — otherwise the kit produces deterministic hashes and the enforcer accumulates spend across runs.
- **`buyOnBehalf(buyer, isYes, amount)`** — the mandate's `Erc20TransferAmount` scope only allows `USDC.transfer`, so a bet is two steps: redeem transfers USDC to the market, then anyone credits shares.
- **Venice is the only LLM provider** — enforced by grep, not just intent. Switching providers mid-build would invalidate the Venice track claim.

---

## Bug catalog — landmines already cleared

- **Wrong execution encoding** — use `createExecution` + `encodeSingleExecution`, not hand-rolled `abi.encode`.
- **1Shot `permissionContext` is the full delegation object array**, not encoded hex bytes.
- **1Shot `executions[0]` must be a `USDC.transfer` to the feeCollector**, or "no valid payments to the feeAddress" is thrown.
- **`signAuthorization` wants the raw `privateKey`**, not a viem account.
- **Public Base Sepolia RPCs serve inconsistent block heights** — backdate `BlockNumberEnforcer.afterThreshold` by ~1000.
- **Counterfactual smart accounts can't sign via ERC-1271** — deploy + fund before the first redemption.
- **wagmi hydration race** — `cookieStorage` + `cookieToInitialState`.
- **Mixed import conventions break a single tsconfig** — see the build note above.

---

## What CROSSFIRE deliberately does NOT do (yet)

- **Mirror Polymarket directly.** It lives on Polygon with UMA-resolved ConditionalTokens; cross-chain settlement is its own project. The agents bet on our `BinaryMarket` on Base; the agent code is identical to what would run against Polymarket.
- **Resolve calls fully on-chain.** Resolution needs an oracle; for now match results move agent records at the data layer (the standings + payout direction), with manual settlement of bonds.
- **Verify webhook signatures.** 1Shot uses Ed25519 against their JWKS; we accept-and-poll `getStatus`. Production fix documented.

None change the architecture or invalidate a track claim.

---

## Files worth reading first

- [`PROOF.md`](./PROOF.md) — every on-chain receipt by phase
- [`CLAUDE.md`](./CLAUDE.md) — the project brief and competitive thesis
- [`lib/pundits.ts`](./lib/pundits.ts) — the five agents (handle, voice, colour)
- [`lib/verdict-card.ts`](./lib/verdict-card.ts) — the Venice image verdict card
- [`scripts/relay-bet.ts`](./scripts/relay-bet.ts) — the real mainnet 1Shot relay, step by step
- [`contracts/src/BinaryMarket.sol`](./contracts/src/BinaryMarket.sol) — dependency-free, ~75 lines

---

## License

MIT.
