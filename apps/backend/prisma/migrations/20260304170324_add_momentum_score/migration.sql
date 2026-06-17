-- AlterTable
ALTER TABLE "ElevatePost" ADD COLUMN     "momentumScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "momentumUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ElevateStory" ALTER COLUMN "expiresAt" SET DEFAULT NOW() + INTERVAL '24 hours';

-- CreateIndex
CREATE INDEX "ElevatePost_momentumScore_idx" ON "ElevatePost"("momentumScore");
