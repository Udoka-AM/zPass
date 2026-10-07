# 1. Product Requirements Document (PRD): zPass

**Purpose:** Define what the product must do and how success will be measured.

| | |
|---|---|
| Owner | Udoka (Udoka-AM) |
| Track | Zecathon **Wildcard** (+ Grand Prize). A Core & Tooling entry is the fallback, framed as an SDK |
| Status | Approved for build, v0.1 |
| Build window | Oct 6 – Oct 26, 2026. Submission deadline Oct 28, 23:59 UTC |
| Related | [PRODUCT.md](PRODUCT.md), [02-TRD.md](02-TRD.md), [06-IMPLEMENTATION-PLAN.md](06-IMPLEMENTATION-PLAN.md) |

---

## 1.1 Product name and one-sentence idea

**zPass**: anonymous membership for Zcash communities. Holders prove "I hold a zkSNARK" (or any Zcash-community credential) to unlock chats, votes and perks, without revealing which item, which address or who they are.

**Problem solved:** Zcash community assets (e.g. the 10K zkSNARKs "shielded identities") have no private utility. Ownership is a row in an issuer database, and today's login (a memo code sent to a shielded address) breaks when wallets rotate addresses and links every use back to one holder. zPass turns holding into a reusable, address-independent zero-knowledge pass that even the issuer can't link to usage.

## 1.2 Target users

| User | Who they are | What they need |
|---|---|---|
| **Holder** | Owns a zkSNARK item (or another Zcash-community credential, e.g. a Zcon7 attendee pass). Many of the 42K wallets created by the September auction | Get into holder chats, vote and claim perks without exposing which item they own, their address or their identity, and without re-proving every time they change wallets |
| **Community / app developer** | Runs a Telegram group, a poll, a web app or an airdrop for a Zcash community | Gate access to real holders in ~15 lines of code, with one-use-per-scope guarantees, without running crypto infrastructure |
| **Issuer** | Zilkroad, zkSNARKs team, conference organisers, DAOs | Turn their holder list into private credentials with a public, auditable root history, and handle transfers |
| **Auditor / sceptic** | Community members, judges, journalists | Verify the issuer can't equivocate (show different groups to different apps) by reading a Zcash-anchored root log |

## 1.3 Problem and current workaround

| Pain point | What users do today | Why it fails |
|---|---|---|
| No private utility for Zcash community assets ("no utility" critique of zkSNARKs) | Nothing, or public Discord roles via wallet connect on other chains | Public roles doxx holdings. Zcash has no wallet-connect standard |
| Address-based login breaks | Zilkroad memo-code login to a shielded address | Broke when wallets rotated addresses. Needed a hotfix |
| Every use is linkable | Re-send a memo or reveal an address per app | Apps and the issuer can correlate a holder across all uses |
| Double voting and sybils in community polls | Honour system, or reveal identity to vote | Either cheatable or not private |
| Issuer can show different member lists to different apps | Trust the issuer | No public, append-only log |

## 1.4 Goal and success measure

**Goal:** ship the first Zcash-anchored anonymous membership layer that real holders use, with real integrations, and an issuer that provably can't link usage to holders.

| Outcome | Measurable signal | Target (by Oct 26) |
|---|---|---|
| Real usage | Enrolled testers in the demo collection | ≥ 50 |
| Anonymous voting works | Votes in one live poll, double votes rejected | ≥ 1 poll with ≥ 30 votes. 100% of duplicate attempts rejected |
| Private gated chat | Live Telegram group gated by zPass | ≥ 1 live group |
| Zcash-anchored transparency | Roots posted to mainnet in shielded memos with a public viewing key | Every epoch root on mainnet. Beacon scanner reproduces 100% of the root history |
| Developer adoption | `@zpass/verify` on npm, integration time | Published. Quickstart ≤ 15 lines. ≥ 1 outside project expressing intent to integrate |
| Proof UX | Browser proof generation time (mid-range phone) | p50 < 5 s |

## 1.5 Core features

