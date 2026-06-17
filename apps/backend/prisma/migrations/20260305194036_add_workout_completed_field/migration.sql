-- AlterTable
ALTER TABLE "ElevateStory" ALTER COLUMN "expiresAt" SET DEFAULT NOW() + INTERVAL '24 hours';

-- AlterTable
ALTER TABLE "workouts" ADD COLUMN     "completed" BOOLEAN NOT NULL DEFAULT false;
