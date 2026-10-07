# Infra

One VM per environment (staging = NU7 testnet, production = mainnet). See [docs/02-TRD.md §2.3 and §2.9](../docs/02-TRD.md).

| Service | Profile | Purpose |
|---|---|---|
| `postgres` | default | `issuer` and `verifier` schemas, separate roles |
| `zebra`, `zaino` | `node` | Full node + gRPC indexer (Zaino image pinned in task 1.3) |
| `issuer`, `verifier`, `telegram-bot` | `app` | zPass services |
| `caddy` | `app` | TLS, IP-free access logs |

The beacon CLI (`crates/zpass-beacon`) runs on the same VM and is invoked by the issuer (post, send-challenge) and the verifier (scan).

## Local development

```bash
cp .env.example .env
docker compose -f infra/docker-compose.yml up -d postgres
pnpm db:migrate && pnpm db:seed
psql "$DATABASE_URL" -c "ALTER ROLE zpass_issuer PASSWORD 'change-me'; ALTER ROLE zpass_verifier PASSWORD 'change-me';"
pnpm --filter @zpass/issuer dev
pnpm --filter @zpass/verifier dev
pnpm dev
```

## Deploy (task 6.2)

```bash
docker compose -f infra/docker-compose.yml --profile node --profile app pull
docker compose -f infra/docker-compose.yml --profile node --profile app up -d
```

**Rollback:** set `ZPASS_IMAGE_TAG` to the previous tag and re-run `up -d`. Pause epochs with `ZPASS_EPOCHS_PAUSED=true`.

## Backups (task 5.6)

TODO: nightly `pg_dump` + WAL archiving (14-day retention). Restore the verifier schema first: losing nullifiers would allow double use.
