# 2. Technical Requirements Document (TRD): zPass

**Purpose:** Make technical choices explicit so the build does not rely on guesses.

Related: [01-PRD.md](01-PRD.md), [05-BACKEND-SCHEMA.md](05-BACKEND-SCHEMA.md), [06-IMPLEMENTATION-PLAN.md](06-IMPLEMENTATION-PLAN.md)

---

## 2.1 Platforms

| Platform | Scope |
|---|---|
| **Web (mobile-first, installable PWA)** | Enrolment, identity backup, prover pages (Telegram, polls, sign-in), holder dashboard, poll app, beacon explorer |
| **Telegram** | `@zpass_gate_bot` (grammY): gate private groups |
| **npm packages** | `@zpass/sdk` (prover helpers, identity), `@zpass/verify` (verification for Node and edge runtimes) |
| **CLI (Rust)** | `zpass-beacon post` / `zpass-beacon scan` for the Zcash root beacon |
| **Docker** | `zpass/issuer` image for issuers who self-host |
| **Not in v1** | Native apps, Discord bot (stretch) |

## 2.2 Frontend and hosting

| Item | Choice |
|---|---|
| Framework | **Next.js 16** (App Router) + **React 19** + **TypeScript 5** (strict) |
| Styling | **Tailwind CSS 4** with CSS-variable tokens ([04-UI-UX-BRIEF.md](04-UI-UX-BRIEF.md)) |
| Proving | **Semaphore v4** (`@semaphore-protocol/identity`, `/group`, `/proof`) in a **Web Worker**. Circuit artefacts (wasm + zkey for depth 20) served from our own origin, not a third-party CDN |
| Local storage | IndexedDB (`idb-keyval`): the identity secret encrypted with the user's passphrase (WebCrypto AES-GCM, PBKDF2-SHA256 600k iterations) |
| PWA | Web app manifest + service worker that caches the proving artefacts (~10–20 MB) after first use |
| Deployment | **Vercel** for `apps/web` (preview per PR, production on `main`) |
| Package manager | **pnpm 9** workspaces |

## 2.3 Backend and database

| Service | Tech | Responsibility |
|---|---|---|
| **Issuer** (`apps/issuer`) | Node 22, **Hono 4**, **Drizzle ORM** | Holder DB (mock Zilkroad), memo challenges, commitments, epochs, transfers, group snapshots, root computation, calling the beacon poster |
| **Verifier** (`apps/verifier`) | Node 22, Hono 4 | `POST /v1/verify`: proof verification, beacon-root lookup, anon-set check, nullifier store. Polls API. OIDC-style sign-in endpoints |
| **Telegram bot** (`apps/telegram-bot`) | **grammY**, long polling (webhook in production) | `/start` → session nonce → prover link → verify callback → one-time invite |
| **Beacon** (`crates/zpass-beacon`) | Rust, librustzcash (`zcash_client_backend`, `zcash_client_sqlite`, `zcash_keys`), Zaino gRPC | `post`: send a shielded memo with the root from the beacon wallet. `scan`: rebuild the root log from the public viewing key |
| **Database** | **PostgreSQL 16** with two schemas: `issuer` and `verifier`, each with its own DB role | Separation: the verifier role can't read issuer membership tables. This is what makes the "issuer can't link usage" demo concrete |
| **Zcash node + indexer** | **Zebra** + **Zaino** | Beacon posting, sending challenge notes, beacon scanning |

**Region:** EU (Germany). One Hetzner VM (`CPX31`, 4 vCPU / 8 GB, plus a 360 GB volume for mainnet) runs Zebra, Zaino, Postgres, issuer, verifier, bot and the beacon through `infra/docker-compose.yml`, behind Caddy (automatic TLS). Vercel serves the web app.

## 2.4 Authentication and roles

