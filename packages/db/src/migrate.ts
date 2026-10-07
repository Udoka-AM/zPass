// Applies roles → Drizzle migrations → grants. Run with an admin DATABASE_URL.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");

const sqlFile = (name: string) =>
  readFileSync(fileURLToPath(new URL(`../sql/${name}`, import.meta.url)), "utf8");

const client = postgres(url, { max: 1 });
try {
  await client.unsafe(sqlFile("roles.sql"));
  await migrate(drizzle(client), {
    migrationsFolder: fileURLToPath(new URL("../migrations", import.meta.url)),
  });
  await client.unsafe(sqlFile("grants.sql"));
  console.log("migrations applied");
} finally {
  await client.end();
}
