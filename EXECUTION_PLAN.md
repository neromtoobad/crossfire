# EXECUTION_PLAN.md — CROSSFIRE

Every prompt pastes straight into Claude Code, in order. Run SESSION START (in BUILD_GUIDE.md) at the top of each session, then paste phase prompts one at a time. Hit each acceptance criterion before moving on. Use STUCK when something fails twice, COMMIT at each green.

Maps to the week: Phase 0 setup → P1 core+proof → P2 duel skeleton → P3 evidence+Venice → P4 market+netting → P5 mainnet relay+dashboard → P6 submit. Phases 3–4 share the mid-week; the dashboard in P5 is the polish day.

Two rules that never bend: **Venice is the only model provider — no fallback, ever.** **The revert proof and the real Base-mainnet 1Shot relay stay intact.**

---

## PHASE 1 — Core + THE PROOF

### Prompt 1.1 — config + smart accounts
```
Create lib/config.ts and lib/accounts.ts.
config.ts: a viem publicClient on Base Sepolia; env for USER_PRIVATE_KEY,
ORCHESTRATOR_PRIVATE_KEY, BULL_PRIVATE_KEY, BEAR_PRIVATE_KEY, USDC (Base Sepolia),
MARKET (filled later); export each EOA via privateKeyToAccount.
accounts.ts: build userSmartAccount and orchestratorSmartAccount with
toMetaMaskSmartAccount (Implementation.Hybrid, deployParams [owner.address,[],[],[]],
deploySalt '0x', signer { account: owner }). Export both + a helper that logs each
.address and deployment status. Write scripts/check-accounts.ts and run it.
Use only the methods in CLAUDE.md. Do not invent names.
```

### Prompt 1.2 — deploy + fund the orchestrator (avoid the ERC-1271 footgun)
```
The account the proof redeems from must be DEPLOYED and FUNDED, or DelegationManager
signature validation fails (see CLAUDE.md footgun). Write scripts/deploy-orchestrator.ts
to deploy orchestratorSmartAccount (a no-op user op) and wait for the receipt. Confirm it
holds Base Sepolia USDC; if not, print funding instructions. Run until deployed = true and
USDC > 0.
```

### Prompt 1.3 — the root mandate + the revert proof
```
Create lib/mandate.ts: buildRootMandate() → createDelegation from userSmartAccount to
orchestratorSmartAccount, scope Erc20TransferAmount on USDC maxAmount parseUnits('50',6),
caveats for (a) a 24h expiry window and (b) restricting allowed targets to USDC + the market
address. Sign with userSmartAccount.signDelegation. (Deploy + fund the user account too if
needed for ERC-1271.)
Create scripts/proof.ts: as the orchestrator, redeem the signed mandate to transfer 1 USDC
(in cap) → assert success, print the tx hash. Then attempt 60 USDC (over cap) → assert it
REVERTS, capture and print the enforcer error string verbatim.
This revert is the centerpiece. Make scripts/proof.ts re-runnable for the demo.
```
**Acceptance:** in-cap redeem succeeds with a hash; over-cap reverts at the enforcer with its error. → COMMIT phase 1, paste both outcomes into PROOF.md.

---

## PHASE 2 — The redelegation duel skeleton (A2A)

### Prompt 2.1 — Bull and Bear sub-accounts + redelegation
```
Create lib/duel.ts. Build bullSmartAccount and bearSmartAccount (toMetaMaskSmartAccount,
their own keypairs — real accounts, never placeholders). Add redelegate(subAddr, capUsdc):
createDelegation from orchestrator to subAddr, scope Erc20TransferAmount USDC
maxAmount parseUnits(capUsdc,6), parentDelegation = signedRoot, environment = orchestrator's;
sign with the orchestrator smart account. Make bullBudget (20 USDC) and bearBudget (20 USDC).
```

### Prompt 2.2 — redeem the chain + prove sub-caps
```
Add redeemAsSub(sub, signedChain, execution). CRITICAL: encode the chain LEAF-TO-ROOT and
ensure each child's delegator equals the parent's delegate, or redemption throws
invalid-delegate (see CLAUDE.md). Write scripts/duel-skeleton.ts: each sub-agent redeems a
1 USDC in-cap transfer → assert success + hash. Then each attempts 40 USDC (2x its sub-cap)
→ assert revert. Assert combined spend never exceeds the 50 USDC root.
```
**Acceptance:** both subs redeem in-cap on-chain; each over-sub-cap reverts; root never exceeded. → COMMIT phase 2.

---

## PHASE 3 — x402 evidence + Venice-only conviction

### Prompt 3.1 — x402-protected evidence route (seller)
```
Create app/api/evidence/route.ts. Without a valid PAYMENT-SIGNATURE it returns 402 with a
base64 PAYMENT-REQUIRED header: scheme, network (base-sepolia for dev), amount, asset (USDC),
payTo, maxTimeoutSeconds, extra { assetTransferMethod: 'erc7710', facilitators: [<addr>] }.
With valid payment it returns one evidence item for the market:
{ marketId, signal, sourceUrl, weight }. Keep verification minimal (presence + shape) for now.
```

