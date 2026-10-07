# 6. Implementation Plan: zPass

**Purpose:** Give the AI agent an ordered build sequence with checkpoints.

**Owners:** **A** = proofs, issuer, beacon. **B** = frontend, bot, SDK/docs, demo. "Agent" = AI coding agent working under that owner's review.

**Rule before moving to the next milestone:** run the app, verify the milestone's acceptance criteria (IDs from [01-PRD.md §1.8](01-PRD.md#18-acceptance-criteria)), and record any unresolved issue as a GitHub issue labelled `carry-over`.

| Milestone | Dates (2026) | Exit check |
|---|---|---|
| M1 Project setup | Oct 6–9 | CI green. Testnet node synced. Semaphore proof generated in the browser and verified in Node |
| M2 Data and auth | Oct 9–12 | Schemas + roles migrated. Enrolment via memo challenge. Root posted to the testnet beacon and rebuilt by the scanner (AC1–AC4) |
| M3 Core user journey | Oct 13–17 | Prove → verify against beacon roots. Polls and the Telegram gate work on testnet (AC5–AC10) |
| M4 Secondary features | Oct 16–22 | Transfers, dashboard, backup/restore, Sign in with zPass, SDK published (AC11, AC13) |
| M5 Quality | Oct 20–24 | Security review, issuer-unlinkability demo (AC12), accessibility, performance |
| M6 Release | Oct 23–28 | Mainnet beacon live, ≥ 50 testers, poll ≥ 30 votes, `v0.1.0`, submitted by Oct 27 |

---

## Milestone 1: Project setup (Oct 6–9)

| # | Task | Owner | Inputs | Output | Definition of done | Depends on |
|---|---|---|---|---|---|---|
| 1.1 | Repo scaffold, licences, CI | A + Agent | This doc set | pnpm workspace (web, issuer, verifier, bot, sdk, verify, db), Rust beacon crate, `ci.yml` | ✅ Done in the initial commit. CI passes on `main` | — |
| 1.2 | Pin Zcash crate versions for the beacon | A | NU7 testnet, crates.io | `docs/VERSIONS.md`, beacon `Cargo.toml` deps | `cargo build -p zpass-beacon` with librustzcash crates (PRD Q1) | 1.1 |
| 1.3 | VM with Zebra + Zaino (testnet) + Postgres | A | Hetzner, `infra/docker-compose.yml` | Synced testnet node, TLS endpoints | `grpcurl` returns the latest block | 1.1 |
| 1.4 | Start mainnet node sync | A | Same compose | Syncing mainnet node | Started by Oct 9, synced by Oct 13 | 1.3 |
| 1.5 | **Semaphore v4 spike** | A + Agent | `@semaphore-protocol/*` | `packages/sdk` identity + proof helpers, Node verify test | Browser (Worker) proof for a 32-member group verifies in Node. Timings recorded (PRD AC5 baseline) | 1.1 |
| 1.6 | Self-host proving artefacts + checksums | A | Semaphore artefacts for depth 20 | `apps/web/public/artifacts/*`, `scripts/fetch-artifacts.ts`, checksums in CI | No third-party requests during proving (checked in the browser network tab) | 1.5 |
| 1.7 | ZAIR spike (half a day) | A | ZAIR repo/docs | `docs/spikes/zair.md` | Go/no-go for holder-of-ZEC mode recorded (PRD Q2) | — |
| 1.8 | Web shell + design tokens | B + Agent | [04-UI-UX-BRIEF.md](04-UI-UX-BRIEF.md) | Layout, nav, tokens, fonts | `pnpm build` passes. Lighthouse a11y ≥ 95 on the shell | 1.1 |
| 1.9 | Vercel project + previews | B | Repo | Preview per PR | A PR shows a working preview | 1.8 |

## Milestone 2: Data and auth (Oct 9–12)

