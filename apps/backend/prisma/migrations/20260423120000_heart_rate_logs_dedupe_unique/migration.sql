-- Deduplicate heart_rate_logs before adding a unique constraint.
-- Keep the earliest insert per (userId, timestamp, source) so counts match
-- minute-level sync semantics; delete newer duplicate rows.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "userId", "timestamp", "source"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS rn
  FROM "heart_rate_logs"
)
DELETE FROM "heart_rate_logs" AS h
USING ranked AS r
WHERE h.id = r.id
  AND r.rn > 1;

-- DropIndex
DROP INDEX IF EXISTS "heart_rate_logs_userId_timestamp_idx";

-- CreateIndex
CREATE UNIQUE INDEX "heart_rate_logs_userId_timestamp_source_key" ON "heart_rate_logs"("userId", "timestamp", "source");
