-- CreateEnum
CREATE TYPE "ElevateReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'HATE_SPEECH', 'VIOLENCE', 'NUDITY', 'FALSE_INFO', 'SCAM', 'OTHER');

-- CreateEnum
CREATE TYPE "ElevateReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED');

-- AlterTable
ALTER TABLE "ElevatePost" ADD COLUMN     "moderationLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reportCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ElevateReport" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" "ElevateReportReason" NOT NULL,
    "details" TEXT,
    "status" "ElevateReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,

    CONSTRAINT "ElevateReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ElevateReport_postId_idx" ON "ElevateReport"("postId");

-- CreateIndex
CREATE INDEX "ElevateReport_userId_idx" ON "ElevateReport"("userId");

-- CreateIndex
CREATE INDEX "ElevateReport_status_idx" ON "ElevateReport"("status");

-- CreateIndex
CREATE INDEX "ElevateReport_createdAt_idx" ON "ElevateReport"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ElevateReport_postId_userId_key" ON "ElevateReport"("postId", "userId");

-- AddForeignKey
ALTER TABLE "ElevateReport" ADD CONSTRAINT "ElevateReport_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ElevatePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElevateReport" ADD CONSTRAINT "ElevateReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElevateReport" ADD CONSTRAINT "ElevateReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
