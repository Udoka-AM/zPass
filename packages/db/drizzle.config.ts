import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  casing: "snake_case",
  schemaFilter: ["issuer", "verifier"],
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgres://zpass:zpass@localhost:5432/zpass" },
});
