-- Runs after Drizzle migrations. Idempotent.
-- The separation between these roles is part of the privacy design (PRD AC12):
-- the verifier can never read issuer membership data, and vice versa.
REVOKE ALL ON SCHEMA issuer FROM PUBLIC;
REVOKE ALL ON SCHEMA verifier FROM PUBLIC;

GRANT USAGE ON SCHEMA issuer TO zpass_issuer;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA issuer TO zpass_issuer;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA issuer TO zpass_issuer;
REVOKE UPDATE, DELETE ON issuer.admin_log FROM zpass_issuer;
GRANT DELETE ON issuer.challenges TO zpass_issuer;

GRANT USAGE ON SCHEMA verifier TO zpass_verifier;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA verifier TO zpass_verifier;
-- Nullifiers and votes are insert-only.
REVOKE UPDATE, DELETE ON verifier.nullifiers, verifier.votes FROM zpass_verifier;

REVOKE ALL ON SCHEMA verifier FROM zpass_issuer;
REVOKE ALL ON SCHEMA issuer FROM zpass_verifier;
