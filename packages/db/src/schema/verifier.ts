// verifier schema. Source of truth: docs/05-BACKEND-SCHEMA.md §5.3
// No foreign keys into the issuer schema, by design.
import {
  bigint,
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

export const verifier = pgSchema("verifier");

const now = () => timestamp({ withTimezone: true }).notNull().defaultNow();

export const apps = verifier.table("apps", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  contact: text(),
  apiKeyHash: bytea("api_key_hash").notNull().unique(),
  apiKeyPrefix: text("api_key_prefix").notNull(),
  createdAt: now(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export const scopes = verifier.table("scopes", {
  id: text().primaryKey(),
  scopeHash: fieldElement("scope_hash").notNull().unique(),
  appId: uuid("app_id")
    .notNull()
    .references(() => apps.id),
  groupSlug: text("group_slug").notNull(),
  minAnonSet: integer("min_anon_set").notNull().default(25),
  rootWindowEpochs: integer("root_window_epochs").notNull().default(24),
  createdAt: now(),
});

export const beaconRoots = verifier.table(
  "beacon_roots",
  {
    groupSlug: text("group_slug").notNull(),
    epoch: integer().notNull(),
    root: fieldElement().notNull(),
    size: integer().notNull(),
    txid: bytea().notNull(),
    blockHeight: integer("block_height").notNull(),
    blockTime: timestamp("block_time", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.groupSlug, t.epoch] }), uniqueIndex().on(t.groupSlug, t.root)],
);

export const nullifiers = verifier.table(
  "nullifiers",
  {
    scopeId: text("scope_id")
      .notNull()
      .references(() => scopes.id),
    nullifier: fieldElement().notNull(),
    usedAt: now(),
  },
  (t) => [primaryKey({ columns: [t.scopeId, t.nullifier] })],
);

export const polls = verifier.table("polls", {
  id: uuid().primaryKey().defaultRandom(),
  appId: uuid("app_id")
    .notNull()
    .references(() => apps.id),
  scopeId: text("scope_id")
    .notNull()
    .unique()
    .references(() => scopes.id),
  question: text().notNull(),
  options: jsonb().$type<string[]>().notNull(),
  opensAt: timestamp("opens_at", { withTimezone: true }).notNull().defaultNow(),
  closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),
  createdAt: now(),
});

export const votes = verifier.table(
  "votes",
  {
    pollId: uuid("poll_id")
      .notNull()
      .references(() => polls.id),
    nullifier: fieldElement().notNull(),
    optionIndex: smallint("option_index").notNull(),
    rootEpoch: integer("root_epoch").notNull(),
    proof: jsonb().notNull(),
    createdAt: now(),
  },
  (t) => [primaryKey({ columns: [t.pollId, t.nullifier] })],
);

export const tgChats = verifier.table("tg_chats", {
  chatId: bigint("chat_id", { mode: "bigint" }).primaryKey(),
  title: text().notNull(),
  scopeId: text("scope_id")
    .notNull()
    .unique()
    .references(() => scopes.id),
  groupSlug: text("group_slug").notNull(),
  createdAt: now(),
});

export const oidcClients = verifier.table("oidc_clients", {
  clientId: text("client_id").primaryKey(),
  appId: uuid("app_id")
    .notNull()
    .references(() => apps.id),
  name: text().notNull(),
  redirectUris: text("redirect_uris").array().notNull(),
  scopeId: text("scope_id")
    .notNull()
    .references(() => scopes.id),
  createdAt: now(),
});

export const oidcCodes = verifier.table("oidc_codes", {
  codeHash: bytea("code_hash").primaryKey(),
  clientId: text("client_id")
    .notNull()
    .references(() => oidcClients.clientId),
  sub: fieldElement().notNull(),
  groupSlug: text("group_slug").notNull(),
  rootEpoch: integer("root_epoch").notNull(),
  nonce: text(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});
