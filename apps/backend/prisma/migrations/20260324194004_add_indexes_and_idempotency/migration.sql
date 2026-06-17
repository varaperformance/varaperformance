/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `AuditLog` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AuditLog_idempotencyKey_key" ON "AuditLog"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Booking_coachId_status_idx" ON "Booking"("coachId", "status");

-- CreateIndex
CREATE INDEX "Booking_userId_status_idx" ON "Booking"("userId", "status");

-- CreateIndex
CREATE INDEX "ElevatePost_userId_createdAt_idx" ON "ElevatePost"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ElevatePost_privacy_momentumScore_idx" ON "ElevatePost"("privacy", "momentumScore");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_userId_type_createdAt_idx" ON "Notification"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_customerId_status_idx" ON "Payment"("customerId", "status");
