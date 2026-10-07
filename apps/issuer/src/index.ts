// zPass issuer (docs/02-TRD.md §2.3). Connects as DB role `zpass_issuer`.
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import pino from "pino";

const log = pino({ name: "issuer" });
const app = new Hono();

app.get("/healthz", (c) => c.json({ status: "ok" }));
app.get("/readyz", (c) => c.json({ status: "ok" })); // TODO(2.1): check DB, Zaino, beacon lag

// Public
// TODO(2.2): GET  /v1/groups, GET /v1/groups/:slug/epochs/:n/members
// TODO(2.2): POST /v1/enrol/challenge  { group, account_handle }
// TODO(2.2): POST /v1/enrol/verify     { challenge_id, code }
// TODO(2.4): POST /v1/enrol/commit     { token, entries: [{ item_number, commitment }] }
// Admin (API key + IP allowlist)
// TODO(4.1): POST /v1/admin/transfers
// Jobs
// TODO(2.5): epoch batcher (respect ZPASS_EPOCHS_PAUSED) → zpass-beacon post

const port = Number(process.env.ISSUER_PORT ?? 8787);
serve({ fetch: app.fetch, port }, () => log.info({ port }, "issuer listening"));
