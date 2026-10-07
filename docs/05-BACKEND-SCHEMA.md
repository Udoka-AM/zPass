# 5. Backend Schema: zPass

**Purpose:** Define stored data, relationships, and access rules.

Store: **PostgreSQL 16** with two schemas and two DB roles:

- `issuer`: holder DB, challenges, members, epochs. Role `zpass_issuer`.
- `verifier`: apps, scopes, beacon roots, nullifiers, polls, OIDC. Role `zpass_verifier`.

`zpass_verifier` has **no grants** on `issuer.*`, and `zpass_issuer` has no grants on `verifier.*`. That separation is part of the privacy design (PRD AC12). Schema is defined with **Drizzle ORM** in [`packages/db/src/schema`](../packages/db/src/schema), and SQL migrations are generated into `packages/db/migrations/`.

Field elements (commitments, roots, nullifiers, scope hashes) are BN254 scalars stored as `NUMERIC(78,0)` (decimal string in TypeScript). Times are `TIMESTAMPTZ` (UTC).

Related: [02-TRD.md](02-TRD.md)

---

## 5.1 Entities

| Entity | Schema | Represents |
|---|---|---|
| `groups` | issuer | A credential group (collection), e.g. `zksnarks`, `zcon7` |
| `holders` | issuer | A holder account in the (mock) Zilkroad DB with its shielded address on record |
| `items` | issuer | One held item (e.g. zkSNARK #1234) and its current holder |
| `challenges` | issuer | A memo challenge sent to a holder's address, and the enrolment token it yields |
| `members` | issuer | One identity commitment = one leaf in a group's Merkle tree, tied to one item |
| `epochs` | issuer | One batch update of a group: root, size, beacon transaction |
| `transfers` | issuer | A recorded change of item ownership (simulated sale in v1) |
| `admin_log` | issuer | Operator actions |
| `apps` | verifier | A developer/community integrating zPass (API key holder) |
| `scopes` | verifier | A nullifier scope (poll, Telegram chat, OIDC client, custom) with its policy |
| `beacon_roots` | verifier | Roots read from the Zcash beacon by the scanner. The only roots the verifier trusts |
| `nullifiers` | verifier | Used nullifiers per scope |
| `polls` / `votes` | verifier | Anonymous polls and their proof-backed votes |
| `tg_chats` | verifier | Telegram chats gated by zPass |
| `oidc_clients` / `oidc_codes` | verifier | "Sign in with zPass" clients and one-time authorization codes |

Not stored anywhere server-side, by design: identity secrets, passphrases, backup phrases, which member generated which proof, Telegram user IDs (bot sessions live in bot memory for ≤ 15 min), IP addresses on prove/verify routes.

## 5.2 Tables: `issuer` schema

### `issuer.groups`
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` | ✓ | `gen_random_uuid()` | PK |
| `slug` | `TEXT` | ✓ | — | `^[a-z0-9-]{3,32}$`, **unique**, used in memos and scopes |
| `name` | `TEXT` | ✓ | — | 1–80 chars |
| `description` | `TEXT` | | `''` | ≤ 1,000 chars |
| `tree_depth` | `SMALLINT` | ✓ | `20` | 16–32 |
| `epoch_seconds` | `INTEGER` | ✓ | `3600` | 60–86,400 |
| `recommended_min_anon_set` | `INTEGER` | ✓ | `100` | Advisory for verifiers |
| `current_epoch` | `INTEGER` | ✓ | `0` | Last finalised epoch |
| `next_leaf_index` | `INTEGER` | ✓ | `0` | Append position in the LeanIMT |
| `created_at` | `TIMESTAMPTZ` | ✓ | `now()` | |

### `issuer.holders`
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` | ✓ | `gen_random_uuid()` | PK |
| `account_handle` | `TEXT` | ✓ | — | Mock Zilkroad username, **unique**, 3–32 chars |
| `shielded_ua_enc` | `BYTEA` | ✓ | — | Address on record, encrypted (`pgp_sym_encrypt`, key `ZPASS_DATA_KEY`) |
| `created_at` | `TIMESTAMPTZ` | ✓ | `now()` | |

### `issuer.items`
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` | ✓ | `gen_random_uuid()` | PK |
| `group_id` | `UUID` | ✓ | — | FK → `groups.id` |
| `item_number` | `INTEGER` | ✓ | — | e.g. 1–10,000 |
| `holder_id` | `UUID` | | `NULL` | FK → `holders.id`. `NULL` = unowned |
| `updated_at` | `TIMESTAMPTZ` | ✓ | `now()` | |

Indexes: `UNIQUE (group_id, item_number)`, `(holder_id)`.

### `issuer.challenges`
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` | ✓ | `gen_random_uuid()` | PK |
| `holder_id` | `UUID` | ✓ | — | FK |
| `group_id` | `UUID` | ✓ | — | FK |
| `code_hash` | `BYTEA` | ✓ | — | SHA-256 of the 8-char code |
| `attempts` | `SMALLINT` | ✓ | `0` | Max 5 |
| `sent_txid` | `BYTEA` | | `NULL` | Challenge note txid |
| `expires_at` | `TIMESTAMPTZ` | ✓ | `now() + 30 min` | |
| `verified_at` | `TIMESTAMPTZ` | | `NULL` | |
| `token_hash` | `BYTEA` | | `NULL` | Enrolment token (valid 30 min after verification) |
| `consumed_at` | `TIMESTAMPTZ` | | `NULL` | Token used |
| `created_at` | `TIMESTAMPTZ` | ✓ | `now()` | |

Indexes: `(holder_id, created_at)` for rate limiting, `UNIQUE (token_hash) WHERE token_hash IS NOT NULL`.

### `issuer.members`
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` | ✓ | `gen_random_uuid()` | PK |
| `group_id` | `UUID` | ✓ | — | FK |
| `item_id` | `UUID` | ✓ | — | FK → `items.id` |
| `commitment` | `NUMERIC(78,0)` | ✓ | — | Semaphore identity commitment |
| `leaf_index` | `INTEGER` | | `NULL` | Assigned when the epoch applies the add |
| `status` | `member_status` | ✓ | `'pending'` | `pending` · `active` · `removal_pending` · `removed` |
| `added_epoch` | `INTEGER` | | `NULL` | |
| `removed_epoch` | `INTEGER` | | `NULL` | |
| `created_at` | `TIMESTAMPTZ` | ✓ | `now()` | |

Indexes: `UNIQUE (item_id) WHERE status <> 'removed'` (one live leaf per item), `UNIQUE (group_id, commitment)`, `UNIQUE (group_id, leaf_index)`, `(group_id, status)`.

### `issuer.epochs`
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `group_id` | `UUID` | ✓ | — | PK part, FK |
| `epoch` | `INTEGER` | ✓ | — | PK part, starts at 1 |
| `root` | `NUMERIC(78,0)` | ✓ | — | |
| `size` | `INTEGER` | ✓ | — | Active members after this epoch |
| `added` / `removed` | `INTEGER` | ✓ | `0` | Batch stats |
| `status` | `epoch_status` | ✓ | `'computed'` | `computed` · `posted` · `confirmed` · `failed` |
| `beacon_txid` | `BYTEA` | | `NULL` | |
| `beacon_height` | `INTEGER` | | `NULL` | |
| `computed_at` | `TIMESTAMPTZ` | ✓ | `now()` | |
| `posted_at` | `TIMESTAMPTZ` | | `NULL` | |

PK `(group_id, epoch)`. Index `(group_id, status)`.

### `issuer.transfers`
| Field | Type | Required | Default |
|---|---|---|---|
| `id` | `UUID` (PK) | ✓ | `gen_random_uuid()` |
| `item_id` | `UUID` (FK) | ✓ | — |
| `from_holder_id` / `to_holder_id` | `UUID` (FK) | | `NULL` |
| `recorded_at` | `TIMESTAMPTZ` | ✓ | `now()` |
| `applied_epoch` | `INTEGER` | | `NULL` |

### `issuer.admin_log`
`id BIGSERIAL PK`, `actor TEXT`, `action TEXT`, `detail JSONB DEFAULT '{}'`, `created_at TIMESTAMPTZ DEFAULT now()`. Append-only.

## 5.3 Tables: `verifier` schema

### `verifier.apps`
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` | ✓ | `gen_random_uuid()` | PK |
| `name` | `TEXT` | ✓ | — | 1–80 chars |
| `contact` | `TEXT` | | `NULL` | Optional email/handle for the developer (not holders) |
| `api_key_hash` | `BYTEA` | ✓ | — | SHA-256, **unique** |
| `api_key_prefix` | `TEXT` | ✓ | — | First 8 chars for display |
| `created_at` | `TIMESTAMPTZ` | ✓ | `now()` | |
| `revoked_at` | `TIMESTAMPTZ` | | `NULL` | |

### `verifier.scopes`
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | `TEXT` | ✓ | — | PK. Human scope string: `poll:<uuid>`, `tg:<chatId>`, `oidc:<clientId>`, `app:<appId>:<name>` |
| `scope_hash` | `NUMERIC(78,0)` | ✓ | — | Field element used in proofs, **unique** |
| `app_id` | `UUID` | ✓ | — | FK → `apps.id` |
| `group_slug` | `TEXT` | ✓ | — | Group this scope accepts |
| `min_anon_set` | `INTEGER` | ✓ | `25` | ≥ 2 |
| `root_window_epochs` | `INTEGER` | ✓ | `24` | Freshness window |
| `created_at` | `TIMESTAMPTZ` | ✓ | `now()` | |

### `verifier.beacon_roots`
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `group_slug` | `TEXT` | ✓ | — | PK part |
| `epoch` | `INTEGER` | ✓ | — | PK part |
| `root` | `NUMERIC(78,0)` | ✓ | — | |
| `size` | `INTEGER` | ✓ | — | |
| `txid` | `BYTEA` | ✓ | — | |
| `block_height` | `INTEGER` | ✓ | — | |
| `block_time` | `TIMESTAMPTZ` | ✓ | — | |

PK `(group_slug, epoch)`. `UNIQUE (group_slug, root)`. Written only by the beacon scanner.

### `verifier.nullifiers`
| Field | Type | Required | Default |
|---|---|---|---|
| `scope_id` | `TEXT` (FK) | ✓ | — |
| `nullifier` | `NUMERIC(78,0)` | ✓ | — |
| `used_at` | `TIMESTAMPTZ` | ✓ | `now()` |

PK `(scope_id, nullifier)`. **No other columns.** Insert-only, with `INSERT … ON CONFLICT DO NOTHING RETURNING` for atomic double-use detection.

### `verifier.polls`
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | `UUID` | ✓ | `gen_random_uuid()` | PK |
| `app_id` | `UUID` | ✓ | — | FK |
| `scope_id` | `TEXT` | ✓ | — | FK, `poll:<id>` |
| `question` | `TEXT` | ✓ | — | 5–200 chars |
| `options` | `JSONB` | ✓ | — | Array of 2–10 strings, each 1–80 chars |
| `opens_at` | `TIMESTAMPTZ` | ✓ | `now()` | |
| `closes_at` | `TIMESTAMPTZ` | ✓ | — | 1 h – 30 d after `opens_at` |
| `created_at` | `TIMESTAMPTZ` | ✓ | `now()` | |

### `verifier.votes`
| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `poll_id` | `UUID` | ✓ | — | PK part, FK |
| `nullifier` | `NUMERIC(78,0)` | ✓ | — | PK part |
| `option_index` | `SMALLINT` | ✓ | — | = proof `message` |
| `root_epoch` | `INTEGER` | ✓ | — | |
| `proof` | `JSONB` | ✓ | — | Full Semaphore proof, so anyone can re-verify the tally |
| `created_at` | `TIMESTAMPTZ` | ✓ | `now()` | |

### `verifier.tg_chats`
| Field | Type | Required | Default |
|---|---|---|---|
| `chat_id` | `BIGINT` (PK) | ✓ | — |
| `title` | `TEXT` | ✓ | — |
| `scope_id` | `TEXT` (FK) | ✓ | — |
| `group_slug` | `TEXT` | ✓ | — |
| `created_at` | `TIMESTAMPTZ` | ✓ | `now()` |

### `verifier.oidc_clients`
`client_id TEXT PK` (`zpc_…`), `app_id UUID FK`, `name TEXT`, `redirect_uris TEXT[]` (exact match, https only except localhost), `scope_id TEXT FK`, `created_at`.

### `verifier.oidc_codes`
`code_hash BYTEA PK`, `client_id TEXT FK`, `sub NUMERIC(78,0)` (the scope nullifier), `group_slug TEXT`, `root_epoch INTEGER`, `nonce TEXT NULL`, `expires_at TIMESTAMPTZ` (now + 60 s), `used_at TIMESTAMPTZ NULL`.

## 5.4 Relationships

| Relationship | Type | Foreign key |
|---|---|---|
| group → items | one-to-many | `items.group_id` |
| holder → items | one-to-many (current owner) | `items.holder_id` |
| item → members | one-to-many over time, at most one live | `members.item_id` |
| group → members | one-to-many | `members.group_id` |
| group → epochs | one-to-many | `epochs.group_id` |
| holder → challenges | one-to-many | `challenges.holder_id` |
| item → transfers | one-to-many | `transfers.item_id` |
| app → scopes | one-to-many | `scopes.app_id` |
| scope → nullifiers | one-to-many | `nullifiers.scope_id` |
| poll → scope | one-to-one | `polls.scope_id` (unique) |
| poll → votes | one-to-many | `votes.poll_id` |
| tg_chat → scope | one-to-one | `tg_chats.scope_id` |
| app → oidc_clients → oidc_codes | one-to-many chains | `oidc_clients.app_id`, `oidc_codes.client_id` |
| issuer.epochs ⇢ verifier.beacon_roots | **no FK, on purpose.** Linked only through the Zcash beacon (group slug + epoch) | — |
| issuer.members ⇢ verifier.nullifiers | **no link exists, by design** | — |

## 5.5 User ownership

- **Holders** own their identity secret (client-side only). Server-side, a holder "owns" `items` (via `holder_id`) and indirectly the `members` rows for those items. The issuer controls those rows.
- **Apps** (developers) own their `scopes`, `polls`, `tg_chats` and `oidc_clients`.
- **Nullifiers and votes** belong to scopes, not to people.
- **The issuer operator** owns groups, items, holders, epochs.

## 5.6 Authentication flow

| Step | Flow |
|---|---|
| **Sign up (holder)** | No account. Holder records exist in the issuer DB (mock Zilkroad seed, or the real Zilkroad API later) |
| **Enrol (holder)** | `POST /v1/enrol/challenge {group, account_handle}` → issuer sends a `ZPC:<code>` shielded memo to the address on record → `POST /v1/enrol/verify {challenge_id, code}` → returns an enrolment token (30 min) + item list → `POST /v1/enrol/commit {token, entries:[{item_number, commitment}]}` → members `pending` |
| **Per-item identities** | The vault stores one master secret. The identity for item *n* in group *g* is derived client-side as `Identity(HKDF-SHA256(master, info="zpass/v1/" + g + "/" + n))`, so one vote per item works without the server learning how identities relate |
| **Sign in (holder)** | No sessions. Each action is a proof bound to a scope and message |
| **Sign up (app)** | `POST /v1/apps` with an operator-issued invite during the hackathon → API key shown once |
| **Sign in (app)** | `Authorization: Bearer zpk_…`, hashed lookup |
| **Reset** | Holder: restore from backup phrase. If lost, re-enrol (new challenge): the old member goes `removal_pending` and the new commitment `pending`, both applied at the next epoch. App: rotate the key via `POST /v1/apps/me/rotate` |
| **Session lifecycle** | Enrolment token 30 min, single use. Telegram session 15 min, in bot memory. OIDC code 60 s, single use. ID token 1 h. The local vault unlock lasts 10 min in memory |

## 5.7 Authorization rules

| Entity | Read | Create | Update | Delete |
|---|---|---|---|---|
| `groups` | Public | Operator | Operator | Operator (only with no members) |
| `holders`, `items` | Operator. A holder sees only their own items after verifying a challenge | Operator / seed / Zilkroad sync | Operator (transfers) | Operator |
| `challenges` | Issuer service only | Public endpoint (rate limited: 3/holder/hour, 30/IP/hour) | Issuer service | Purge job |
| `members` | **Commitments + leaf indexes per epoch are public** (needed to build proofs). Item linkage: issuer only | Holder with a valid enrolment token | Issuer epoch batcher | Never (status → `removed`) |
| `epochs` | Public | Epoch batcher | Batcher, beacon poster | Never |
| `apps` | Owner (self) | Invite holder | Owner (rotate) | Owner (revoke) |
| `scopes` | Public (id, group, `min_anon_set`) | Owner app | Owner app (`min_anon_set` can only go up) | Never once a nullifier exists |
| `beacon_roots` | Public | Beacon scanner only | Never | Never |
| `nullifiers` | Public count per scope. Values public (they reveal nothing) | Verifier (after a valid proof) | Never | Never |
| `polls` | Public | Owner app | Owner app, before `opens_at` | Owner app, before the first vote |
| `votes` | Public (including proofs) | Verifier (after a valid proof) | Never | Never |
| `tg_chats` | Bot + owner app | Bot (when a chat admin runs `/gate`) | Chat admin via bot | Chat admin via bot (`/ungate`) |
| `oidc_clients` | Owner app. Name + redirect hosts public on the consent screen | Owner app | Owner app | Owner app |
| `oidc_codes` | Verifier only | Verifier | Verifier (`used_at`) | Purge job |

DB-level: `zpass_verifier` has `SELECT, INSERT` on `nullifiers` and `votes` (no `UPDATE`/`DELETE`), and nothing on `issuer.*`.

## 5.8 Data validation

| Field | Rule |
|---|---|
| `groups.slug` | `^[a-z0-9-]{3,32}$`, unique |
| Commitment, root, nullifier, scope hash | Integer in `[0, p)` where p is the BN254 scalar field modulus |
| `members.commitment` | Unique per group. Not 0 |
| Enrolment | One live member per item. Items must be owned by the challenge's holder at commit time |
| Challenge code | 8 chars Crockford base32. ≤ 5 attempts. 30 min expiry |
| Memo (challenge) | `ZPC:<code>` only. No other data |
| Memo (beacon) | `ZP1:<slug>:<epoch>:<root-hex64>:<size>` (≤ 512 bytes) |
| Proof `message` | Poll: option index (0…n−1). Telegram: `poseidon(sessionId)`. OIDC: `poseidon(nonce)` |
| `scopes.min_anon_set` | ≥ 2 (≥ 25 enforced for production scopes) |
| `polls.options` | 2–10 unique, non-empty strings ≤ 80 chars |
| `oidc_clients.redirect_uris` | Absolute https URLs (localhost allowed in dev), exact-match only |
| API keys | `zpk_` + 32 base62 chars |

## 5.9 Retention and deletion

| Data | Kept | Purged / exported |
|---|---|---|
| Groups, epochs, member commitments, leaf indexes | Indefinitely (needed to rebuild historic roots) | Public export `GET /v1/groups/{slug}/epochs/{n}/members` |
| `holders.shielded_ua_enc` | While the holder owns items | Wiped when they hold no items for 30 days |
| Challenges | 7 days | Daily purge job |
| Nullifiers, votes | Life of the scope (indefinite for polls) | Poll export (CSV + proofs JSON) |
| OIDC codes | 1 day | Purge job |
| Telegram sessions | ≤ 15 min, memory only | Process memory |
| Request logs | 7 days, no IPs on prove/verify routes | Rotated |
| Beacon roots | Indefinitely (also on chain) | — |

## 5.10 Migration and seed data

- **Tool:** Drizzle Kit. Edit `packages/db/src/schema/*.ts` → `pnpm --filter @zpass/db generate` (SQL into `packages/db/migrations/`) → review the SQL in the PR → `pnpm --filter @zpass/db migrate`. Forward-only.
- **Roles and grants:** hand-written `packages/db/sql/roles.sql` (roles, extensions) runs before the Drizzle migrations, and `packages/db/sql/grants.sql` (schema and table grants) runs after. `pnpm db:migrate` runs all three in order.
- **Environments:** local and staging run migrations on service start. Production runs them as a release step before the new images start.
- **Seed (`packages/db/src/seed.ts`, local/staging only):**
  - Groups: `zksnarks-demo` (10,000 items, depth 20, epoch 5 min on staging) and `zcon7-demo` (500 items).
  - 60 mock holders (`holder01`…`holder60`) with testnet UAs from `SEED_HOLDER_UAS` (team test wallets), owning items 1–60.
  - 1 app "zPass Demo" with a known dev API key from `.env.example`.
  - 1 poll "Which Zcon7 session should we livestream?" (4 options) and its scope.
- **Fixtures:** `packages/verify/test/fixtures/` holds a 32-member group, valid and invalid proofs, and beacon roots for unit tests.
