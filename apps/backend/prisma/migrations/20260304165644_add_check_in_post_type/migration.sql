-- AlterEnum
ALTER TYPE "ElevatePostType" ADD VALUE 'CHECK_IN';

-- AlterTable
ALTER TABLE "ElevatePost" ADD COLUMN     "checkInGymId" TEXT,
ADD COLUMN     "checkInGymName" TEXT;

-- AlterTable
ALTER TABLE "ElevateStory" ALTER COLUMN "expiresAt" SET DEFAULT NOW() + INTERVAL '24 hours';

-- AddForeignKey
ALTER TABLE "ElevatePost" ADD CONSTRAINT "ElevatePost_checkInGymId_fkey" FOREIGN KEY ("checkInGymId") REFERENCES "Gym"("id") ON DELETE SET NULL ON UPDATE CASCADE;
