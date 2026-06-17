-- AlterTable
ALTER TABLE "WeightLog" ADD COLUMN "source" "WorkoutSessionSource" NOT NULL DEFAULT 'MANUAL';

-- CreateIndex
CREATE INDEX "WeightLog_userId_source_idx" ON "WeightLog"("userId", "source");
