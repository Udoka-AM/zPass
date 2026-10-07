CREATE SCHEMA "issuer";
--> statement-breakpoint
CREATE SCHEMA "verifier";
--> statement-breakpoint
CREATE TYPE "issuer"."epoch_status" AS ENUM('computed', 'posted', 'confirmed', 'failed');--> statement-breakpoint
CREATE TYPE "issuer"."member_status" AS ENUM('pending', 'active', 'removal_pending', 'removed');--> statement-breakpoint
CREATE TABLE "issuer"."admin_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issuer"."challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"holder_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"code_hash" "bytea" NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"sent_txid" "bytea",
	"expires_at" timestamp with time zone DEFAULT now() + interval '30 minutes' NOT NULL,
	"verified_at" timestamp with time zone,
	"token_hash" "bytea",
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issuer"."epochs" (
	"group_id" uuid NOT NULL,
	"epoch" integer NOT NULL,
	"root" numeric(78, 0) NOT NULL,
	"size" integer NOT NULL,
	"added" integer DEFAULT 0 NOT NULL,
	"removed" integer DEFAULT 0 NOT NULL,
	"status" "issuer"."epoch_status" DEFAULT 'computed' NOT NULL,
	"beacon_txid" "bytea",
	"beacon_height" integer,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"posted_at" timestamp with time zone,
	CONSTRAINT "epochs_group_id_epoch_pk" PRIMARY KEY("group_id","epoch")
);
--> statement-breakpoint
CREATE TABLE "issuer"."groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"tree_depth" smallint DEFAULT 20 NOT NULL,
	"epoch_seconds" integer DEFAULT 3600 NOT NULL,
	"recommended_min_anon_set" integer DEFAULT 100 NOT NULL,
	"current_epoch" integer DEFAULT 0 NOT NULL,
	"next_leaf_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "groups_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "issuer"."holders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_handle" text NOT NULL,
	"shielded_ua_enc" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "holders_account_handle_unique" UNIQUE("account_handle")
);
--> statement-breakpoint
CREATE TABLE "issuer"."items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"item_number" integer NOT NULL,
	"holder_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issuer"."members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"commitment" numeric(78, 0) NOT NULL,
	"leaf_index" integer,
	"status" "issuer"."member_status" DEFAULT 'pending' NOT NULL,
	"added_epoch" integer,
	"removed_epoch" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issuer"."transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"from_holder_id" uuid,
	"to_holder_id" uuid,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_epoch" integer
);
--> statement-breakpoint
CREATE TABLE "verifier"."apps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"contact" text,
	"api_key_hash" "bytea" NOT NULL,
	"api_key_prefix" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "apps_api_key_hash_unique" UNIQUE("api_key_hash")
);
--> statement-breakpoint
CREATE TABLE "verifier"."beacon_roots" (
	"group_slug" text NOT NULL,
	"epoch" integer NOT NULL,
	"root" numeric(78, 0) NOT NULL,
	"size" integer NOT NULL,
	"txid" "bytea" NOT NULL,
	"block_height" integer NOT NULL,
	"block_time" timestamp with time zone NOT NULL,
	CONSTRAINT "beacon_roots_group_slug_epoch_pk" PRIMARY KEY("group_slug","epoch")
);
--> statement-breakpoint
CREATE TABLE "verifier"."nullifiers" (
	"scope_id" text NOT NULL,
	"nullifier" numeric(78, 0) NOT NULL,
	"used_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nullifiers_scope_id_nullifier_pk" PRIMARY KEY("scope_id","nullifier")
);
--> statement-breakpoint
CREATE TABLE "verifier"."oidc_clients" (
	"client_id" text PRIMARY KEY NOT NULL,
	"app_id" uuid NOT NULL,
	"name" text NOT NULL,
	"redirect_uris" text[] NOT NULL,
	"scope_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verifier"."oidc_codes" (
	"code_hash" "bytea" PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"sub" numeric(78, 0) NOT NULL,
	"group_slug" text NOT NULL,
	"root_epoch" integer NOT NULL,
	"nonce" text,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "verifier"."polls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app_id" uuid NOT NULL,
	"scope_id" text NOT NULL,
	"question" text NOT NULL,
	"options" jsonb NOT NULL,
	"opens_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "polls_scope_id_unique" UNIQUE("scope_id")
);
--> statement-breakpoint
CREATE TABLE "verifier"."scopes" (
	"id" text PRIMARY KEY NOT NULL,
	"scope_hash" numeric(78, 0) NOT NULL,
	"app_id" uuid NOT NULL,
	"group_slug" text NOT NULL,
	"min_anon_set" integer DEFAULT 25 NOT NULL,
	"root_window_epochs" integer DEFAULT 24 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scopes_scope_hash_unique" UNIQUE("scope_hash")
);
--> statement-breakpoint
CREATE TABLE "verifier"."tg_chats" (
	"chat_id" bigint PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"scope_id" text NOT NULL,
	"group_slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tg_chats_scope_id_unique" UNIQUE("scope_id")
);
--> statement-breakpoint
CREATE TABLE "verifier"."votes" (
	"poll_id" uuid NOT NULL,
	"nullifier" numeric(78, 0) NOT NULL,
	"option_index" smallint NOT NULL,
	"root_epoch" integer NOT NULL,
	"proof" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "votes_poll_id_nullifier_pk" PRIMARY KEY("poll_id","nullifier")
);
--> statement-breakpoint
ALTER TABLE "issuer"."challenges" ADD CONSTRAINT "challenges_holder_id_holders_id_fk" FOREIGN KEY ("holder_id") REFERENCES "issuer"."holders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issuer"."challenges" ADD CONSTRAINT "challenges_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "issuer"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issuer"."epochs" ADD CONSTRAINT "epochs_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "issuer"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issuer"."items" ADD CONSTRAINT "items_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "issuer"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issuer"."items" ADD CONSTRAINT "items_holder_id_holders_id_fk" FOREIGN KEY ("holder_id") REFERENCES "issuer"."holders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issuer"."members" ADD CONSTRAINT "members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "issuer"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issuer"."members" ADD CONSTRAINT "members_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "issuer"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issuer"."transfers" ADD CONSTRAINT "transfers_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "issuer"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issuer"."transfers" ADD CONSTRAINT "transfers_from_holder_id_holders_id_fk" FOREIGN KEY ("from_holder_id") REFERENCES "issuer"."holders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issuer"."transfers" ADD CONSTRAINT "transfers_to_holder_id_holders_id_fk" FOREIGN KEY ("to_holder_id") REFERENCES "issuer"."holders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifier"."nullifiers" ADD CONSTRAINT "nullifiers_scope_id_scopes_id_fk" FOREIGN KEY ("scope_id") REFERENCES "verifier"."scopes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifier"."oidc_clients" ADD CONSTRAINT "oidc_clients_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "verifier"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifier"."oidc_clients" ADD CONSTRAINT "oidc_clients_scope_id_scopes_id_fk" FOREIGN KEY ("scope_id") REFERENCES "verifier"."scopes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifier"."oidc_codes" ADD CONSTRAINT "oidc_codes_client_id_oidc_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "verifier"."oidc_clients"("client_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifier"."polls" ADD CONSTRAINT "polls_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "verifier"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifier"."polls" ADD CONSTRAINT "polls_scope_id_scopes_id_fk" FOREIGN KEY ("scope_id") REFERENCES "verifier"."scopes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifier"."scopes" ADD CONSTRAINT "scopes_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "verifier"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifier"."tg_chats" ADD CONSTRAINT "tg_chats_scope_id_scopes_id_fk" FOREIGN KEY ("scope_id") REFERENCES "verifier"."scopes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifier"."votes" ADD CONSTRAINT "votes_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "verifier"."polls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "challenges_holder_id_created_at_index" ON "issuer"."challenges" USING btree ("holder_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "challenges_token_hash_index" ON "issuer"."challenges" USING btree ("token_hash") WHERE "issuer"."challenges"."token_hash" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "epochs_group_id_status_index" ON "issuer"."epochs" USING btree ("group_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "items_group_id_item_number_index" ON "issuer"."items" USING btree ("group_id","item_number");--> statement-breakpoint
CREATE INDEX "items_holder_id_index" ON "issuer"."items" USING btree ("holder_id");--> statement-breakpoint
CREATE UNIQUE INDEX "members_one_live_leaf_per_item" ON "issuer"."members" USING btree ("item_id") WHERE "issuer"."members"."status" <> 'removed';--> statement-breakpoint
CREATE UNIQUE INDEX "members_group_id_commitment_index" ON "issuer"."members" USING btree ("group_id","commitment");--> statement-breakpoint
CREATE UNIQUE INDEX "members_group_id_leaf_index_index" ON "issuer"."members" USING btree ("group_id","leaf_index");--> statement-breakpoint
CREATE INDEX "members_group_id_status_index" ON "issuer"."members" USING btree ("group_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "beacon_roots_group_slug_root_index" ON "verifier"."beacon_roots" USING btree ("group_slug","root");