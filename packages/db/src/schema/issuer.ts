// issuer schema. Source of truth: docs/05-BACKEND-SCHEMA.md §5.2
import { sql } from "drizzle-orm";
import {
  bigserial,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { bytea, fieldElement } from "./types";

export const issuer = pgSchema("issuer");

export const memberStatus = issuer.enum("member_status", [
  "pending",
  "active",
  "removal_pending",
  "removed",
]);
export const epochStatus = issuer.enum("epoch_status", [
  "computed",
  "posted",
  "confirmed",
  "failed",
]);

const now = () => timestamp({ withTimezone: true }).notNull().defaultNow();

export const groups = issuer.table("groups", {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  description: text().notNull().default(""),
  treeDepth: smallint("tree_depth").notNull().default(20),
  epochSeconds: integer("epoch_seconds").notNull().default(3600),
  recommendedMinAnonSet: integer("recommended_min_anon_set").notNull().default(100),
  currentEpoch: integer("current_epoch").notNull().default(0),
  nextLeafIndex: integer("next_leaf_index").notNull().default(0),
  createdAt: now(),
});

export const holders = issuer.table("holders", {
  id: uuid().primaryKey().defaultRandom(),
  accountHandle: text("account_handle").notNull().unique(),
  shieldedUaEnc: bytea("shielded_ua_enc").notNull(),
  createdAt: now(),
});

export const items = issuer.table(
  "items",
  {
    id: uuid().primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id),
    itemNumber: integer("item_number").notNull(),
    holderId: uuid("holder_id").references(() => holders.id),
    updatedAt: now(),
  },
  (t) => [uniqueIndex().on(t.groupId, t.itemNumber), index().on(t.holderId)],
);

export const challenges = issuer.table(
  "challenges",
  {
    id: uuid().primaryKey().defaultRandom(),
    holderId: uuid("holder_id")
      .notNull()
      .references(() => holders.id),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id),
    codeHash: bytea("code_hash").notNull(),
    attempts: smallint().notNull().default(0),
    sentTxid: bytea("sent_txid"),
    expiresAt: timestamp("expires_at", { withTimezone: true })
      .notNull()
      .default(sql`now() + interval '30 minutes'`),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    tokenHash: bytea("token_hash"),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: now(),
  },
  (t) => [
    index().on(t.holderId, t.createdAt),
    uniqueIndex().on(t.tokenHash).where(sql`${t.tokenHash} IS NOT NULL`),
  ],
);

export const members = issuer.table(
  "members",
  {
    id: uuid().primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id),
    commitment: fieldElement().notNull(),
    leafIndex: integer("leaf_index"),
    status: memberStatus().notNull().default("pending"),
    addedEpoch: integer("added_epoch"),
    removedEpoch: integer("removed_epoch"),
    createdAt: now(),
  },
  (t) => [
    uniqueIndex("members_one_live_leaf_per_item").on(t.itemId).where(sql`${t.status} <> 'removed'`),
    uniqueIndex().on(t.groupId, t.commitment),
    uniqueIndex().on(t.groupId, t.leafIndex),
    index().on(t.groupId, t.status),
  ],
);

export const epochs = issuer.table(
  "epochs",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id),
    epoch: integer().notNull(),
    root: fieldElement().notNull(),
    size: integer().notNull(),
    added: integer().notNull().default(0),
    removed: integer().notNull().default(0),
    status: epochStatus().notNull().default("computed"),
    beaconTxid: bytea("beacon_txid"),
    beaconHeight: integer("beacon_height"),
    computedAt: now(),
    postedAt: timestamp("posted_at", { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.epoch] }), index().on(t.groupId, t.status)],
);

export const transfers = issuer.table("transfers", {
  id: uuid().primaryKey().defaultRandom(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id),
  fromHolderId: uuid("from_holder_id").references(() => holders.id),
  toHolderId: uuid("to_holder_id").references(() => holders.id),
  recordedAt: now(),
  appliedEpoch: integer("applied_epoch"),
});

export const adminLog = issuer.table("admin_log", {
  id: bigserial({ mode: "number" }).primaryKey(),
  actor: text().notNull(),
  action: text().notNull(),
  detail: jsonb().notNull().default({}),
  createdAt: now(),
});
