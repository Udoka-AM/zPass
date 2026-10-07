import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

export * from "./schema/index";

/**
 * Create a Drizzle client. Each service connects with its own DB role:
 * the issuer as `zpass_issuer`, the verifier as `zpass_verifier`.
 */
export function createDb(url: string) {
  const client = postgres(url, { max: 10 });
  return drizzle(client, { schema, casing: "snake_case" });
}

export type Db = ReturnType<typeof createDb>;