| # | Feature | User benefit | Priority |
|---|---|---|---|
| F1 | **Issuer service**: groups of identity commitments, one per held item, with enrolment after ownership verification | Holders get a credential tied to holding, not to an address | **P0** |
| F2 | **Memo-challenge enrolment** (mirrors Zilkroad login, done once): the issuer sends a code in a shielded memo to the holder's address on record, and the holder types it in. Backed by a mock-Zilkroad holder DB | Proves control of the holder's shielded address once, at enrolment only | **P0** |
| F3 | **Local identity** (Semaphore v4) derived from a passphrase or wallet-seed-derived secret, with backup/export | The secret never leaves the device. The pass survives wallet and address changes | **P0** |
| F4 | **Epoch batching** (default hourly) of enrolments and transfers | Blurs enrolment and transfer timing to protect the anonymity set | **P0** |
| F5 | **Root Beacon**: each epoch root posted in a shielded memo to a beacon address with a **public viewing key**. Beacon scanner rebuilds the root log | Anyone can audit roots. The issuer can't equivocate | **P0** |
| F6 | **Browser prover** (Web Worker) generating membership proof + **scope nullifier** | Prove membership in seconds without revealing which member | **P0** |
| F7 | **Verifier SDK** `@zpass/verify` + REST verifier: proof valid, root in beacon log, nullifier unused for scope, minimum anonymity set | Apps gate on zPass in ~15 lines | **P0** |
| F8 | **Anonymous poll app**: one vote per item per poll, public live tally | Communities vote privately without double voting | **P0** |
| F9 | **Telegram gate bot** (grammY): prove → one-time invite link. Bot stores only the nullifier | Holders join private chats without revealing which item they hold | **P0** |
| F10 | **Holder dashboard**: passes, backup/export, recovery, enrolment status | Holders manage their identity safely | **P1** |
| F11 | **Transfer handling**: simulated sale removes the seller's leaf and adds the buyer's in the next epoch | Credentials follow ownership | **P1** |
| F12 | **"Sign in with zPass"** OIDC-style redirect with a pairwise pseudonymous `sub` (= scope nullifier) | Web apps add private holder login | **P1** |
| F13 | **Issuer Docker image** + `@zpass/sdk` | Other issuers run zPass for their own communities | **P1** |
| F14 | **Holder-of-ZEC mode** via ZAIR-style proofs ("I hold ≥ X shielded ZEC") | Gate on shielded holdings | **P2 (stretch, only if the ZAIR spike says go)** |
| F15 | Discord gate bot | Reach Discord communities | **P2 (stretch)** |

## 1.6 Out of scope for version one

- On-chain ownership via ZSAs (not live). The issuer DB is the ownership source of truth, documented honestly.
- Real Zilkroad integration, unless Zilkroad cooperates during the window. The mock issuer DB is the default.
- Halo2 or Noir circuit port (no trusted setup). It's on the roadmap. v1 uses Semaphore v4 (audited, completed ceremony).
- Preventing credential lending. No credential system can stop a holder from sharing their secret.
- Native mobile apps. The prover runs in mobile browsers.
- Paid tiers, billing and the hosted multi-tenant issuer SaaS.
- Reputation scores, cross-community identity graphs, on-chain verification contracts.

## 1.7 User stories

**Holder**
- As a **holder**, I want **to connect my holdings once by typing the code the issuer sends to my wallet**, so I can **get a pass without revealing my address to any app later**.
- As a **holder**, I want **my zPass identity created and stored only in my browser with a backup phrase**, so I can **recover it on a new device**.
- As a **holder**, I want **to tap the bot link and prove membership**, so I can **join the holders' Telegram without revealing which item I own**.
- As a **holder**, I want **to vote anonymously in a poll**, so I can **express my view without the issuer or anyone else knowing it was me**.
- As a **holder**, I want **my pass to keep working after I change wallets or addresses**, so I can **stop re-proving ownership**.

**Developer**
- As a **community developer**, I want **to call `verify(proof, { group, scope, minAnonSet })`**, so I can **gate my app on holders in ~15 lines**.
- As a **Telegram admin**, I want **to add the zPass bot to my group and choose the issuer group**, so I can **gate the chat without writing code**.

**Issuer**
- As an **issuer**, I want **each epoch's root posted automatically to the Zcash beacon**, so I can **prove to everyone that I show the same group to all apps**.
- As an **issuer**, I want **transfers batched per epoch**, so I can **keep membership accurate without leaking who sold to whom**.

**Auditor**
- As an **auditor**, I want **to rebuild the root history from the published beacon viewing key**, so I can **confirm verifiers accept only roots the issuer published publicly**.

## 1.8 Acceptance criteria

