# AGENTS.md — CROSSFIRE

> Working codename: **CROSSFIRE**. The thesis in one line: a user hands an agent a *mandate* — a scoped, revocable, on-chain spending permission — not their keys. The chain, not the code, enforces the limit.

## What we are building

An autonomous prediction-market agent where two adversaries fight inside a budget the chain refuses to let them break.

A user signs **once** to grant a capped, expiring USDC mandate. An orchestrator redelegates two **opposed** sub-budgets — a **Bull** sub-agent and a **Bear** sub-agent — onto a single binary market. Each independently buys evidence via x402 (real USDC, metered on-chain by its delegation), reasons with Venice, and commits conviction by how much of its capped budget it is willing to stake on its side. The bet that actually hits the market is the **net of their conviction**: if Bull commits 18 and Bear commits 6, the market gets a YES bet sized by the 12 spread. If they cancel, the system places nothing and says the market is genuinely uncertain.

Neither agent can cheat its cap. Neither can talk past the enforcer. The combined position can never exceed the root mandate. That guarantee, proven live by a reverting transaction, is the entire submission.

## The mechanism (this is the moat)

**Adversarial conviction, metered on-chain.**

- Conviction is not a number an agent claims. It is USDC the agent spent buying evidence plus USDC it staked — both drawn from a delegation the chain caps. A bluffing agent literally cannot afford to look confident.
- The two agents are **opposed**, not cooperative. The net of their committed capital is the signal. This is a market, not a weighted average.
- Every drawdown is a real on-chain spend under a caveat enforcer. The costly signal is genuinely costly and genuinely on-chain — not simulated.

This is the part most ERC-7710 demos get wrong: their sub-agents are placeholder addresses that never redeem anything, so nothing is ever enforced. **Our Bull and Bear are real keypairs that redeem the full delegation chain through MetaMask's DelegationManager.** If it never redeems on-chain, it is a diagram, not a system. We ship the system.

## How we beat the field (built from the competitive read)

The baseline of this hackathon — capped 7710 delegation + redelegation + x402 + 1Shot + Venice — is now table stakes. Plumbing does not win. These three things do, and the field is fumbling all three at once:

1. **A sharp, copy-proof mechanism.** Cooperative orchestrator-weighting is taken. Adversarial netting on a prediction market is ours and is prediction-market-native.
2. **The stacked tracks, won cleanly.** Most submissions fumble these:
   - **Venice is the ONLY decision engine. No Groq, no fallback, ever.** If Venice is down, the agent does not decide. This makes the Venice-track claim airtight where competitors muddied theirs with "Venice / Groq."
   - **A real Base-mainnet 1Shot relay with a webhook.** Most do a testnet feasibility test or relay on the wrong chain. We do one real mainnet relay, 7702 upgrade, gas in USDC, status pushed via webhook (webhooks score higher than polling), captured in PROOF.md.
3. **The revert is the hero.** Every demo leads with the over-cap transaction reverting at the enforcer. That single transaction is what judges remember.

## Hackathon: MetaMask Smart Accounts Kit x 1Shot API x Venice AI Dev Cook Off

- Submissions close **June 15, 2026**.
- Anchor track: **Best x402 + ERC-7710**.
- Stacked: **Best use of Venice AI** + **Best Use of 1Shot Permissionless Relayer**.
- Headline track: **Best A2A coordination** — the adversarial duel IS the A2A story.
- Soft: **Social Media** (tag @MetaMaskDev, post from day one) + **Feedback**.

### Hard qualification rules (do not lose these)
- Demo video MUST show the Smart Accounts Kit working in the **main flow**.
- Venice must be **core** and shown in the **main flow**, producing a meaningful output. (We show its written verdict AND a generated verdict card on screen.)
- 1Shot: relay 7710 txns through the **mainnet** relayer AND use **7702** to upgrade the account. Webhooks > polling.
- A2A: must use **redelegation**. The Bull/Bear chain is redelegation.

## Chain strategy (honest, not hand-waved)

