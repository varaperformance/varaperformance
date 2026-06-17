-- CreateEnum
CREATE TYPE "BreachSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "BreachStatus" AS ENUM ('DETECTED', 'INVESTIGATING', 'CONTAINED', 'NOTIFIED_DPA', 'NOTIFIED_USERS', 'RESOLVED');

-- CreateTable
CREATE TABLE "BreachNotification" (
    "id" TEXT NOT NULL,
    "reportedBy" TEXT NOT NULL,
    "severity" "BreachSeverity" NOT NULL,
    "status" "BreachStatus" NOT NULL DEFAULT 'DETECTED',
    "description" TEXT NOT NULL,
    "dataCategories" TEXT[],
    "affectedCount" INTEGER,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "containedAt" TIMESTAMP(3),
    "dpaNotifiedAt" TIMESTAMP(3),
    "usersNotifiedAt" TIMESTAMP(3),
    "dpaReference" TEXT,
    "internalNotes" TEXT,
    "eNotes" BYTEA,
    "notesIv" BYTEA,
    "notesAuthTag" BYTEA,
    "notesWrappedKey" BYTEA,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BreachNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BreachNotification_status_idx" ON "BreachNotification"("status");

-- CreateIndex
CREATE INDEX "BreachNotification_severity_idx" ON "BreachNotification"("severity");

-- CreateIndex
CREATE INDEX "BreachNotification_detectedAt_idx" ON "BreachNotification"("detectedAt");
