-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('DRAFT', 'UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChallengeType" AS ENUM ('WORKOUT_COUNT', 'STREAK_DAYS', 'WEIGHT_LOSS', 'STEPS_TOTAL', 'PR_COUNT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ChallengeVisibility" AS ENUM ('PUBLIC', 'INVITE', 'PRIVATE');

-- CreateEnum
CREATE TYPE "ChallengeParticipantStatus" AS ENUM ('REGISTERED', 'ACTIVE', 'COMPLETED', 'WITHDRAWN');

-- AlterEnum
ALTER TYPE "ElevatePostType" ADD VALUE 'ACHIEVEMENT';

-- AlterTable
ALTER TABLE "ElevatePost" ADD COLUMN     "achievementId" TEXT;

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT NOT NULL,
    "coverImage" TEXT,
    "type" "ChallengeType" NOT NULL,
    "status" "ChallengeStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "ChallengeVisibility" NOT NULL DEFAULT 'PUBLIC',
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "goalValue" INTEGER NOT NULL,
    "goalUnit" VARCHAR(50) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "maxParticipants" INTEGER,
    "participantCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeParticipant" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ChallengeParticipantStatus" NOT NULL DEFAULT 'REGISTERED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChallengeParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Challenge_status_idx" ON "Challenge"("status");

-- CreateIndex
CREATE INDEX "Challenge_creatorId_idx" ON "Challenge"("creatorId");

-- CreateIndex
CREATE INDEX "Challenge_isOfficial_status_idx" ON "Challenge"("isOfficial", "status");

-- CreateIndex
CREATE INDEX "Challenge_startDate_idx" ON "Challenge"("startDate");

-- CreateIndex
CREATE INDEX "Challenge_endDate_idx" ON "Challenge"("endDate");

-- CreateIndex
CREATE INDEX "Challenge_visibility_status_idx" ON "Challenge"("visibility", "status");

-- CreateIndex
CREATE INDEX "ChallengeParticipant_challengeId_idx" ON "ChallengeParticipant"("challengeId");

-- CreateIndex
CREATE INDEX "ChallengeParticipant_userId_idx" ON "ChallengeParticipant"("userId");

-- CreateIndex
CREATE INDEX "ChallengeParticipant_status_idx" ON "ChallengeParticipant"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeParticipant_challengeId_userId_key" ON "ChallengeParticipant"("challengeId", "userId");

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeParticipant" ADD CONSTRAINT "ChallengeParticipant_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeParticipant" ADD CONSTRAINT "ChallengeParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElevatePost" ADD CONSTRAINT "ElevatePost_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