- Delegation, redelegation, redemption, and the revert proof run on **Base Sepolia** — free, fast, and where the enforcement story is told.
- x402 real settlement and the 1Shot relay are **Base mainnet**. So we do the real x402 evidence purchase and the real 1Shot relay **once on Base mainnet** with a few dollars of real USDC, and show the metered drawdown live. We design around the testnet/mainnet split openly instead of pretending it away — handling it cleanly is itself a strength.
- Always resolve the current USDC address per network from Circle's official list. Never hardcode an unverified address.

## Stack
- Next.js (App Router) + TypeScript, one repo, UI + API routes, deployed on Vercel as a single origin.
- `viem` for all chain interaction.
- `@metamask/smart-accounts-kit` (v1.5+): smart accounts, delegations, redelegation, caveats, encoding.
- Venice OpenAI-compatible API at `https://api.venice.ai/api/v1` — the only model provider in the repo.
- 1Shot relayer over JSON-RPC at `https://relayer.1shotapi.com/relayers`.
- Minimal Solidity binary market (Foundry): YES/NO shares, USDC collateral.

## Key API surface (verified, v1.5+)

Smart account:
```ts
import { Implementation, toMetaMaskSmartAccount } from '@metamask/smart-accounts-kit'
const acct = await toMetaMaskSmartAccount({
  client: publicClient,
  implementation: Implementation.Hybrid, // Stateless7702 when upgrading an EOA in-flight
  deployParams: [owner.address, [], [], []],
  deploySalt: '0x',
  signer: { account: owner },
})
```

Root mandate (capped, expiring):
```ts
import { createDelegation, ScopeType } from '@metamask/smart-accounts-kit'
import { parseUnits } from 'viem'
const root = createDelegation({
  from: userSmartAccount.address,
  to: orchestratorSmartAccount.address,
  scope: { type: ScopeType.Erc20TransferAmount, tokenAddress: USDC, maxAmount: parseUnits('50', 6) },
  caveats, // expiry/timestamp + allowed targets (market + facilitators) + per-call limit
  environment: userSmartAccount.environment,
})
const signature = await userSmartAccount.signDelegation({ delegation: root })
```

Redelegation to a sub-agent (Bull/Bear — the A2A chain):
```ts
const bullBudget = createDelegation({
  from: orchestratorSmartAccount.address,
  to: bullSmartAccount.address,
  scope: { type: ScopeType.Erc20TransferAmount, tokenAddress: USDC, maxAmount: parseUnits('20', 6) },
  parentDelegation: signedRoot, // narrows the parent, never expands it
  environment: orchestratorSmartAccount.environment,
})
```

Open delegation for x402 buyer (restricted to the facilitator):
```ts
import { createOpenDelegation, CaveatType, ScopeType } from '@metamask/smart-accounts-kit'
const d = createOpenDelegation({
  from: buyerSmartAccount.address,
  environment: buyerSmartAccount.environment,
  scope: { type: ScopeType.Erc20TransferAmount, tokenAddress: accepted.asset, maxAmount },
  caveats: [{ type: CaveatType.Redeemer, redeemers: accepted.extra.facilitators }],
})
```

x402 payment payload (ERC-7710 method):
```ts
import { encodeDelegations } from '@metamask/smart-accounts-kit/utils'
const permissionContext = encodeDelegations([signedDelegation]) // chain order is LEAF-TO-ROOT
const paymentPayload = {
  x402Version: 2,
  accepted,
  payload: { delegationManager: buyer.environment.DelegationManager, permissionContext, delegator: buyer.address },
}
// base64 the JSON → PAYMENT-SIGNATURE header
```

1Shot relayer JSON-RPC:
- `relayer_getCapabilities` first — confirm Base + accepted USDC fee token.
- `relayer_getFeeData` — returns a locked fee context to include in the submission.
- `relayer_send7710Transaction` — same-chain fee + execution → TaskId.
- `relayer_getStatus` — fallback; prefer webhook via `destinationUrl`.
- First use: one EIP-7702 `authorizationList` entry upgrades the signer to a `7702StatelessDelegator` in-flight.

Venice (the only provider):
```ts
import OpenAI from 'openai'
const venice = new OpenAI({ apiKey: process.env.VENICE_API_KEY, baseURL: 'https://api.venice.ai/api/v1' })
// reasoning: venice_parameters.enable_web_scraping = true to read live market context
// verdict card: Venice image endpoint renders the on-screen YES/NO verdict (visible Venice output)
```

