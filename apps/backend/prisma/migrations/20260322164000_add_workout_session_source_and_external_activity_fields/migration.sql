-- CreateEnum
CREATE TYPE "WorkoutSessionSource" AS ENUM (
  'MANUAL',
  'STRAVA',
  'APPLE_WATCH',
  'FITBIT',
  'WHOOP',
  'OURA_RING',
  'GOOGLE_PIXEL_WATCH',
  'SAMSUNG_GALAXY_WATCH',
  'APPLE_HEALTH',
  'GOOGLE_FIT',
  'SAMSUNG_HEALTH',
  'WITHINGS',
  'MYFITNESSPAL',
  'LOSE_IT',
  'GARMIN',
  'OTHER'
);

-- AlterTable
ALTER TABLE "workout_sessions"
ADD COLUMN "source" "WorkoutSessionSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "externalProvider" TEXT,
ADD COLUMN "externalActivityId" TEXT,
ADD COLUMN "externalActivityType" TEXT,
ADD COLUMN "externalSummary" JSONB,
ADD COLUMN "importedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "workout_sessions_userId_source_performed_idx"
ON "workout_sessions"("userId", "source", "performed");

-- CreateIndex
CREATE INDEX "workout_sessions_externalProvider_externalActivityId_idx"
ON "workout_sessions"("externalProvider", "externalActivityId");

-- CreateIndex
CREATE UNIQUE INDEX "workout_sessions_userId_externalProvider_externalActivityId_key"
ON "workout_sessions"("userId", "externalProvider", "externalActivityId");