### Prompt 3.2 — buyer-with-delegation (metered, on-chain costly signal)
```
Create lib/x402-buyer.ts per CLAUDE.md: handle 402, assert extra.assetTransferMethod ===
'erc7710', createOpenDelegation (Erc20TransferAmount on accepted.asset, maxAmount
BigInt(accepted.amount), caveat CaveatType.Redeemer = accepted.extra.facilitators), sign,
encodeDelegations([signed]) → permissionContext, build paymentPayload { x402Version:2,
accepted, payload:{ delegationManager, permissionContext, delegator } }, base64, retry with
PAYMENT-SIGNATURE. Return data AND the USDC amount spent so the caller can draw down the
agent's cap. Write scripts/buy-evidence.ts and confirm the spend is metered.
```

### Prompt 3.3 — Venice as the ONLY conviction engine (+ verdict card)
```
Create lib/venice.ts using the OpenAI SDK, baseURL https://api.venice.ai/api/v1,
VENICE_API_KEY. NO other provider may appear anywhere in the repo.
- conviction(side, evidence[], remainingCapUsdc): system prompt = a calibrated analyst
  arguing ONLY the given side (Bull=YES, Bear=NO); respond ONLY with JSON, no fences.
  Use venice_parameters.enable_web_scraping to read evidence sourceUrls. Return
  { side, estProb, impliedProb, edge, stakeUsdc, rationale } where stakeUsdc scales with
  |edge| and is clamped to remainingCapUsdc (0 if edge below threshold). Validate; throw on
  malformed output.
- verdictCard(decision): call Venice's image endpoint to render a YES/NO verdict card with
  the side, stake, and a one-line rationale; return the image URL/bytes for the UI.
Write scripts/conviction.ts chaining buy-evidence → conviction → verdictCard. Print both.
```
**Acceptance:** paid call returns data, cap draws down, Venice returns a valid conviction object + a verdict image; grep the repo confirms no non-Venice provider. → COMMIT phase 3.

---

## PHASE 4 — Market + adversarial netting + bet

### Prompt 4.1 — binary market contract
```
Foundry project under contracts/: BinaryMarket.sol, USDC collateral. constructor(usdc,
question, closeTime); buy(bool isYes, uint256 usdcAmount) pulling USDC via transferFrom and
crediting yes/no shares to msg.sender; positionOf(address); simple price getters (fixed-odds
or constant-product, keep it minimal and safe). Deploy to Base Sepolia, print the address,
add it to .env (MARKET) and to the mandate's allowed-target caveat.
```

### Prompt 4.2 — the resolve (this is the mechanism)
```
Create lib/resolve.ts: runDuel(market) →
  1) for Bull and Bear in parallel: loop buy-evidence (drawing down each sub-cap) → Venice
     conviction, until edge is sufficient or the sub-cap is exhausted; record each side's
     final stakeUsdc and rationale.
  2) net = bullStake - bearStake.
  3) if |net| < dust → ABSTAIN (place nothing, surface "market genuinely uncertain").
     else build execution: USDC approve to market + market.buy(net > 0, parseUnits(|net|,6)),
     and redeem it through the redelegation chain (sub on the winning side, or orchestrator),
     leaf-to-root.
  Return { bullStake, bearStake, net, side, txHash | abstained, rationales }.
Write scripts/run-duel.ts and confirm a net bet lands on-chain, plus force an abstain case.
```
**Acceptance:** a net bet lands sized by the spread; an abstain case places nothing; positions readable; dashboard-ready state returned. → COMMIT phase 4.

---

## PHASE 5 — 1Shot mainnet relay + webhook + dashboard

### Prompt 5.1 — relayer client + capabilities
```
Create lib/relayer.ts: JSON-RPC client for https://relayer.1shotapi.com/relayers with
getCapabilities(), getFeeData(params), send7710Transaction(params), getStatus(taskId).
Reference the installed 1Shot relayer skill for exact param shapes — do not guess.
scripts/relayer-caps.ts: call relayer_getCapabilities, assert Base mainnet + an accepted USDC
fee token, print accepted tokens.
```

### Prompt 5.2 — relay the bet through 1Shot, webhook status
```
Add a chain switch so the bet flow can target Base mainnet. Route the redemption through 1Shot:
  1) if the executing account is not yet a 7702StatelessDelegator, include ONE EIP-7702
     authorizationList entry to upgrade in-flight.
  2) relayer_getFeeData → carry the locked fee context.
  3) relayer_send7710Transaction with permissionContext (encoded chain), the bet executions,
     the 7702 authorization, fee in USDC, and destinationUrl webhook.
  4) app/api/relayer-webhook/route.ts receives status pushes; store latest per TaskId in state.
scripts/relay-bet.ts runs it; print TaskId then the webhook-reported terminal status.
```

### Prompt 5.3 — the real mainnet proof run
```
With the small real Base-mainnet USDC reserved, execute ONE real relay on Base mainnet: a
minimal 7710 execution through the 1Shot mainnet relayer, 7702 upgrade, gas paid in USDC,
status via webhook. Capture TaskId, tx hash, and the webhook payload into PROOF.md. This is
the 1Shot-track evidence the competition is missing.
```

