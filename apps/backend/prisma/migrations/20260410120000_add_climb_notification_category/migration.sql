-- Add CLIMB_REMINDER to NotificationType enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'CLIMB_REMINDER'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'CLIMB_REMINDER';
  END IF;
END
$$;

-- Add climb preference column to NotificationPreference
ALTER TABLE "NotificationPreference"
  ADD COLUMN IF NOT EXISTS "climb" BOOLEAN NOT NULL DEFAULT true;
