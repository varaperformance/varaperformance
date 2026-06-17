-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('EVENT', 'MEETING');

-- CreateEnum
CREATE TYPE "CalendarEventVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "ElevateStory" ALTER COLUMN "expiresAt" SET DEFAULT NOW() + INTERVAL '24 hours';

-- AlterTable
ALTER TABLE "PlatformSetting" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PricingPlan" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PricingPlanFeature" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "participantUserId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "type" "CalendarEventType" NOT NULL DEFAULT 'EVENT',
    "visibility" "CalendarEventVisibility" NOT NULL DEFAULT 'PUBLIC',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "recurrenceFrequency" "RecurrenceFrequency",
    "recurrenceInterval" INTEGER NOT NULL DEFAULT 1,
    "recurrenceByWeekday" INTEGER[],
    "recurrenceUntil" TIMESTAMP(3),
    "recurrenceCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarEvent_ownerUserId_startAt_idx" ON "CalendarEvent"("ownerUserId", "startAt");

-- CreateIndex
CREATE INDEX "CalendarEvent_participantUserId_startAt_idx" ON "CalendarEvent"("participantUserId", "startAt");

-- CreateIndex
CREATE INDEX "CalendarEvent_startAt_endAt_idx" ON "CalendarEvent"("startAt", "endAt");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_stripeRefundId_key" ON "Refund"("stripeRefundId");

-- CreateIndex
CREATE INDEX "StripeCustomer_stripeCustomerId_idx" ON "StripeCustomer"("stripeCustomerId");

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_participantUserId_fkey" FOREIGN KEY ("participantUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

