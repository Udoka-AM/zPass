# zPass: Product Description

> Extracted from the Zecathon build plan (prepared 2026-10-05). In the original plan this product was called **zPass**; it ships as **zPass**.

*Prepared 2026-10-05. Build window: **3 weeks (Mon Oct 6 to Sun Oct 26, 2026)**, plus 2 buffer days before the **Oct 28, 23:59 UTC** deadline. Zcon7 runs Oct 27–29.*

> **Sources.** Figures come from thezecathon.com (site config), @zksnarks_ posts, crypto.news (Sep 21, 2026), the NEAR Intents explorer, nearstats.org, ZIP 318, Equilibrium's ZAIR write-up and Zcash forum threads.
>
> **Forecasts.** Revenue and volume numbers are **estimates built on stated assumptions**, not observed data. Treat them as pitch-ready scenarios and pressure-test them before quoting.

---

## 0. Hackathon ground rules

| Constraint | Effect on the build |
|---|---|
| One submission per account, **one track** | Two products means two accounts (separate teams/submitters). Pick each track deliberately. |
| Judged on **Privacy → Usefulness → Execution → Originality**. "Leaks are disqualifying, not deductions." | Every flow needs a written threat model. Never claim privacy you don't deliver. Working beats ambitious. |
| Code written during the window, open source at submission | Fresh repos from Oct 6. Libraries are allowed. |
| **Ironwood** (NU6.3) is live. Orchard is spend-only | Target Ironwood receivers and v6 transactions, not old Orchard tutorials. |
| **NU7 activates on testnet Oct 6** (25 s blocks, v4 tx invalid) | Pin Zebra, librustzcash and wallet versions that support NU7 testnet on day 1. |
| ZSAs (shielded assets) are **not live** | NFT "ownership" is issuer-side, as Zilkroad does it today. Design around that honestly. |
| Prize is paid in ZEC to a shielded address | Have a shielded UA ready for the submission form. |

---

**One-liner:** *Anonymous membership for Zcash communities. Prove "I hold a zkSNARK" (or any Zcash-community credential) to unlock chats, votes and perks, without revealing which item, which address or who you are.*

**Track:** **Wildcard** ($15K), plus a Grand Prize run. A Core & Tooling entry works if it is framed as an SDK. Wildcard fits the "identity/culture" story better.

## 1. Why this is a winning vertical

1. **It delivers what the organisers promised and were attacked for not shipping.**
   - zkSNARKs is a 10K "shielded identity" collection: its X bio reads "A collection of shielded identities stored on Zcash", with 23.4K followers.
   - Its pitch promised private ID, community access and reputation.
   - ZachXBT's central charge was "no utility". zPass *is* that utility.
2. **It fixes a real, current pain point.**
   - ZSAs aren't live, so ownership is a row in Zilkroad's database.
   - Zilkroad login uses a memo code sent to a shielded address. It broke when wallets rotated addresses, and they had to ship a fix.
   - zPass proofs don't depend on any address.
3. **Demand is validated by serious teams.** Equilibrium built **ZAIR** (private note-ownership proofs for airdrops, voting and gated access, with a Namada integration). The problem matters, and nobody has built the community/identity layer for Zcash apps.
4. **The scope is small and the cryptography is strong.** That matches "working beats ambitious". The proof systems are mature libraries, and the novelty is the Zcash-native issuer, root beacon and integrations.
5. **It is a horizontal primitive.** The same SDK serves any issuer: Zcash communities, conferences (a Zcon7 attendee pass), DAOs, airdrop campaigns, and later shielded-ZEC holder proofs via ZAIR.
6. **42,000 new wallets** came from the auction. Those users now need a reason to stay, and private community access is exactly that.

## 2. Product scope

| Component | What it does |
|---|---|
| **Issuer service** | Maintains a group of **identity commitments**, one per held item (or per credential). It enrols holders after verifying ownership: a mock-Zilkroad DB in the MVP, the real Zilkroad API if they cooperate. It handles transfers by removing the seller's leaf and adding the buyer's. |
| **Root Beacon (Zcash-native)** | Each new Merkle root is posted in the memo of a shielded transaction to a **beacon address whose viewing key is public**. That gives an append-only, Zcash-anchored transparency log anyone can audit. |
| **Prover (browser)** | Holds the user's secret identity locally (it can be derived from a wallet seed or a passphrase). It generates a membership proof plus a **scope-specific nullifier** (one per poll/app/item), so a credential can't be used twice in the same scope. |
| **Verifier SDK** | `@zpass/verify` (TS) + REST verifier. Checks the proof, that the root is in the beacon log, that the nullifier is unused for the scope, and the minimum anonymity set. |
| **Integrations (demo)** | (1) **Telegram gate bot**: join a private holders' chat. (2) **Anonymous poll**: one vote per item, with a public tally. (3) **"Sign in with zPass"** for web apps (OIDC-style). |
| **Holder-of-ZEC mode (stretch)** | Use **ZAIR**-style proofs to prove "I hold ≥ X shielded ZEC" without revealing the note, if ZAIR supports Ironwood. Otherwise list it as roadmap. |

