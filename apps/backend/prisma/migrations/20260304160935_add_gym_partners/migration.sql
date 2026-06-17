-- CreateEnum
CREATE TYPE "GymPartnerStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'BLOCKED');

-- AlterTable
ALTER TABLE "ElevateStory" ALTER COLUMN "expiresAt" SET DEFAULT NOW() + INTERVAL '24 hours';

-- CreateTable
CREATE TABLE "GymPartner" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" "GymPartnerStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymPartner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GymPartner_requesterId_status_idx" ON "GymPartner"("requesterId", "status");

-- CreateIndex
CREATE INDEX "GymPartner_receiverId_status_idx" ON "GymPartner"("receiverId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GymPartner_requesterId_receiverId_key" ON "GymPartner"("requesterId", "receiverId");

-- AddForeignKey
ALTER TABLE "GymPartner" ADD CONSTRAINT "GymPartner_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymPartner" ADD CONSTRAINT "GymPartner_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