| # | Task | Owner | Inputs | Output | Definition of done | Depends on |
|---|---|---|---|---|---|---|
| 2.1 | DB roles + schemas + Drizzle tables | A + Agent | [05-BACKEND-SCHEMA.md](05-BACKEND-SCHEMA.md) | `packages/db` schema + migrations + seed | Migrations apply on a clean DB. The verifier role can't `SELECT issuer.members` (test) | 1.1 |
| 2.2 | Issuer: groups, mock holder DB seed, challenges | A + Agent | 2.1 | `/v1/enrol/challenge`, `/v1/enrol/verify` | Rate limits + attempt limits tested | 2.1 |
| 2.3 | Challenge sender (shielded memo `ZPC:`) | A | 1.2, 1.3 | `zpass-beacon send-challenge` subcommand used by the issuer | A testnet wallet receives the memo. AC1 | 1.2, 2.2 |
| 2.4 | Enrol commit + per-item identity derivation | A + Agent | §5.6 | `/v1/enrol/commit`, `packages/sdk/src/identity.ts` | Members `pending`. One live leaf per item enforced | 2.2, 1.5 |
| 2.5 | Epoch batcher + LeanIMT root | A + Agent | 2.4 | Issuer job | Root matches `@semaphore-protocol/group` for the same leaves. Removals zero the leaf | 2.4 |
| 2.6 | Beacon poster | A | 1.2 | `zpass-beacon post` | Memo `ZP1:…` lands on testnet. `epochs.status = posted → confirmed`. AC3 | 2.5 |
| 2.7 | Beacon scanner → `verifier.beacon_roots` | A | 2.6, public viewing key | `zpass-beacon scan` + verifier sync job | Rebuilt history equals `issuer.epochs`. AC4 | 2.6 |
| 2.8 | App API keys | A + Agent | §5.6 | `/v1/apps`, bearer auth middleware | Tests: valid, revoked, missing | 2.1 |
| **Exit** | **Enrol 3 test holders → root posted to Zcash testnet → rebuilt by the scanner.** | | | | | |

## Milestone 3: Core user journey (Oct 13–17)

| # | Task | Owner | Inputs | Output | Definition of done | Depends on |
|---|---|---|---|---|---|---|
| 3.1 | `@zpass/verify` core | A + Agent | 1.5, 2.7 | `verify(proof, {group, scope, minAnonSet, rootWindow})` with pluggable root + nullifier stores | Unit tests for every rejection code (`INVALID_PROOF`, `UNKNOWN_ROOT`, `STALE_ROOT`, `ANON_SET_TOO_SMALL`, `NULLIFIER_USED`, `SCOPE_MISMATCH`, `MESSAGE_MISMATCH`). AC6, AC9, AC10 | 1.5 |
| 3.2 | Verifier REST `POST /v1/verify` + scopes | A + Agent | 3.1, 2.8 | Endpoint + atomic nullifier insert | Concurrency test: 2 simultaneous identical proofs → exactly 1 accepted | 3.1 |
| 3.3 | Enrol UI S2–S6 | B + Agent | [03-APP-FLOW.md](03-APP-FLOW.md) | Screens + vault (encrypted IndexedDB) | A tester enrols from a phone on staging. AC2 | 2.4 |
| 3.4 | Prover component S8–S9 (Web Worker) | B + A | 1.5, 1.6 | `apps/web/src/lib/prover` | p50 < 5 s on a mid-range phone. AC5 | 1.6, 3.3 |
| 3.5 | Polls: API + S11 + S13 | B + Agent | 3.2 | Poll endpoints, tally, screens | Vote counted. Second vote rejected. AC7 | 3.2, 3.4 |
| 3.6 | Telegram gate bot | B | 3.2, bot token | `apps/telegram-bot` (`/start`, `/gate`, `/ungate`, prove callback) | Invite link (limit 1, 10 min) after a valid proof. The bot persists no user IDs. AC8 | 3.2, 3.4 |
| 3.7 | Telegram prove page S10 | B + Agent | 3.6 | Screen | End-to-end join on staging | 3.6 |
| **Exit** | **20+ test identities. Telegram gating and polls work on testnet roots. A double vote is rejected.** | | | | | |

## Milestone 4: Secondary features (Oct 16–22)

