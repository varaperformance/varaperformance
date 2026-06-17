-- AlterTable
ALTER TABLE "ElevateStory" ALTER COLUMN "expiresAt" SET DEFAULT NOW() + INTERVAL '24 hours';

-- AlterTable
ALTER TABLE "workout_sessions" ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "gymId" TEXT,
ADD COLUMN     "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "workout_sessions_gymId_idx" ON "workout_sessions"("gymId");

-- CreateIndex
CREATE INDEX "workout_sessions_startedAt_idx" ON "workout_sessions"("startedAt");

-- CreateIndex
CREATE INDEX "workout_sessions_gymId_startedAt_idx" ON "workout_sessions"("gymId", "startedAt");

-- AddForeignKey
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE SET NULL ON UPDATE CASCADE;