### Threat model

| Adversary | Protected? | How / caveat |
|---|---|---|
| Verifier / app (Telegram, poll) | ✅ | The proof reveals only "member of group G at root R" + scope nullifier. No item ID, no address. |
| Issuer (even a malicious one) | ✅ for usage, ⚠️ for enrolment | The issuer knows commitment↔account at enrolment, but a proof doesn't reveal *which* commitment was used, so the issuer can't link usage to a holder. Timing caveat: enrolling and using it immediately while the group is small. Mitigations: **batched enrolment epochs** and a **minimum anonymity set** (e.g. ≥ 100 members) enforced by verifiers. |
| Cross-app tracking | ✅ | Nullifiers are scope-specific. Two apps can't correlate the same user. |
| Double voting / sharing | ✅ / ⚠️ | Nullifiers prevent double use within a scope. Lending your secret to someone else can't be prevented cryptographically, and no credential system prevents it. |
| Transfer correlation | ⚠️ | Removing and adding a leaf at sale time reveals that *some* membership changed when a sale happened. Batch updates per epoch to blur this. |
| Root equivocation (issuer shows different roots to different apps) | ✅ | The root beacon on Zcash is the single public log. Verifiers accept only beacon roots. |

## 3. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Membership proofs | **Semaphore v4** (`@semaphore-protocol/*`: identity, group, proof) | Audited, has a completed trusted-setup ceremony, browser-provable in seconds, built-in scope nullifiers. Fastest path to "it runs". |
| Alt / stretch prover | **Halo2** (no trusted setup, Zcash-aligned) or **Noir** | Port the circuit post-hackathon. Mention it on the roadmap. Judges may value no trusted setup. |
| Holder-of-ZEC mode | **ZAIR** (Equilibrium) | Verify Ironwood support in Week 1. Treat as a stretch. |
| Zcash anchoring | **librustzcash** / `zcash-devtool` + **Zebra** + Zaino/lightwalletd | Issuer posts roots via a shielded memo. The beacon UFVK/IVK is published. A scanner rebuilds the root log. |
| Ownership check (enrolment) | Mock-Zilkroad issuer DB + **memo-challenge login** (mirrors Zilkroad), or the Zilkroad API if they cooperate | The memo challenge proves control of a shielded address once, at enrolment only. |
| Backend | **TypeScript** (Node, Hono/Express) + Postgres/SQLite | Issuer, verifier, nullifier store, epoch batcher. |
| Frontend | **Next.js + TypeScript + Tailwind** | Holder dashboard, enrolment, proof generation, poll UI. |
| Integrations | **grammY** (Telegram bot), discord.js (stretch), OIDC-style redirect flow | Telegram first, since the Zcash community lives there. |
| Packaging | npm: `@zpass/sdk`, `@zpass/verify`. Docker compose for the issuer | "Add private holder gating in 15 lines." |

**Team assumption:** 2 people.
- **A:** proofs, issuer, beacon.
- **B:** frontend, bot, SDK/docs, demo.

## 4. Three-week build plan

### Week 1 (Oct 6–12): Proof and anchor core
- [ ] Repo, licence, CI. Pin Zebra/librustzcash for NU7 testnet.
- [ ] Semaphore v4 integration: identity derivation (from passphrase / wallet-seed-derived secret), group, browser proof, server verification.
- [ ] Issuer service v1: mock collection (10K item IDs), holder enrolment through the memo-challenge login, a commitment per item.
- [ ] Root Beacon: post the root in a shielded memo on testnet; beacon scanner rebuilds the root history from the published viewing key.
- [ ] ZAIR spike (half a day): does it support Ironwood notes? Decide go/no-go for holder-of-ZEC mode.
- **Exit criterion:** enrol 3 test holders → root posted to Zcash testnet → a proof generated in the browser verifies against the beacon root.

### Week 2 (Oct 13–19): Integrations people will use on Monday
- [ ] Verifier SDK + REST API. Nullifier store per scope. Minimum anonymity set check.
- [ ] **Telegram gate bot**: user DMs the bot → gets a link to the prover page → proves membership → receives a one-time invite to the holders' chat. The bot stores only the nullifier.
- [ ] **Anonymous poll app**: create a poll (scope), vote with a proof, public live tally, one vote per item.
- [ ] Transfer handling: simulated sale → leaf removed/added → new root batched into the next epoch.
- [ ] Holder dashboard: "your passes", backup/export identity, recovery.
- **Exit criterion:** 20+ test identities, Telegram gating and polls working on testnet roots. A double vote is rejected.

