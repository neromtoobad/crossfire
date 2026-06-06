# CROSSFIRE

**An adversarial council of AI agents publishes prediction-market calls. Every call is bonded with USDC the chain refuses to let agents touch beyond their cap. Anyone can browse the headline signal for free. Anyone can pay a few cents to unlock the full thesis.**

Prediction markets are noisy. Twitter is noisy. CROSSFIRE makes agent recommendations **auditable**: every published call has a tx hash for the bond, a hash of the evidence trail, a tx hash for each user unlock, and a tx hash for the eventual resolution. If an agent's call wins, its bond pays out; if it loses, the bond is forfeit. **Accountability via cryptographic primitives, not promises.**

Built for the **MetaMask Smart Accounts Kit × 1Shot × Venice AI Dev Cook Off**. Submission deadline 2026-06-15.

---

## What CROSSFIRE is

```
   PREDICTION MARKETS  (Polymarket, Kalshi, our BinaryMarket on Base)
        ▲
        │ reads price + buys evidence per market
        │
   ┌────┴─────────────────────────────────────────────────────┐
   │                   THE COUNCIL                            │
   │                                                          │
   │   MacroScout    NewsHawk     CrowdPulse    BookWatcher  │
   │   (macro/Fed)   (news feed)  (social/X)    (price/vol)  │
   │      │             │             │             │         │
   │      ▼             ▼             ▼             ▼         │
   │   ┌────────────────────────────────────────────────┐    │
   │   │   SKEPTIC  →  vetoes weak signals              │    │
   │   └────────────────────────────────────────────────┘    │
   └─────────────────────────┬─────────────────────────────┘
                             │ if quality gate passes:
                             ▼
   ON-CHAIN PUBLISH  ──────────────────────────────────
   bond posted (ERC-7710 mandate, USDC capped)
   thesis hash stored
   call ID minted
                             │
                             ▼
   PUBLIC FEED   (free to browse — headline, side, P(YES), agent desk)
                             │
                             │  user wants to read more?
                             ▼
   UNLOCK   (~$0.10 USDC via x402 + ERC-7710 micropayment)
   →  reasoning trace, evidence URLs, counterarguments, sizing, Polymarket link
```

**Three actors, three primitives, one shared chain referee.**

| Actor | What they do | On-chain primitive |
|---|---|---|
| The agent council | Reads markets, buys evidence, votes, publishes calls under a USDC bond | **ERC-7710 mandate** with bond cap |
| Premium evidence APIs | Get paid per call via x402 protocol | **x402 buyer-with-delegation** |
| The user | Pays a few cents to unlock a thesis they want to read | **x402 micropayment via ERC-7710** |

---

## The user journey

```
1. Open /                       see a live feed of bonded calls
2. Pick a card                  market title, agent desk, P(YES), unlock price
3. Browse free                  headline signal is public
4. Want the full thesis?        connect wallet, pay $0.10 USDC to unlock
5. Read the trace               evidence URLs, the council's votes, the Skeptic's rebuttal, sizing logic, Polymarket link
6. (optional) Follow an agent   useful agents climb the leaderboard
```

Nothing to delegate, nothing to revoke, no continuous mandate to manage. Each unlock is a one-shot signature. Each call's bond is the agent's risk, not yours.

---

## The council, in detail

Five role agents. All share the same Venice account but get different system prompts and different evidence inputs.

| Agent | Role | Evidence source | Output |
|---|---|---|---|
| **MacroScout** | Reads macro / regulatory / structural context | Web-scraped articles via Venice `enable_web_scraping` | YES/NO signal with rationale |
| **NewsHawk** | Reads recent news + event calendar | News API (paid via x402) | YES/NO signal with sources |
| **CrowdPulse** | Reads social sentiment + crowd positioning | Social signals API (paid via x402) | YES/NO signal with crowd direction |
| **BookWatcher** | Reads market microstructure — orderbook, volume, implied prob | The market contract's `impliedProbYes()` + history | YES/NO with mispricing magnitude |
| **Skeptic** | Actively tries to **refute** the majority | The other four votes + their rationales | Veto / approve, plus refutation |

### The quality gate

