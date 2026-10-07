// zPass verifier (docs/02-TRD.md §2.3). Connects as DB role `zpass_verifier`.
// Never log IPs or request bodies on prove/verify routes.
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import pino from "pino";

const log = pino({ name: "verifier" });
const app = new Hono();

app.get("/healthz", (c) => c.json({ status: "ok" }));
app.get("/readyz", (c) => c.json({ status: "ok" })); // TODO(3.2): check DB and beacon scan lag

// TODO(3.2): POST /v1/verify  → @zpass/verify with Postgres-backed RootStore + NullifierStore
// TODO(2.8): POST /v1/apps, POST /v1/apps/me/rotate, POST /v1/scopes
// TODO(3.5): POST /v1/polls, GET /v1/polls/:id, POST /v1/polls/:id/votes
// TODO(4.3): GET /signin (web), POST /v1/oidc/token, GET /.well-known/jwks.json
// TODO(2.7): beacon sync job (zpass-beacon scan → verifier.beacon_roots)

const port = Number(process.env.VERIFIER_PORT ?? 8788);
serve({ fetch: app.fetch, port }, () => log.info({ port }, "verifier listening"));
