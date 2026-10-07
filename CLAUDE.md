# Agent guide: zPass

Read before writing code:
1. `docs/06-IMPLEMENTATION-PLAN.md`: pick the next task in milestone order. Respect dependencies.
2. `docs/01-PRD.md` §1.8: the acceptance criteria your task must satisfy.
3. `docs/02-TRD.md` and `docs/05-BACKEND-SCHEMA.md`: stack, data model and privacy rules. Don't invent alternatives. If something is missing, add it to the doc in the same PR.

## Non-negotiable privacy rules
- Identity secrets, passphrases and backup phrases never leave the browser. Only commitments are sent.
- Never add a link between `issuer.*` and `verifier.*` data: no foreign keys, no shared tables, no joint logs. Each service connects with its own DB role.
- The verifier trusts only roots from the Zcash beacon (`verifier.beacon_roots`), never the issuer API.
- Never store or log IPs, Telegram user IDs, or request bodies on prove/verify routes. Telegram sessions live only in bot memory.
- Proving artefacts are self-hosted. No third-party requests during proving.
- Copy never claims "anonymous forever" or "untraceable". State limits honestly.

## Commands
- JS: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm dev`
- DB: `docker compose -f infra/docker-compose.yml up -d postgres`, then `pnpm db:migrate && pnpm db:seed`. Schema change: edit `packages/db/src/schema/*.ts` → `pnpm db:generate` → review the SQL.
- Rust (beacon): `cargo fmt --all`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test --workspace`

## Conventions
- Field elements (commitments, roots, nullifiers, scope hashes) are decimal strings in TS and `NUMERIC(78,0)` in Postgres.
- Placeholder code is marked `TODO(<task id>)`. Remove the marker when the task is done.
- One PR per task where practical. Fill in the PR template's privacy checklist.
- Before closing a milestone: run the app, verify its ACs, open `carry-over` issues for anything unresolved.
