// Local / staging seed (docs/05-BACKEND-SCHEMA.md §5.10). Never run against production.
import { createDb, groups } from "./index";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
if (process.env.ZPASS_ENV === "production") throw new Error("refusing to seed production");

const db = createDb(url);

await db
  .insert(groups)
  .values([
    {
      slug: "zksnarks-demo",
      name: "zkSNARKs (demo)",
      description: "Demo collection of 10,000 shielded identities.",
      epochSeconds: 300,
    },
    { slug: "zcon7-demo", name: "Zcon7 attendee (demo)", epochSeconds: 300 },
  ])
  .onConflictDoNothing();

// TODO(2.2): items (10,000 + 500), 60 mock holders from SEED_HOLDER_UAS, demo app, demo poll.
console.log("seeded groups");
process.exit(0);