| Role | Sign-in method | Permissions |
|---|---|---|
| **Holder (pre-enrolment)** | **Memo challenge**: the issuer sends a 0.0001 ZEC shielded note to the holder's address on record with memo `ZPC:<8-char code>`. The holder reads the code in their wallet and types it on the enrol page. Codes expire in 30 min and allow 5 attempts | Submit one identity commitment per verified item |
| **Holder (member)** | **None on any server.** Each action is a zero-knowledge proof bound to a scope | Prove membership for any scope |
| **App developer** | API key (`zpk_live_…`), hashed with SHA-256 at rest, sent as `Authorization: Bearer` | Register scopes, call `/v1/verify`, create polls, configure OIDC clients |
| **Issuer operator** | Admin API key + IP allowlist | Manage groups, mock holder DB, trigger epochs, view enrolment stats |
| **Telegram group admin** | Telegram admin status checked via `getChatMember` | Link a chat to a group + `minAnonSet` |
| **Public** | None | Read groups, epochs, beacon roots, poll tallies |

**"Sign in with zPass"** (OIDC-style, simplified): app redirects to `/signin?client_id&redirect_uri&state&scope_id` → the user proves membership with scope `oidc:<client_id>` → verifier issues a one-time code → app exchanges it at `/v1/oidc/token` for an ID token (JWT, ES256) whose `sub` is the scope nullifier (pairwise and stable per app) and whose claims include `group`, `root_epoch`. No email, no profile.

## 2.5 External services and APIs

| Provider | Purpose | Limits / constraints | Credentials owner |
|---|---|---|---|
| **Telegram Bot API** | Gate bot, invite links (`createChatInviteLink` with `member_limit: 1`, `expire_date`) | 30 msgs/s global, 1 msg/s per chat | Udoka (BotFather token `TELEGRAM_BOT_TOKEN`) |
| **Zebra + Zaino (self-hosted)** | Beacon posting, sending challenge notes | Own infra. Mainnet sync ~1–2 days, so start Oct 8 | Udoka (VM owner) |
| **Semaphore v4 artefacts** | Proving keys (trusted setup already completed by PSE) | Depth-specific files. Self-hosted copies with checksum verification in CI | Public. Checksums pinned in repo |
| **npm registry** | Publish `@zpass/sdk`, `@zpass/verify` | Needs the `@zpass` scope (PRD Q9 if taken: `@zpass-dev`) | Udoka (`NPM_TOKEN` in GitHub Actions secrets) |
| **Vercel** | Web hosting | — | Udoka |
| **Hetzner** | Backend VM | — | Udoka |
| **ZAIR** (stretch) | Holder-of-ZEC proofs | Ironwood support unknown (PRD Q2) | n/a |
| **Zilkroad API** (optional) | Real holder data | Only if they cooperate | Zilkroad |

No analytics on prover or poll pages.

## 2.6 Architecture

```
┌──────────────────────────── Browser (apps/web) ────────────────────────────┐
│ Enrol (memo challenge) │ Identity vault (IndexedDB) │ Prover (Web Worker)   │
│ Polls │ Telegram prove page │ Sign in with zPass │ Beacon explorer           │
└──────┬───────────────────────────────┬──────────────────────────┬──────────┘
       │ commitment only               │ proof + scope + message  │ public reads
       ▼                               ▼                          ▼
┌─────────────── VM (docker compose, behind Caddy TLS) ───────────────────────┐
│ issuer (Hono)                     verifier (Hono)          telegram-bot      │
│  ├ holder DB (mock Zilkroad)       ├ verifyProof (Semaphore) (grammY)        │
│  ├ challenges ──scan IVK──┐        ├ beacon roots cache  ◀── session/nonce ──┤
│  ├ members / epochs       │        ├ nullifier store            invite link  │
│  └ epoch batcher ─────────┼──▶ zpass-beacon post ─▶ shielded memo ─┐        │
│        │ Drizzle          │        │ Drizzle (verifier role)       │        │
│        ▼                  ▼        ▼                               ▼        │
│   Postgres [issuer schema]   Postgres [verifier schema]    Zaino ◀ Zebra    │
│                                    ▲                               │        │
│                                    └──── zpass-beacon scan (public viewing key)
└──────────────────────────────────────────────────────────────────────────────┘
```