| ID | Given [starting state] | When [action] | Then [observable result] |
|---|---|---|---|
| AC1 | A holder owns item #1234 in the mock holder DB, linked to their shielded address | they request enrolment, read the `ZPC:<code>` memo the issuer sent to that address, and type the code | the issuer marks the challenge verified and accepts their identity commitment as `pending` for the next epoch. A wrong or expired code is rejected |
| AC2 | A holder has no identity yet | they create one with a passphrase | the identity secret is stored encrypted in IndexedDB, a backup phrase is shown and confirmed, and only the commitment is sent to the issuer |
| AC3 | Pending commitments exist and the epoch ends | the epoch batcher runs | the new root is computed, posted in a shielded memo to the beacon address, and the commitments become `active` |
| AC4 | The beacon viewing key is published | anyone runs the beacon scanner | the rebuilt root history equals the issuer's `epochs` table exactly (root, size, epoch number) |
| AC5 | An active member opens a gated action with scope S | they generate a proof in the browser | a proof is produced in < 5 s (p50, mid-range phone) and reveals only root, scope, nullifier and message |
| AC6 | A proof for scope S | the verifier checks it | it is accepted only if the proof is valid, the root is a beacon root within the freshness window, the group size at that root ≥ `minAnonSet`, and the nullifier is unused for S |
| AC7 | A member has voted in poll P | they try to vote again, from any device or browser | the verifier rejects with `NULLIFIER_USED` and the UI shows "already voted with this pass" |
| AC8 | A Telegram user DMs the bot | they complete the proof on the prover page | the bot sends a one-time invite link (member limit 1, 10-min expiry), and the bot DB contains only the nullifier and a timestamp |
| AC9 | The group has fewer than `minAnonSet` members at the root | a proof is submitted | the verifier rejects with `ANON_SET_TOO_SMALL` |
| AC10 | Two apps with different scopes | the same member proves to both | the nullifiers differ and can't be correlated |
| AC11 | Item #1234 is sold to another holder | the next epoch runs | the seller's leaf is removed and the buyer's added in the same batch, and the seller's proofs against new roots fail |
| AC12 | An issuer operator inspects its own DB and the votes table | they try to match votes to holders | there is no column or log that links a nullifier to a commitment, item or account (demo + reasoning in the threat model) |
| AC13 | A developer installs `@zpass/verify` | they follow the quickstart | a working gate runs in ≤ 15 lines of integration code |

## 1.9 Open questions

| # | Question | Default if not decided by | Deadline |
|---|---|---|---|
| Q1 | Which librustzcash / Zebra / Zaino versions support Ironwood + NU7 testnet for the beacon poster and scanner? | Pin the newest pre-releases that pass the M1 spike. Record in `docs/VERSIONS.md` | Oct 9 |
| Q2 | Does ZAIR support Ironwood notes (holder-of-ZEC mode)? | No-go. List as roadmap | Oct 10 (half-day spike) |
| Q3 | Will Zilkroad/zkSNARKs share a holder API or webhook? | Mock-Zilkroad DB with 10K items. Send them an integration spec in Week 3 | Oct 20 |
| Q4 | Epoch length: 1 h default, or shorter for the live demo? | 1 h in production, 5 min on testnet staging | Oct 13 |
| Q5 | Minimum anonymity set for the demo (plan says ≥ 100), given a ~50-tester target? | Default `minAnonSet = 25` for the demo collection, 100 recommended in docs. Seed the group with decoy-free real testers only | Oct 13 |
| Q6 | Root freshness window: how many past epochs may a proof reference? | Last 24 epochs (24 h) | Oct 13 |
| Q7 | Merkle tree depth (Semaphore supports 1–32)? | Depth 20 (≈ 1M members) | Oct 9 |
| Q8 | Identity derivation from a wallet seed: which derivation (ZIP-32 path or a signed message)? | Passphrase-derived identity in v1. Wallet-derived as a stretch once a wallet exposes a signing API | Oct 12 |
| Q9 | Domain (`zpass.app` or similar) and the bot username | Vercel default domain. Bot `@zpass_gate_bot` if free | Oct 15 |
| Q10 | Who funds the mainnet beacon (≈ 24 memo txs/day at ZIP-317 fees)? | Udoka funds a small beacon wallet (~0.05 ZEC covers the window) | Oct 20 |
| Q11 | Licence: dual MIT/Apache-2.0? | Yes (scaffold ships both) | Done |
