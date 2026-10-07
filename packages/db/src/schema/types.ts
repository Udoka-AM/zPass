import { customType } from "drizzle-orm/pg-core";

/** BN254 field element (commitment, root, nullifier, scope hash) as NUMERIC(78,0), decimal string in TS. */
export const fieldElement = customType<{ data: string; driverData: string }>({
  dataType: () => "numeric(78, 0)",
});

export const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => "bytea",
});
