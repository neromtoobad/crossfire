# PHASE_0_CHECKLIST.md — before you write a line of build code

Tick every box. Phase 0 failures are what kill hackathon weekends, not the hard parts.

## Accounts and keys
- [ ] Venice account + API key (`VENICE_API_KEY`). Confirm a chat call works against `https://api.venice.ai/api/v1`.
- [ ] Two EOAs generated for dev (user/delegator + agent/delegate). Private keys in `.env`, never committed.
- [ ] A third EOA if you are doing A2A (manager + bull + bear can reuse derived keys, but keep them separate).
- [ ] A funding wallet you control on Base for the mainnet proof run.

## Funds
- [ ] Base Sepolia ETH in the relevant accounts (faucet).
- [ ] Base Sepolia USDC in the user smart account (for delegated spend + x402 test payments).
- [ ] A small amount of real Base mainnet USDC (a few dollars) reserved for the single 1Shot mainnet proof relay.
- [ ] Verified the current USDC contract address per network against Circle's official list. Recorded both in `.env`.

## Repo and tooling
- [ ] `npx create-next-app@latest crossfire --typescript` (App Router).
- [ ] Installed: `viem`, `@metamask/smart-accounts-kit`, `openai`, `dotenv`. (`venice-x402-client` if doing the wallet-pay Venice path.)
- [ ] Foundry installed for the market contract (`foundryup`).
- [ ] `git init`, and **git identity set**: `git config user.name` and `git config user.email` to the identity you want on the commits.
- [ ] `.gitignore` covers `.env`, `node_modules`, `out`, `cache`, `.next`.

## Skills setup for Claude Code (this is your edge as a vibecoder)

Two different layers — don't confuse them.

**Layer 1 — context, auto-read (no install).**
- [ ] `CLAUDE.md` sits at the repo root. Claude Code reads it every session automatically. Nothing to install.
- [ ] `BUILD_GUIDE.md`, `EXECUTION_PLAN.md`, `PHASE_0_CHECKLIST.md` at root too — not auto-read, but CLAUDE.md points to them and you paste from them.

**Layer 2 — skills, installed individually (project scope, travels with the repo).**

A skill is a folder with a `SKILL.md` inside. Project scope lives in `.claude/skills/` and ships with the repo; user scope (`~/.claude/skills/`) applies to all your projects. Use project scope here.

```bash
# from the repo root
mkdir -p .claude/skills/1shot-relayer
# download the public relayer skill artifact from https://1shotapi.com/docs/skills
# and place its SKILL.md (+ any scripts/) inside .claude/skills/1shot-relayer/

mkdir -p .claude/skills/venice
# copy the relevant skill folder (its SKILL.md) from
# https://github.com/veniceai/skills into .claude/skills/venice/
```

If either ships as a published plugin instead of a raw SKILL.md, use the built-in system rather than copying files:
```bash
# inside a Claude Code session
/plugin            # browse + install
# or from the terminal
claude plugin install <name>@<marketplace>
```

- [ ] 1Shot relayer skill installed (do this one — it keeps Claude Code from guessing the relayer param shapes).
- [ ] Venice skill installed (optional — agent-tooling patterns).
- [ ] Started a fresh Claude Code session after installing, so the skills load.
- [ ] Confirmed they loaded: ask Claude Code to list active skills, or watch it reference them on the first relevant call.

**Note:** your personal Claude.ai skills (anti-slop, the hackathon workflow) do NOT carry into Claude Code. Different product, different skills folder. The key rules from those already live inside `CLAUDE.md` — keep it that way rather than reinstalling them here.

## Sanity checks (do these before Phase 1)
- [ ] `relayer_getCapabilities` returns successfully and lists Base + an accepted USDC fee token. Save the response.
- [ ] A bare Venice chat completion returns text. A Venice call with `venice_parameters.enable_web_scraping = true` returns content from a URL you pass.
- [ ] You can create a `toMetaMaskSmartAccount` and read its `.address` and `.environment` without error.
- [ ] You know which prediction market you are betting into: for the demo, your own deployed binary market on Base Sepolia. (Live mainnet markets are out of scope for the build window.)

## Documents staged
- [ ] `CLAUDE.md` at repo root.
- [ ] `BUILD_GUIDE.md` open in a tab.
- [ ] `EXECUTION_PLAN.md` open — you will paste from it phase by phase.
- [ ] A scratch `PROOF.md` to paste tx hashes, the mainnet relay TaskId, and screenshots into as you go.

## Social track, started now (not on day 7)
- [ ] Posted a "starting the MetaMask x 1Shot x Venice build" note, tagged @MetaMaskDev, in your voice.
- [ ] Decided your cadence: one short journey post per build day.

When every box is ticked, start Phase 1. Not before.
