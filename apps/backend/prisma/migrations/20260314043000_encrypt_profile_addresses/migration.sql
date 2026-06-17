-- Migrate ProfileAddress plaintext fields to encrypted payload fields
-- Existing plaintext rows cannot be transformed in SQL because app-level KEK is required.
-- Remove legacy rows so encrypted NOT NULL columns can be added safely.
DELETE FROM "ProfileAddress";

ALTER TABLE "ProfileAddress"
  DROP COLUMN "label",
  DROP COLUMN "recipientName",
  DROP COLUMN "phone",
  DROP COLUMN "line1",
  DROP COLUMN "line2",
  DROP COLUMN "city",
  DROP COLUMN "state",
  DROP COLUMN "postalCode",
  DROP COLUMN "country",
  ADD COLUMN "eAddress" BYTEA NOT NULL,
  ADD COLUMN "addressIv" BYTEA NOT NULL,
  ADD COLUMN "addressAuthTag" BYTEA NOT NULL,
  ADD COLUMN "addressWrappedKey" BYTEA NOT NULL;
