-- CreateEnum
CREATE TYPE "ClimbCategory" AS ENUM ('DAILY', 'FACE', 'ABS', 'BACK', 'LEGS', 'GLUTES', 'ARMS', 'CHEST', 'SHOULDERS');

-- AlterTable
ALTER TABLE "ClimbEntry"
ADD COLUMN     "category" "ClimbCategory" NOT NULL DEFAULT 'DAILY';

-- DropIndex
DROP INDEX "ClimbEntry_userId_capturedDate_idx";

-- DropIndex
DROP INDEX "ClimbEntry_userId_capturedDate_key";

-- CreateIndex
CREATE INDEX "ClimbEntry_userId_category_capturedDate_idx" ON "ClimbEntry"("userId", "category", "capturedDate");

-- CreateIndex
CREATE UNIQUE INDEX "ClimbEntry_userId_capturedDate_category_key" ON "ClimbEntry"("userId", "capturedDate", "category");
