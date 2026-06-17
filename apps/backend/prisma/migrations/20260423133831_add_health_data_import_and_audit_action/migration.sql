-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'DATA_IMPORT';

-- CreateTable
CREATE TABLE "HealthDataImport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthDataImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HealthDataImport_userId_provider_idx" ON "HealthDataImport"("userId", "provider");

-- CreateIndex
CREATE INDEX "HealthDataImport_createdAt_idx" ON "HealthDataImport"("createdAt");