### Prompt 5.4 — the dashboard (where the UX track is won)
```
Build the Next.js dashboard (use the frontend-design skill; dark, fast, legible).
- Mandate panel: cap, spent, remaining, expiry countdown, allowed targets, GRANT (triggers
  the kit signing on screen) and REVOKE.
- The duel, live: two budget bars (Bull / Bear) draining as they buy evidence, each side's
  Venice rationale + verdict card, and the net resolving into a YES/NO position (or ABSTAIN).
- 1Shot status: the webhook flipping pending → success, gas-in-USDC noted.
- The revert state: an over-cap attempt visibly refused by the enforcer.
- Audit trail: every action with a linked tx hash.
No fabricated data — every number comes from a real call. Wire REVOKE to disable redemption.
```
**Acceptance:** one real Base-mainnet relay completes, gas in USDC, webhook = success on screen; dashboard shows only real state; revoke halts the agents. → COMMIT phase 5.

---

## PHASE 6 — Proof, story, submission

### Prompt 6.1 — README + cleanup + proof
```
README.md: one-paragraph pitch (a mandate, not your keys; two funded enemies, the chain is
the referee), the architecture diagram from BUILD_GUIDE, a "tracks → how each requirement is
met" table, setup steps, and the live demo link. Remove dead code and console noise. Verify
PROOF.md has: in-cap hash, the revert error, both sub-cap reverts, the net-bet hash, the
abstain case, and the mainnet 1Shot TaskId + hash + webhook payload.
```

### Prompt 6.2 — 4 slides + video script
```
4-slide outline: (1) the problem — funding an agent means trusting it; (2) the answer — an
on-chain mandate the chain enforces + adversarial conviction; (3) the demo — the duel, the
net bet, the 1Shot mainnet relay; (4) why it matters beyond the hackathon. Then a <3-min
video script following BUILD_GUIDE's shot list: cold-open on the revert, the single mandate
signing (kit in main flow), the duel with Venice verdicts on screen, the net bet, the 1Shot
webhook flipping to success.
```

### Prompt 6.3 — competitive analysis
```
Short competitive-analysis section: how CROSSFIRE differs from the field — adversarial,
prediction-market-native conviction (not cooperative weighting), real on-chain-metered costly
signal (not simulated), Venice as the only engine (not a muddied multi-model claim), and a
real Base-mainnet 1Shot relay with webhooks (not a testnet feasibility test). Tie each point
to the permission-sharing and UX judging criteria.
```

### Submission checklist
- [ ] Submitted to: Best A2A coordination, Best x402 + ERC-7710, Best use of Venice AI, Best Use of 1Shot Relayer.
- [ ] Video shows the kit in the main flow. Non-negotiable.
- [ ] Venice shown in the main flow producing the verdict + card. No other model anywhere.
- [ ] 1Shot mainnet relay + 7702 upgrade + webhook evidenced in PROOF.md.
- [ ] The revert is in the video, ideally the cold open.
- [ ] Social: journey posts across the week, @MetaMaskDev tagged.
- [ ] Feedback entry: specific, constructive notes on the kit docs, the 1Shot relayer skill, and Venice's API.

---

## The links, in one place

MetaMask Smart Accounts Kit
- Execute on smart account's behalf: https://docs.metamask.io/smart-accounts-kit/guides/delegation/execute-on-smart-accounts-behalf/
- Redelegation: https://docs.metamask.io/smart-accounts-kit/guides/delegation/create-redelegation/
- Execute on MetaMask user's behalf (ERC-7715): https://docs.metamask.io/smart-accounts-kit/guides/advanced-permissions/execute-on-metamask-users-behalf/
- Supported ERC-7715 permissions: https://docs.metamask.io/smart-accounts-kit/get-started/supported-advanced-permissions/
- Advanced permissions redelegation: https://docs.metamask.io/smart-accounts-kit/guides/advanced-permissions/create-redelegation/
- x402 overview: https://docs.metamask.io/smart-accounts-kit/guides/x402/overview/
- x402 seller: https://docs.metamask.io/smart-accounts-kit/guides/x402/seller/
- x402 buyer with delegations: https://docs.metamask.io/smart-accounts-kit/guides/x402/buyer/delegations/
- x402 recurring payments: https://docs.metamask.io/smart-accounts-kit/guides/x402/buyer/recurring-payments/
- Kit GitHub: https://github.com/MetaMask/smart-accounts-kit

1Shot API
- Relayer quickstart / docs / skills: https://1shotapi.com/docs/quickstarts/gas-sponsorship-eip7710
- Public relayer skill: https://1shotapi.com/docs/skills

Venice AI
- About / docs: https://docs.venice.ai/overview/about-venice
- Skills: https://github.com/veniceai/skills
- x402 client: https://github.com/veniceai/x402-client

x402
- Coinbase x402 docs: https://docs.cdp.coinbase.com/x402/welcome
