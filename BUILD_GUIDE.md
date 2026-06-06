# BUILD_GUIDE.md — CROSSFIRE

The architecture, the phase map with hard acceptance criteria, and the reusable prompts. Literal paste-ready prompts live in `EXECUTION_PLAN.md`.

## Architecture (one screen)

```
   USER (delegator, smart acct)
     │  signs ONCE
     │  ERC-7710 root mandate  (50 USDC, 24h, target-restricted)
     ▼
   ORCHESTRATOR (smart acct)
     │  redelegates two OPPOSED capped budgets (parentDelegation chain)
     ├──────────────► BULL sub-agent (20 USDC cap, argues YES)
     └──────────────► BEAR sub-agent (20 USDC cap, argues NO)
                         │  each, independently:
                         │   1) x402: buy evidence ── 402 ──► pay USDC ──► data   (metered on-chain)
                         │   2) Venice: reason privately, set conviction (side + stake)   (only engine)
                         ▼
   RESOLVE (orchestrator):  net = bullStake − bearStake
     │  net > 0 → YES bet sized |net| ; net < 0 → NO bet ; net ≈ 0 → ABSTAIN
     │  bet drawn from the root mandate via the redelegation chain — chain caps every hop
     ▼
   1SHOT RELAYER (Base mainnet, once for proof)
     │  7702 upgrade → getFeeData → send7710Transaction ; gas in USDC ; status → webhook
     ▼
   BINARY MARKET CONTRACT (Base)  ◄── real net bet, tx hash to UI

   THE PROOF (the hero):  attempt a stake beyond a sub-cap (or net beyond root)
     → REVERTS at the caveat enforcer (ERC20TransferAmount). No code guardrail. The chain refuses.
```

## Why this wins, mapped to judging

- **Permission sharing:** one human signature fanned into a cryptographically bounded two-agent system. Redelegation narrows, never expands. The A2A track is the duel itself.
- **User experience:** the dashboard makes the invisible visible — two budgets draining, conviction resolving into a net position, the webhook flipping to success, and the revert refusing an over-cap bet on screen.
- **x402 + ERC-7710:** evidence is bought per call via x402 buyer-with-delegation; the bet redeems the 7710 chain.
- **Venice:** the only decision engine; its verdict text and a generated verdict card are on screen in the main flow.
- **1Shot:** one real Base-mainnet relay, 7702 upgrade, gas in USDC, webhook status. The wedge the field fumbles.

## Phase map (with acceptance criteria)

Each phase is done only when its criterion is provably true. Commit at each green.

**Phase 1 — Core + THE PROOF.** Create the user and orchestrator smart accounts (deploy + fund the orchestrator). Create a scoped root mandate (Erc20TransferAmount cap + expiry + allowed-target caveats), sign it, redeem a small in-cap execution, then attempt an over-cap execution.
*Done when:* an in-cap delegated transfer succeeds with a real hash AND an over-cap attempt reverts at the enforcer with its error string. This is the thesis; build it first.

**Phase 2 — The redelegation duel skeleton (A2A).** Orchestrator redelegates two opposed capped budgets to a Bull and a Bear, each a real keypair. Prove each sub-agent redeems its own chain leaf-to-root, each sub-cap reverts independently, and combined spend respects the root.
*Done when:* both sub-agents place a trivial in-cap redeem on-chain, each over-sub-cap attempt reverts, and the root cap is never exceeded.

**Phase 3 — x402 evidence + Venice-only conviction.** Buyer-with-delegation x402 flow. Each agent buys evidence per call (real USDC drawdown under its cap). Venice (only) returns `{ side, estProb, impliedProb, edge, stakeUsdc, rationale }` and renders a verdict card image.
*Done when:* a paid call returns data, the cap visibly draws down, and Venice returns a valid conviction object + a verdict image. No non-Venice model exists in the codebase.

**Phase 4 — Market + adversarial netting + bet.** Deploy the binary market on Base Sepolia. Bull and Bear set stakes from conviction; orchestrator computes net and places the bet (or abstains) by redeeming the chain.
*Done when:* a net bet lands on-chain sized by the conviction spread, an abstain case (near-zero net) places nothing, and positions are readable.

**Phase 5 — 1Shot mainnet relay + webhook + dashboard.** Route a real execution through 1Shot on Base mainnet (7702 upgrade, gas in USDC, webhook). Build the dashboard: mandate panel (cap/spent/remaining/expiry, grant/revoke), the live duel (two draining bars resolving to a net), Venice verdicts + card, the webhook status, the revert state, and a tx-linked audit trail.
*Done when:* one real mainnet relay completes with gas in USDC and the webhook reports success on screen; the dashboard reflects only real on-chain state; revoke halts the agents.

**Phase 6 — Proof, story, submission.** README, cleanup, PROOF.md (testnet hashes, the revert, mainnet TaskId + hash + webhook payload, duel hashes), 4 slides, <3-min demo video, competitive analysis. Submit to every qualifying track.
*Done when:* the video shows the kit in the main flow, Venice in the main flow, the 1Shot mainnet relay, the duel, and the revert.

## Reusable prompts

### SESSION START
```
Read CLAUDE.md and BUILD_GUIDE.md in full before doing anything.
We are on Phase <N>: <one line>. Do not start later phases.
Confirm: (1) the acceptance criterion, (2) the exact files you will touch,
(3) the verified Smart Accounts Kit / 1Shot / Venice methods you will call.
Hard rules: Venice is the only model provider — never add a fallback. The revert
proof and a real mainnet 1Shot relay must stay intact. Then wait for my go.
```

### STUCK
```
Stop. Do not guess or swap libraries, and never swap Venice for another model.
Restate: what we expected, what happened, the exact error.
List 3 likely causes ranked by probability. For the top cause, cite the CLAUDE.md
footgun or doc behaviour it matches. Propose the smallest fix that tests that cause
only. Wait for my go.
```

### COMMIT
```
Phase <N> criterion is met: <proof — tx hash / revert error / webhook payload>.
Stage only this phase's files. Commit message: "phase <N>: <imperative summary>"
with a 2-line body of what now works. Run it. Append the proof to PROOF.md.
Do not start the next phase.
```

## Demo-video shot list (≤3 min — the build serves the video)
1. Cold open on **the revert**: an over-cap bet rejected by the enforcer, real error on screen. "No code stops this. The chain does."
2. User signs ONE mandate — Smart Accounts Kit signing in the main flow.
3. The duel: Bull and Bear budgets draining as they buy evidence; Venice's two verdicts and the verdict card appear (Venice in the main flow).
4. Resolve: net conviction → a YES/NO bet sized by the spread (or an honest abstain).
5. 1Shot relays it on Base mainnet — webhook status flips to success, gas paid in USDC.
6. Dashboard: spent/remaining, audit trail, tx hashes. Revoke → agents stop.

Never cut the revert or the kit-signing frame. They are the two frames that win.
