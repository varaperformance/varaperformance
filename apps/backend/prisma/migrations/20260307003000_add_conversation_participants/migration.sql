-- Add canonical participant fields to Conversation and backfill from legacy coach/client references

ALTER TABLE "Conversation"
ADD COLUMN IF NOT EXISTS "participantOneId" TEXT,
ADD COLUMN IF NOT EXISTS "participantTwoId" TEXT,
ADD COLUMN IF NOT EXISTS "participantOneUnreadCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "participantTwoUnreadCount" INTEGER NOT NULL DEFAULT 0;

-- Backfill participant IDs from legacy coach/client pair
UPDATE "Conversation" c
SET
  "participantOneId" = LEAST(co."userId", c."clientId"),
  "participantTwoId" = GREATEST(co."userId", c."clientId")
FROM "Coach" co
WHERE c."coachId" = co.id
  AND c."clientId" IS NOT NULL
  AND (c."participantOneId" IS NULL OR c."participantTwoId" IS NULL);

-- Fallback backfill via booking relation when available
UPDATE "Conversation" c
SET
  "participantOneId" = LEAST(co."userId", b."userId"),
  "participantTwoId" = GREATEST(co."userId", b."userId")
FROM "Booking" b
JOIN "Coach" co ON co.id = b."coachId"
WHERE c."bookingId" = b.id
  AND (c."participantOneId" IS NULL OR c."participantTwoId" IS NULL);

-- Remove any unresolved legacy rows (should be none in fresh/dev environments)
DELETE FROM "Conversation"
WHERE "participantOneId" IS NULL OR "participantTwoId" IS NULL;

ALTER TABLE "Conversation"
ALTER COLUMN "participantOneId" SET NOT NULL,
ALTER COLUMN "participantTwoId" SET NOT NULL;

-- Add relations and indexes for participant model
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Conversation_participantOneId_fkey'
  ) THEN
    ALTER TABLE "Conversation"
    ADD CONSTRAINT "Conversation_participantOneId_fkey"
    FOREIGN KEY ("participantOneId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Conversation_participantTwoId_fkey'
  ) THEN
    ALTER TABLE "Conversation"
    ADD CONSTRAINT "Conversation_participantTwoId_fkey"
    FOREIGN KEY ("participantTwoId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Conversation_participantOneId_participantTwoId_key"
  ON "Conversation"("participantOneId", "participantTwoId");

CREATE INDEX IF NOT EXISTS "Conversation_participantOneId_lastMessageAt_idx"
  ON "Conversation"("participantOneId", "lastMessageAt");

CREATE INDEX IF NOT EXISTS "Conversation_participantTwoId_lastMessageAt_idx"
  ON "Conversation"("participantTwoId", "lastMessageAt");