**Data flow:**
1. **Enrol:** the holder enters their holder account (mock Zilkroad username) → the issuer sends `ZPC:<code>` in a shielded memo to the address on record → the holder types the code on the enrol page → challenge `verified` and a short-lived enrolment token is issued. Shielded payments hide the sender, so the issuer can't verify a payment *from* the holder; it proves control by sending *to* the recorded address (the Zilkroad pattern, see §2.7).
2. **Commit:** the browser creates a Semaphore identity locally and sends only `commitment` with the verified challenge token → `members` row `pending`.
3. **Epoch:** the batcher applies pending adds and removals → rebuilds the LeanIMT group → root → `zpass-beacon post` sends memo `ZP1:<group>:<epoch>:<root-hex>:<size>` → `epochs` row with txid → members `active`.
4. **Beacon sync:** the verifier runs `zpass-beacon scan` every block (or on a 25 s timer) with the public viewing key → `verifier.beacon_roots`. **The verifier trusts only beacon roots, never the issuer API.**
5. **Prove:** the browser fetches the group's member list for the latest epoch (public commitments, from the issuer or a static snapshot) → builds the Merkle proof locally → Semaphore proof with `scope` and `message`.
6. **Verify:** `POST /v1/verify` → checks proof, root ∈ beacon roots within freshness window, size ≥ `minAnonSet`, nullifier unused for scope → stores the nullifier → returns `ok`.
7. **Integrations** (poll vote, Telegram invite, OIDC code) act only after a successful verify.

## 2.7 Security and privacy

| Asset | Sensitivity | Controls |
|---|---|---|
| Identity secret | Critical | Generated and kept in the browser only. Encrypted at rest with the user's passphrase. Never sent anywhere. Export as a backup phrase |
| Commitment ↔ item ↔ holder link | High (issuer-only) | Stored only in the `issuer` schema. The verifier role has no grants on it. Documented as the issuer's enrolment knowledge |
| Nullifiers | Medium | `verifier` schema. Stored with scope and timestamp only, no IP, no Telegram user ID, no commitment |
| Beacon wallet spending key | High | On the VM only, in an encrypted file (`ZPASS_BEACON_SEED` via Docker secret). Holds only a small fee balance |
| Beacon viewing key | Public by design | Published in the README and on `/beacon` |
| Challenge wallet spending key | Medium | Issuer env only. Holds a small balance for challenge notes |
| API keys | High | Hashed at rest. Shown once on creation |
| Telegram bot token | High | Env only |

**Memo-challenge design (enrolment):** the issuer sends a tiny shielded payment to the holder's address on record with memo `ZPC:<code>`. The holder reads it in their wallet and types the code into the enrol page. This proves control of the recorded address without the holder revealing anything new (Zilkroad's pattern). A holder-sends-the-code variant is deliberately not supported: shielded payments hide the sender, so it would prove nothing.

**Privacy controls:**
- **Epoch batching** (default 1 h): enrolments and transfers land in batches, so enrolment time doesn't pin a member.
- **Minimum anonymity set** enforced by the verifier per request (`minAnonSet`, default 25 for the demo, 100 recommended).
- **Scope-specific nullifiers:** different apps can't correlate a member.
- **Message binding:** the proof's `message` binds context (poll option, Telegram session nonce, OIDC nonce), so a proof can't be replayed elsewhere.
- **No IP logging** on `/v1/verify` and prover pages. Logs keep 7 days.
- Member lists are public (commitments only), so provers fetch them without revealing which leaf they need.

**Retention:** challenges deleted 7 days after use. Nullifiers kept for the life of the scope. Telegram sessions deleted after 15 min. Removed members' commitments kept in epoch snapshots (needed to rebuild historic roots). They reveal nothing beyond the commitment.

## 2.8 Performance and reliability targets