### Week 3 (Oct 20–26): Mainnet, polish, proof
- [ ] Move the beacon to **mainnet** (tiny shielded memo txs). Publish the beacon viewing key.
- [ ] "Sign in with zPass" redirect flow + example integration.
- [ ] Holder-of-ZEC mode (only if the ZAIR spike said go). Otherwise document it as roadmap.
- [ ] Docs: 15-line integration quickstart, threat model, architecture diagram.
- [ ] Live community demo: recruit ≥ 50 testers (Zcash Telegram/X) to enrol in a demo collection and vote in a poll.
- [ ] Outreach: send Zilkroad/zkSNARKs a working integration PR/spec (adoption signal for judges).
- **Buffer (Oct 27–28):** demo video, submission write-up, tag `v0.1.0`, submit.

## 5. MVP goal (definition of done)

1. **Working anonymous credential flow on mainnet.** Enrol, then root anchored in a Zcash shielded memo with a public viewing key, then a browser proof, then verification.
2. **Two real integrations.** A Telegram gated chat and an anonymous one-vote-per-item poll, both enforcing scope nullifiers and a minimum anonymity set.
3. **Issuer-unlinkability demonstrated.** A demo where even the issuer can't tell which holder voted, with the reasoning in the threat model.
4. **SDK published.** `@zpass/verify` on npm with a 15-line quickstart, so any Zcash app could gate on it Monday.
5. **Traction.** ≥ 50 real enrolled testers and ≥ 1 live poll with ≥ 30 votes.

## 6. User experience

**Holder:**
1. Visits zpass.app → "Connect holdings" → sends a tiny memo-challenge from their Zcash wallet (the same pattern as Zilkroad login, done once).
   - *Spec note:* shielded payments hide the sender, so the issuer can't verify a payment sent *by* the holder. The spec ([02-TRD.md §2.7](02-TRD.md#27-security-and-privacy)) reverses the direction: the issuer sends a code to the holder's address on record and the holder types it in.
2. Their zPass identity is created **locally in the browser** (backup phrase shown). Enrolment shows "joins the group at the next epoch (≤ 1 h)" to protect the anonymity set.
3. To join the holders' Telegram: tap the bot link → "Prove membership" → proof generated in ~2–5 s → one-time invite. The bot never sees which item or wallet.
4. To vote: open the poll → "Vote anonymously" → the proof includes the poll's nullifier → the vote is counted publicly. A second attempt shows "already voted with this pass".
5. Changing wallet addresses or wallets doesn't matter. The pass is independent of addresses.

**Community / app developer:**
1. `npm i @zpass/verify` → `verify(proof, { group: "zksnarks", scope: "poll-42", minAnonSet: 100 })`.
2. Or use the hosted Telegram bot: add the bot to a group, choose the issuer group, done.

**Issuer (e.g. Zilkroad):**
1. Runs the issuer container, connects its holder DB (or webhook on sales).
2. Each epoch the issuer posts the new root to the Zcash beacon automatically. Anyone can audit the root history.

## 7. Expected volume and ARR (estimates)

**Revenue model (post-hackathon):**
- Free for verifiers up to a monthly proof cap.
- **Issuer SaaS**: $49–149/mo per community (hosted issuer, beacon, bot).
- **Campaigns**: private airdrops, governance votes, event passes at **$2–10K each**.
- Enterprise/white-label later (conferences, DAOs, other privacy chains).

**Assumptions:**
- The Zcash community market is small but intensely privacy-motivated.
- zkSNARKs alone has 10K items and 23.4K followers.
- The auction created 42K new wallets.
- ZAIR-style airdrops and coinholder votes show demand for private eligibility.

| Scenario | Paying communities | SaaS rev. | Campaigns | Campaign rev. | Proofs / month (yr-end) | **ARR** |
|---|---|---|---|---|---|---|
| Conservative | 10 × $49 | $5.9K | 1 × $3K | $3K | ~5K | **≈ $9K** |
| Base | 40 × $99 | $47.5K | 6 × $5K | $30K | ~50K | **≈ $78K** |
| Upside | 150 × $149 (incl. non-Zcash issuers) | $268K | 15 × $10K | $150K | ~500K | **≈ $418K** |

**Hackathon-period targets:**
- ≥ 50 enrolled testers.
- ≥ 1 poll with ≥ 30 anonymous votes.
- ≥ 1 live gated Telegram group.
- ≥ 1 outside project (or Zilkroad) expressing intent to integrate.


## 8. Submission checklist
- [ ] Public repo with licence, README (pitch, architecture diagram, **threat model**, known limitations), quickstart.
- [ ] Demo video ≤ 3 min: problem → live flow → privacy proof (audit page / linkability chart / issuer-can't-link demo).
- [ ] Mainnet evidence: txids (shielded, so show the viewing-key-based audit rather than raw data), live URLs.
- [ ] No transparent hops in core flows, no address reuse, no PII in memos. Self-audit before submitting.
- [ ] Shielded UA for the prize payout.
- [ ] Submit by **Oct 27** (one day early). Oct 28 23:59 UTC is the hard stop, and Zcon7 traffic will be heavy.
