-- AlterEnum
ALTER TYPE "ElevatePostType" ADD VALUE 'CHALLENGE';

-- AlterTable
ALTER TABLE "ElevatePost" ADD COLUMN     "challengeId" TEXT;

-- AddForeignKey
ALTER TABLE "ElevatePost" ADD CONSTRAINT "ElevatePost_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