| Metric | Target |
|---|---|
| Proof generation (browser, depth 20) | p50 < 5 s on a mid-range phone, < 2 s on a laptop |
| First-use artefact download | ≤ 20 MB, cached by the service worker |
| `/v1/verify` latency | p95 < 300 ms (verification ~50–150 ms + DB) |
| Beacon post | Root on chain within 1 block of epoch end (~25 s on NU7) |
| Beacon scan lag | ≤ 2 blocks |
| Telegram bot response | < 2 s to DM reply. Invite within 5 s of a valid proof |
| Uptime | 99.5% for verifier + bot during the demo period |
| Backups | Nightly `pg_dump` + WAL to a Hetzner Storage Box, 14-day retention. Roots are also recoverable from the chain via the beacon |
| Recovery | RTO 2 h, RPO 15 min. Nullifier loss would allow double use, so the verifier DB gets priority in the restore runbook |

## 2.9 Environments and delivery

| Env | Chain | Web | Backend | Notes |
|---|---|---|---|---|
| **local** | Zebra regtest or testnet | `pnpm dev` | `docker compose up` (Postgres) + `pnpm --filter issuer dev` etc. | Epoch 1 min |
| **staging** | **NU7 testnet** | Vercel preview | VM-1 | Epoch 5 min, test bot `@zpass_staging_bot` |
| **production** | **Mainnet** beacon | Vercel production | VM-2 | Epoch 1 h, `@zpass_gate_bot` |

**CI/CD (GitHub Actions):**
- `ci.yml` on PRs and `main`: `pnpm lint`, `pnpm typecheck`, `pnpm test` (Vitest, with a Postgres service for issuer/verifier integration tests), `pnpm build`; `cargo fmt --check`, `cargo clippy -D warnings`, `cargo test` for the beacon crate; Semaphore artefact checksum check.
- `release.yml` on tag `v*`: publish `@zpass/sdk` and `@zpass/verify` to npm (provenance enabled), build and push `ghcr.io/udoka-am/zpass-issuer`, `-verifier`, `-bot` images.
- Vercel Git integration for web previews and production.
- Trunk-based with short-lived branches → PR → squash merge. Tag `v0.1.0` for submission.

## 2.10 Key technical decisions and tradeoffs

| Decision | Reason | Alternative considered |
|---|---|---|
| **Semaphore v4** for membership proofs | Audited, completed trusted setup, browser-provable in seconds, built-in scope nullifiers. Fastest route to "it runs" | **Halo2** (no trusted setup, Zcash-aligned) or **Noir**: better alignment, but a new circuit and audit risk in 3 weeks. On the roadmap |
| **Zcash shielded-memo beacon with a public viewing key** | Zcash-native, append-only, anyone can audit. Prevents root equivocation | Posting roots to an EVM contract: easier to read, but off-ecosystem and weak on Originality |
| **Epoch batching (1 h)** | Protects the anonymity set against enrolment and transfer timing | Instant enrolment: better UX, but leaks timing in small groups |
| **Separate `issuer` and `verifier` DB schemas and roles** | Makes unlinkability structural and demonstrable | One schema: simpler, but the demo would rely on promises |
| **TypeScript backend (Hono)** | Semaphore's reference stack is JS. Shared types with the SDK and web | Rust backend: consistent with the beacon, but slower to integrate Semaphore |
| **Rust only for the beacon** | librustzcash is the reliable way to build shielded memo txs and scan with viewing keys | Shelling out to `zcash-devtool`: quicker spike, used as a fallback |
| **Passphrase-derived identity in v1** | Works with every wallet today | Wallet-seed derivation: nicer UX, but no standard wallet signing API yet |
| **Hono over Express** | Small, fast, runs on Node and edge runtimes. `@zpass/verify` examples work in both | Express: bigger ecosystem, heavier, Node-only |
| **Drizzle ORM** | Typed schema in TS, SQL-first migrations | Prisma: heavier runtime and engine binary |
| **Self-hosted proving artefacts** | No third-party CDN sees who is proving | Loading from the PSE CDN: simpler, but a privacy leak |