A call publishes **only if**:
- ≥ 3 of 4 non-Skeptic agents agree on a side
- Skeptic does not veto (Skeptic's confidence-in-refutation < threshold)
- The agreed side has measurable edge over current market price (|estProb − impliedProb| ≥ 0.05)
- Bond size ≥ minimum and ≤ council treasury cap

Most attempted calls **don't publish**. That's the point. A small number of high-confidence calls beats a firehose of opinions.

---

## On-chain proof (Base Sepolia + Base mainnet)

What's already verified on-chain. Every claim links to its tx on Basescan.

| Phase | What landed | Tx |
|---|---|---|
| ERC-7710 revert proof | Over-cap mandate redemption rejected with `ERC20TransferAmountEnforcer:allowance-exceeded` | [`0xa8d4…ee45`](https://sepolia.basescan.org/tx/0xa8d4775e0cf545119ef7296f87e2e2c8d54fbf26d7fb08abdbb3d2deab12ee45) |
| A2A redelegation | Sub-agent redeems through `[child, root]` chain leaf-to-root | [`0x5cdc…ba41`](https://sepolia.basescan.org/tx/0x5cdcdb45505aa49b8f76cf759dbe2a58b3e2300aafc7356969f7ed19b7d6ba41) |
| x402 settlement | Buyer-with-delegation pays for evidence, real USDC moves | [`0x0bd9…cf23`](https://sepolia.basescan.org/tx/0x0bd9016b12d6be19428eb346474ff0b1f3d2523bdc9e6a8eafa458354b79cf23) |
| Adversarial net bet | Council-style 4 USDC bet placed on the winning side's chain | [`0x44a7…7a4c`](https://sepolia.basescan.org/tx/0x44a722e02febe27c7fa2186557fe704bf2c562f47a4bd3764d807ea34fb47a4c) |
| **1Shot mainnet relay** | Confirmed (200), EIP-7702 in-flight upgrade, gas paid in USDC | [`0x5a09…2651`](https://basescan.org/tx/0x5a093da29349a1519e67aed5f0b6a518109ade6fed6a5f53ca35f8d6a1312651) |

Full receipts: [PROOF.md](./PROOF.md).

---

## Tracks targeted and how each is satisfied

| Track | Prize | How CROSSFIRE earns it |
|---|---|---|
| **Best A2A Coordination** | $3,000 | Council = 5 redelegation chains. Each role agent has its own keypair and budget redelegated from the council treasury. Skeptic's veto fans out independently. `child.delegator == parent.delegate` integrity verified on-chain. |
| **Best x402 + ERC-7710** | $3,000 | Two x402 surfaces. **(1)** Agents pay premium evidence APIs per call via buyer-with-delegation. **(2)** Users pay to unlock a thesis via the same primitive — micropayment with capped open delegation. Both metered on-chain. |
| **Best Use of Venice AI** | $3,000 | Venice is the ONLY model provider in the repo (`grep -rn`-enforced). All 5 role agents reason via Venice. `enable_web_scraping` powers MacroScout's macro reads. The unlocked thesis card is rendered by Venice's image endpoint. |
| **Best Use of 1Shot Relayer** | $1,000 | One real Base-mainnet `relayer_send7710Transaction` confirmed in [`0x5a09…2651`](https://basescan.org/tx/0x5a093da29349a1519e67aed5f0b6a518109ade6fed6a5f53ca35f8d6a1312651). EIP-7702 in-flight upgrade, gas paid in USDC, status via getStatus (webhook handler also wired). |
| **Best Agent** | $3,000 | The council itself is the agent. Bonded calls + skeptic veto + Brier-scored leaderboard. |

---

## What works now vs what's next

The hard chain primitives are already done. The pivot to the Precall model is mostly UI + role-prompts + scoring.

### Done (verified with on-chain receipts)
- ERC-7710 mandate signing (kit's `createDelegation` + `signDelegation`)
- ERC-7710 revert proof at the caveat enforcer
- Bull/Bear redelegation duel (the 2-agent version of the council)
- x402 seller route (`app/api/evidence/route.ts`)
- x402 buyer-with-delegation flow (`lib/x402-buyer.ts`)
- Venice integration (`lib/venice.ts`) — conviction + verdict-card image
- BinaryMarket on Base Sepolia (`contracts/src/BinaryMarket.sol`) with `buyOnBehalf` for credit flow
- 4 themed markets deployed (`lib/markets.json`)
- 1Shot mainnet relay client + send/estimate/status (`lib/relayer.ts`)
- 1Shot webhook handler (`app/api/relayer-webhook/route.ts`)
- One real Base-mainnet 1Shot relay confirmed
- wagmi + MetaMask wallet connect (`components/ConnectButton.tsx`)
- ERC-7710 grant-mandate UI via wagmi's `useSignTypedData` (`components/GrantMandate.tsx`)

### Next (pivoting to the Precall model)

| | Task | What it adds |
|---|---|---|
| 8.1 | Reframe the landing page as a calls feed (initially with sample published calls so the product is legible immediately) | Visual product clarity |
| 8.2 | Expand `lib/venice.ts` into 5 role-prompts: MacroScout / NewsHawk / CrowdPulse / BookWatcher / Skeptic | The council |
| 8.3 | `lib/publish.ts`: quality gate (≥3 of 4 agree, Skeptic not vetoing, edge ≥ 0.05) and on-chain bond posting | The bond mechanism |
| 8.4 | `app/calls/[id]/page.tsx`: per-call detail page with locked thesis below the headline | The unlock surface |
| 8.5 | `app/api/unlock/route.ts`: x402 seller that gates the full thesis behind a tiny USDC payment | The unlock flow |
| 8.6 | `lib/scoring.ts`: Brier scores, per-agent leaderboard | The reputation layer |
| 8.7 | Demo video (sub-3-min, MetaMask Smart Accounts visible in the main flow) | Required for every track |
| 8.8 | Submit to A2A / Best Agent / x402+7710 / Venice / 1Shot | Done |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  USER (browser, optional MetaMask)                                   │
│    - browse calls feed (no wallet needed)                            │
│    - unlock a thesis (one EIP-712 signature → x402 payment)          │
└──────────────────────────┬───────────────────────────────────────────┘
                           │ HTTP / SSE
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│  CROSSFIRE SERVER (Next.js on Base Sepolia + mainnet)                │
│                                                                       │
│  Council scheduler                                                    │
│    - reads markets via viem                                           │
│    - calls Venice with 5 different role prompts                       │
│    - pays evidence APIs via x402 buyer-with-delegation                │
│    - applies quality gate                                             │
│    - signs ERC-7710 bond mandate from council treasury                │
│    - publishes call with bond, thesis hash, evidence trail            │
│                                                                       │
│  Unlock seller (x402)                                                 │
│    - returns 402 PAYMENT-REQUIRED for the thesis route                │
│    - validates PAYMENT-SIGNATURE → returns the thesis                 │
│    - records the unlock tx on the call                                │
│                                                                       │
│  1Shot relayer (Base mainnet, for the hero proof)                     │
│    - estimate → context-lock → send7710 → getStatus                   │
│    - EIP-7702 authorizationList for in-flight EOA upgrade             │
│    - gas paid in USDC                                                 │
└──────────────────────────┬───────────────────────────────────────────┘
                           │ on-chain
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│  BASE SEPOLIA / BASE MAINNET                                          │
│    - DelegationManager   (kit-deployed, validates all redemptions)    │
│    - USDC                (Circle native on Base mainnet)              │
│    - BinaryMarket        (our 4 themed markets, see lib/markets.json) │
│    - 1Shot Relayer       (Base mainnet, sponsored gas in USDC)        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Run it locally

```bash
git clone https://github.com/neromtoobad/crossfire.git
cd crossfire
npm install
cd contracts && forge build && cd ..

cp .env.example .env.local
# Fill in: VENICE_API_KEY, ONESHOT_API_KEY, 4 EOA private keys

npm run check:accounts          # verify wallets are funded
npm run proof                   # ERC-7710 revert proof (the hero shot)
npm run duel:skeleton           # A2A redelegation duel
npm run buy:evidence            # x402 evidence buy
npm run conviction              # Venice conviction + verdict card
npm run duel                    # full duel (current 2-agent version)
npm run relayer:caps            # probe 1Shot mainnet
npm run relay:bet               # real Base-mainnet 1Shot relay

npm run dev                     # http://localhost:3000
```

---

## Architectural decisions worth knowing

**The bond is an ERC-7710 mandate, not a separate escrow contract.** The council treasury wallet signs a delegation capped at the bond amount. When the call resolves, settlement redeems against that mandate. No new contracts needed — the kit's primitives do it.

**Two distinct x402 surfaces.** Agents pay APIs (server-to-server) using buyer-with-delegation. Users pay to unlock (browser-to-server) using the same primitive. Both metered on-chain.

**Fresh salt on every delegation.** Without `generateSalt()`, the kit produces deterministic delegation hashes and the on-chain enforcer accumulates spend across runs. Every council call gets a fresh salt; every unlock too. Caps reset per delegation.

**The market has `buyOnBehalf(buyer, isYes, amount)`.** The mandate's `Erc20TransferAmount` scope only allows `USDC.transfer` calls. So bet placement is two steps: chain redemption transfers USDC to the market, then anyone calls `buyOnBehalf` to credit shares. Same pattern works for bond settlement when calls resolve.

**Venice is the only LLM provider.** `grep -rn "api.anthropic.com|api.openai.com|api.groq.com|..." --include="*.ts" --exclude-dir=node_modules .` returns zero matches. Switching providers mid-build would invalidate the Venice track claim; the discipline is enforced by the grep, not just intent.

---

## Files worth reading first

- [`PROOF.md`](./PROOF.md) — every on-chain receipt, organized by phase
- [`CLAUDE.md`](./CLAUDE.md) — original project brief and competitive thesis
- [`BUILD_GUIDE.md`](./BUILD_GUIDE.md) — phase map with acceptance criteria
- [`lib/duel-engine.ts`](./lib/duel-engine.ts) — current duel engine, the base of the council
- [`scripts/relay-bet.ts`](./scripts/relay-bet.ts) — the real mainnet 1Shot relay, walked through step by step
- [`contracts/src/BinaryMarket.sol`](./contracts/src/BinaryMarket.sol) — 75 lines, dependency-free

---

## Bug catalog — what we hit, and why

These are the landmines we already cleared. Documented for the next engineer.

- **Wrong execution encoding** — Hand-rolled `abi.encode(target, value, callData)` doesn't match the kit's layout. Use `createExecution` + `encodeSingleExecution`.
- **1Shot `permissionContext` is the full delegation object array**, not encoded hex bytes. The kit's `Delegation` struct shape is exactly what to send.
- **1Shot `executions[0]` must be a `USDC.transfer` to the feeCollector.** Without it: *"No valid payments to the feeAddress were found in the transaction calldata."*
- **`signAuthorization` wants raw `privateKey`** — not a viem account. From `viem/accounts`.
- **Public Base Sepolia RPC routes serve inconsistent block heights.** Setting `BlockNumberEnforcer.afterThreshold = currentBlock` can land in the "future" by the time the executing node sees the tx. Backdate by ~1000 blocks.
- **Counterfactual smart accounts can't sign via ERC-1271.** Both delegator and (when used) delegate SAs must be deployed + funded before the first redemption.
- **Parallel facilitator redemptions collide on nonce.** Run sides in series when both use the same EOA as facilitator.
- **Stale RPC reads right after a receipt.** Retry loops on `balanceOf` / `getCode`.
- **wagmi hydration race in Next.js.** Use `cookieStorage` + `cookieToInitialState` so the server-rendered HTML knows the connection state.

---

## What CROSSFIRE deliberately does NOT do (yet)

Stated up front so judges don't have to find it.

- **Mirror Polymarket directly.** Polymarket lives on Polygon with UMA-resolved ConditionalTokens. Cross-chain settlement is a project of its own. For now, the council bets on our deployed `BinaryMarket` contracts on Base Sepolia with real-sounding questions. The agent code is identical to what would run against Polymarket.
- **Resolve calls automatically.** Resolution requires an oracle. For now, manual resolution from a service account; agent bonds settle on resolution.
- **Verify webhook signatures.** 1Shot uses Ed25519 against their JWKS. We accept-without-verify and poll `getStatus` instead. Production fix is documented.

These are next-week items. None of them change the architecture or invalidate any track claim.

---

## Tech stack

- **Next.js 16** (App Router) + **TypeScript** + **viem 2.52**
- **`@metamask/smart-accounts-kit@1.6.0`** — delegations, caveats, scopes, sign helpers
- **wagmi 2** + MetaMask connector for browser-side wallet flow
- **`openai@6`** — used against Venice's OpenAI-compatible endpoint, never against OpenAI itself
- **Foundry** — `BinaryMarket.sol` is dependency-free, 75 lines, no OpenZeppelin
- Base **Sepolia** for delegations, redemptions, the council, the duel, the revert proof
- Base **mainnet** for the one real 1Shot relay

Venice model: `qwen3-235b-a22b-instruct-2507` (chat) + `flux-2-pro` (image). Picked deliberately to avoid Venice-routed Claude/GPT models that would muddy the "Venice as sole engine" track claim.

---

## Submission targets

- **Best A2A Coordination** ($3,000)
- **Best Use of x402 + ERC-7710** ($3,000)
- **Best Use of Venice AI** ($3,000)
- **Best Use of 1Shot Permissionless Relayer** ($1,000)
- **Best Agent** ($3,000)
- Social media + feedback tracks

Deadline: 2026-06-15.

---

## License

MIT.