| # | Task | Owner | Inputs | Output | Definition of done | Depends on |
|---|---|---|---|---|---|---|
| 4.1 | Transfer handling | A | 2.5 | `/v1/admin/transfers`, batcher removes + adds | AC11 | 2.5 |
| 4.2 | Holder dashboard S7 + backup/restore S14 | B + Agent | 3.3 | Screens | Restore on a second browser recovers passes | 3.3 |
| 4.3 | Sign in with zPass (S12 + OIDC endpoints) + example app | B + A | 3.2 | `/signin`, `/v1/oidc/token`, `examples/signin-next` | Example app shows a pseudonymous `sub`. Two apps get different `sub` | 3.2, 3.4 |
| 4.4 | Publish `@zpass/sdk` + `@zpass/verify` (0.1.0-beta) | B | 3.1 | npm packages with provenance | `npm i @zpass/verify` + the 15-line quickstart works in a fresh project. AC13 | 3.1 |
| 4.5 | Beacon explorer S15 + developers page S16 | B + Agent | 2.7 | Screens | Viewing key + CLI instructions reproduce the table | 2.7 |
| 4.6 | Holder-of-ZEC mode (only if the ZAIR spike said go) | A | 1.7 | Stretch feature or roadmap entry | Decision documented | 1.7 |
| 4.7 | Issuer Docker image | A + Agent | Issuer app | `ghcr.io/udoka-am/zpass-issuer` | `docker run` + env vars brings up an issuer | 2.5 |

## Milestone 5: Quality (Oct 20–24)

| # | Task | Owner | Inputs | Output | Definition of done | Depends on |
|---|---|---|---|---|---|---|
| 5.1 | Security review | A | TRD §2.7 | `docs/SECURITY-REVIEW.md` | No identity data leaves the browser. No IPs logged on prove/verify. Secrets audit. `pnpm audit` + `cargo audit` clean or justified | M3, M4 |
| 5.2 | Issuer-unlinkability demo | A | 3.5 | Scripted demo + `docs/THREAT-MODEL.md` section | The operator, with full DB access, can't map votes to holders (AC12). Reasoning documented | 3.5 |
| 5.3 | Error, empty, offline states | B + Agent | App Flow §3.7 | All states implemented | Each state reproduced and screenshotted | M3 |
| 5.4 | Accessibility pass (including the Telegram in-app browser) | B | Brief §4.8 | Fixes | axe: 0 serious issues. Keyboard-only enrol and vote | 5.3 |
| 5.5 | Performance pass | A + B | TRD §2.8 | `docs/evidence/perf.md` | Targets met or documented | M3 |
| 5.6 | Backup + restore drill (verifier DB first) | A | TRD §2.8 | Runbook in `infra/README.md` | Restore tested | 1.4 |

## Milestone 6: Release (Oct 23–28)

| # | Task | Owner | Inputs | Output | Definition of done | Depends on |
|---|---|---|---|---|---|---|
| 6.1 | Test plan run on staging | B | AC1–AC13 | `docs/evidence/test-run.md` | Every AC checked with evidence | M5 |
| 6.2 | Mainnet beacon + production deploy | A | Synced mainnet node, funded beacon wallet (PRD Q10) | Production stack | Epoch roots on mainnet. Viewing key published | 6.1 |
| 6.3 | Community demo: recruit testers | B | Zcash Telegram/X/forum posts | ≥ 50 enrolled testers | Stats on the home page | 6.2 |
| 6.4 | Live poll + gated Telegram group | B | 6.3 | Poll ≥ 30 votes. ≥ 1 live gated group | Public tally with re-verifiable proofs | 6.3 |
| 6.5 | Outreach: integration spec/PR to Zilkroad/zkSNARKs | A | SDK | Spec or PR link | Sent. ≥ 1 project expresses intent | 4.4 |
| 6.6 | Demo video + submission write-up | B | Evidence | ≤ 3-min video | Reviewed by both owners | 6.4 |
| 6.7 | Tag `v0.1.0`, publish packages 0.1.0 | A | `main` | GitHub release + npm | Release published | 6.6 |
| 6.8 | Submit | Udoka | Shielded UA for the prize | Submission | Submitted **by Oct 27** (hard stop Oct 28 23:59 UTC) | 6.7 |

**Rollback:** web via Vercel instant rollback. Services via `docker compose` with the previous image tag (`ZPASS_IMAGE_TAG`). Migrations are forward-only and backward compatible with the previous release. If the batcher misbehaves, set `ZPASS_EPOCHS_PAUSED=true`: verifiers keep accepting existing beacon roots within the window, so holders aren't locked out.

**Monitoring:** `/healthz` and `/readyz` on issuer, verifier and bot (DB, Zaino, beacon lag), checked every minute by an uptime monitor (Better Stack free tier). Alerts to the team Telegram for beacon post failure, scan lag > 4 blocks, verifier error rate > 5%. Structured JSON logs (pino), 7-day retention, IPs dropped on prove/verify routes.
