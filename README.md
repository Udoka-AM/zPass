# zPass

**Anonymous membership for Zcash communities. Prove "I hold a zkSNARK" (or any Zcash-community credential) to unlock chats, votes and perks, without revealing which item, which address or who you are.**

- **Address-independent passes.** Enrol once with a memo challenge. Your pass keeps working when you rotate addresses or change wallets.
- **Zero-knowledge proofs in the browser.** Semaphore v4 membership proofs with scope-specific nullifiers: one use per poll, chat or app, and no cross-app tracking.
- **Zcash-anchored root beacon.** Every group root is posted in a shielded memo to a beacon address whose viewing key is public, so anyone can audit the root history and the issuer can't equivocate.
- **The issuer can't link usage.** The issuer knows who enrolled, but not which member produced which proof. The `issuer` and `verifier` databases are separated by role, and the proof hides the leaf.
- **Integrations out of the box.** Telegram gate bot, anonymous one-vote-per-item polls, "Sign in with zPass", and `@zpass/verify` for any app in ~15 lines.

Built for the [Zecathon](https://thezecathon.com) **Wildcard** track (Oct 6–28, 2026).

> **Status:** scaffold. The build follows [docs/06-IMPLEMENTATION-PLAN.md](docs/06-IMPLEMENTATION-PLAN.md).

## Architecture

```
Browser (apps/web: Next.js PWA)
  enrol · identity vault (IndexedDB) · prover (Web Worker) · polls · sign-in · beacon explorer
        │ commitment only        │ proof + scope + message
        ▼                        ▼
  issuer (Hono)             verifier (Hono) ◀── telegram-bot (grammY)
  holder DB, challenges,    proofs, nullifiers,
  members, epochs           polls, OIDC
        │                        ▲
        │ zpass-beacon post      │ zpass-beacon scan (public viewing key)
        ▼                        │
     Zcash: shielded memo  ZP1:<group>:<epoch>:<root>:<size>  ──┘
        │
  Postgres: [issuer schema]   [verifier schema]   (separate roles, no cross-grants)
```

Details: [docs/02-TRD.md §2.6](docs/02-TRD.md#26-architecture).

## Threat model (summary)

| Adversary | Protected? | How / caveat |
|---|---|---|
| Verifier / app (Telegram, poll) | ✅ | A proof reveals only "member of group G at root R" + a scope nullifier. No item ID, no address |
| Issuer (even a malicious one) | ✅ for usage, ⚠️ for enrolment | The issuer knows commitment ↔ account at enrolment, but a proof doesn't reveal which commitment was used. Batched epochs + a minimum anonymity set blunt timing attacks |
| Cross-app tracking | ✅ | Nullifiers are scope-specific |
| Double voting / sharing | ✅ / ⚠️ | Nullifiers prevent double use within a scope. Lending a secret can't be prevented by any credential system |
| Transfer correlation | ⚠️ | Leaf changes at sale time are batched per epoch |
| Root equivocation | ✅ | Verifiers accept only roots from the public Zcash beacon |

Full version: [docs/PRODUCT.md](docs/PRODUCT.md#threat-model).

## Repository layout

```
apps/web/            Next.js 16 PWA: enrol, passes, prover, polls, sign-in, beacon explorer
apps/issuer/         Hono service: holder DB, memo challenges, members, epoch batcher
apps/verifier/       Hono service: /v1/verify, nullifiers, polls, Sign in with zPass
apps/telegram-bot/   grammY gate bot
packages/sdk/        @zpass/sdk: identities, per-item derivation, proving helpers
packages/verify/     @zpass/verify: proof + beacon root + anon set + nullifier checks
packages/db/         Drizzle schema (issuer + verifier), migrations, roles/grants, seed
crates/zpass-beacon/ Rust CLI: post roots, send challenges, scan the beacon
infra/               docker compose (Postgres, Zebra, Zaino, services, Caddy)
docs/                Product description, PRD, TRD, app flow, UI brief, schema, plan
```

## Quickstart (development)

Requirements: Node 22, pnpm 9, Rust 1.89 (via `rust-toolchain.toml`), Docker.

```bash
git clone https://github.com/Udoka-AM/zPass && cd zPass
cp .env.example .env
pnpm install
docker compose -f infra/docker-compose.yml up -d postgres
pnpm db:migrate && pnpm db:seed
pnpm dev   # web on :3000
```

Checks run in CI:

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
cargo fmt --all --check && cargo clippy --workspace --all-targets -- -D warnings && cargo test --workspace
```

## Integrate (preview)

```ts
import { verify } from "@zpass/verify";

const result = await verify(proof, {
  group: "zksnarks",
  scopeId: "poll:42",
  scopeHash,
  minAnonSet: 100,
  roots,       // reads roots from the Zcash beacon
  nullifiers,  // your nullifier store
});
if (!result.ok) throw new Error(result.code);
```

## Docs

| | |
|---|---|
| [Product description](docs/PRODUCT.md) | [PRD](docs/01-PRD.md) |
| [TRD](docs/02-TRD.md) | [App flow](docs/03-APP-FLOW.md) |
| [UI/UX brief](docs/04-UI-UX-BRIEF.md) | [Backend schema](docs/05-BACKEND-SCHEMA.md) |
| [Implementation plan](docs/06-IMPLEMENTATION-PLAN.md) | [Pinned versions](docs/VERSIONS.md) |

## Licence

Dual-licensed under [MIT](LICENSE-MIT) or [Apache-2.0](LICENSE-APACHE), at your option.
