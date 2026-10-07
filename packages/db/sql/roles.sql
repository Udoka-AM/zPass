-- Runs before Drizzle migrations. Idempotent.
-- Creates the two service roles. Passwords are set out of band (ALTER ROLE ... PASSWORD).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'zpass_issuer') THEN
    CREATE ROLE zpass_issuer LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'zpass_verifier') THEN
    CREATE ROLE zpass_verifier LOGIN;
  END IF;
END
$$;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
