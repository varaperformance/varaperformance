-- Add STACK_REMINDER and INJECTION_REMINDER to NotificationType enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'STACK_REMINDER'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'STACK_REMINDER';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'INJECTION_REMINDER'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'INJECTION_REMINDER';
  END IF;
END
$$;

-- Add stackManagement and injectionTracker columns to NotificationPreference
ALTER TABLE "NotificationPreference"
  ADD COLUMN IF NOT EXISTS "stackManagement" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "NotificationPreference"
  ADD COLUMN IF NOT EXISTS "injectionTracker" BOOLEAN NOT NULL DEFAULT true;