## Footguns (bake these in)
- **Deploy the delegator/orchestrator smart account before redeeming.** Counterfactual (never-deployed) accounts holding 0 USDC fail ERC-1271 signature validation in the DelegationManager. Source the proof from a deployed, funded account.
- **Delegation chain order is LEAF-TO-ROOT** when encoding `[sub, ..., root]`.
- **Each child's `delegator` must equal the parent's `delegate`** or redemption throws invalid-delegate.
- USDC is 6 decimals — always `parseUnits(x, 6)`.
- The x402 buyer's open delegation must restrict the redeemer to the facilitator from `PAYMENT-REQUIRED`, or it is unsafe.
- Use `getSmartAccountsEnvironment` to resolve the kit environment per chain when the delegator is not yet a smart account.

## Build lessons (enforced)
- Small beats ambitious. One market, one duel, end to end, beats a sprawling system.
- Close the autonomous loop: sign once → agents fight → net bet lands → status returns. No human in the act.
- Real on-chain action wins. The revert and a real mainnet relay beat any simulation.
- Use both sponsor products in the core, not bolted on. Venice IS the decision. 1Shot IS the execution.
- No "first/only" overclaims. Frame as a working demonstration of a primitive.
- Configure git identity before the first commit. Copy code and commit yourself.

## Definition of done
A user signs one 50 USDC / 24h mandate. The orchestrator redelegates 20 USDC each to a Bull and a Bear on a real binary market. Both buy evidence via x402 (metered on-chain), Venice produces each side's written verdict and a verdict card on screen, and a net bet lands on-chain sized by their conviction spread. The execution is relayed once on Base mainnet through 1Shot — 7702 upgrade, gas in USDC, webhook status flips to success on screen. An over-cap attempt reverts live at the enforcer. Revoke halts everything. Every artifact has a tx hash in PROOF.md.

## Competitive intel — adapted mechanics (field read, do NOT copy the competitor)
A rival ("Clashboard": agents trade intelligence in a debate arena) is on the same stack and winning the social track by posting daily. Our edge is legibility ("five AI oracles call World Cup games, follow or fade them" — one sentence) + the event starts Thursday. Mechanics worth adapting, ranked by value/effort:

1. **Strict match state machine** (free quality, prevents live-demo breakage): `calls open → oracle debate → calls LOCK at kickoff → halftime updates → full time → settlement → receipts`. Nothing advances until the prior step settles. A match must not settle while Venice is mid-generation; calls must lock at kickoff or betting is meaningless.
2. **Oracle-to-oracle research commerce** (the big A2A+x402+7710+1Shot demo): each oracle produces a *priced, owned* intel artifact (ORION → lineup intel, ECHO → xG model). Before a call, an oracle can BUY another oracle's artifact via x402, paid from its delegated sub-budget through 1Shot, and the purchase trail is shown ("ECHO paid 2 USDC for ORION's intel before changing his read"). Money moving between oracles as they argue.
3. **User-facing premium reads** (already built — the x402 unlock): free tier = call + one line; ~2 USDC = full reasoning + sources + confidence. Same endpoint, pointed at humans.
4. **Venice voice** (demo gold, ~30 min): one TTS call per oracle line (Venice `audio/speech`, models like `tts-kokoro`/`tts-elevenlabs-turbo-v2-5`, 8 voices). Each oracle reads its call aloud in a distinct voice at settlement/halftime. Multiple Venice endpoints = Venice-track points.

**Skip / remember:**
- Do NOT build a custom x402 facilitator (resale-between-users) — infra-heavy, ate the rival's build. We only need oracle-to-oracle purchases → the hosted facilitator path handles it.
- **1Shot settlement-split trick:** one ERC-20 transfer per redemption. To pay BOTH the relayer fee AND a seller in one settlement, split into TWO transfers in the execution calldata. Remember this when wiring 1Shot settlement (don't build a facilitator for it).
- Buy Venice credits with USDC from a wallet (no card). Stack the METAMASK25 code.

Build order: state machine → research commerce → premium reads → voice. First two are substance; last two are the show. The cheapest win we keep leaving on the table is POSTING (the social track).
