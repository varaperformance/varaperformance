-- CreateEnum
CREATE TYPE "MeasurementUnit" AS ENUM ('IN', 'CM');

-- CreateTable
CREATE TABLE "BodyMeasurement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "unit" "MeasurementUnit" NOT NULL DEFAULT 'IN',
    "encryptedData" BYTEA NOT NULL,
    "dataIv" BYTEA NOT NULL,
    "dataAuthTag" BYTEA NOT NULL,
    "wrappedKey" BYTEA NOT NULL,
    "encryptedNote" BYTEA,
    "noteIv" BYTEA,
    "noteAuthTag" BYTEA,
    "noteWrappedKey" BYTEA,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BodyMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BodyMeasurement_userId_idx" ON "BodyMeasurement"("userId");

-- CreateIndex
CREATE INDEX "BodyMeasurement_userId_loggedAt_idx" ON "BodyMeasurement"("userId", "loggedAt");

-- CreateIndex
CREATE INDEX "BodyMeasurement_loggedAt_idx" ON "BodyMeasurement"("loggedAt");

-- AddForeignKey
ALTER TABLE "BodyMeasurement" ADD CONSTRAINT "BodyMeasurement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
