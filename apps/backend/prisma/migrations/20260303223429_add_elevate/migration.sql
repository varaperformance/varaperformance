-- CreateEnum
CREATE TYPE "ElevatePostType" AS ENUM ('TEXT', 'WORKOUT', 'MILESTONE', 'PHOTO', 'PR');

-- CreateEnum
CREATE TYPE "MilestoneType" AS ENUM ('STREAK', 'WORKOUT_COUNT', 'WEIGHT_GOAL', 'PR_COUNT', 'CUSTOM');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "coverUrl" VARCHAR(255);

-- CreateTable
CREATE TABLE "ElevatePost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ElevatePostType" NOT NULL,
    "content" TEXT NOT NULL,
    "images" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "workoutSessionId" TEXT,
    "milestoneType" "MilestoneType",
    "milestoneValue" INTEGER,
    "milestoneLabel" TEXT,
    "personalRecordId" TEXT,
    "highFiveCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ElevatePost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElevateReaction" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ElevateReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElevateComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "parentId" TEXT,

    CONSTRAINT "ElevateComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ElevatePost_workoutSessionId_key" ON "ElevatePost"("workoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "ElevatePost_personalRecordId_key" ON "ElevatePost"("personalRecordId");

-- CreateIndex
CREATE INDEX "ElevatePost_userId_idx" ON "ElevatePost"("userId");

-- CreateIndex
CREATE INDEX "ElevatePost_type_idx" ON "ElevatePost"("type");

-- CreateIndex
CREATE INDEX "ElevatePost_createdAt_idx" ON "ElevatePost"("createdAt");

-- CreateIndex
CREATE INDEX "ElevatePost_deletedAt_idx" ON "ElevatePost"("deletedAt");

-- CreateIndex
CREATE INDEX "ElevateReaction_postId_idx" ON "ElevateReaction"("postId");

-- CreateIndex
CREATE INDEX "ElevateReaction_userId_idx" ON "ElevateReaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ElevateReaction_postId_userId_key" ON "ElevateReaction"("postId", "userId");

-- CreateIndex
CREATE INDEX "ElevateComment_postId_idx" ON "ElevateComment"("postId");

-- CreateIndex
CREATE INDEX "ElevateComment_userId_idx" ON "ElevateComment"("userId");

-- CreateIndex
CREATE INDEX "ElevateComment_parentId_idx" ON "ElevateComment"("parentId");

-- CreateIndex
CREATE INDEX "ElevateComment_deletedAt_idx" ON "ElevateComment"("deletedAt");

-- AddForeignKey
ALTER TABLE "ElevatePost" ADD CONSTRAINT "ElevatePost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElevatePost" ADD CONSTRAINT "ElevatePost_workoutSessionId_fkey" FOREIGN KEY ("workoutSessionId") REFERENCES "workout_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElevatePost" ADD CONSTRAINT "ElevatePost_personalRecordId_fkey" FOREIGN KEY ("personalRecordId") REFERENCES "personal_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElevateReaction" ADD CONSTRAINT "ElevateReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ElevatePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElevateReaction" ADD CONSTRAINT "ElevateReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElevateComment" ADD CONSTRAINT "ElevateComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ElevatePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElevateComment" ADD CONSTRAINT "ElevateComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElevateComment" ADD CONSTRAINT "ElevateComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ElevateComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
