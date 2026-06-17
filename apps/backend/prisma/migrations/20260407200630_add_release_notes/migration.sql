-- CreateEnum
CREATE TYPE "ReleaseType" AS ENUM ('MAJOR', 'MINOR', 'PATCH');

-- CreateEnum
CREATE TYPE "ReleaseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- DropIndex
DROP INDEX "Exercise_description_trgm_idx";

-- DropIndex
DROP INDEX "Exercise_isActive_name_idx";

-- DropIndex
DROP INDEX "Exercise_name_trgm_idx";

-- DropIndex
DROP INDEX "Food_brand_trgm_idx";

-- DropIndex
DROP INDEX "Food_isActive_name_idx";

-- DropIndex
DROP INDEX "Food_name_trgm_idx";

-- DropIndex
DROP INDEX "FoodLog_foodId_userId_idx";

-- DropIndex
DROP INDEX "workouts_exerciseId_sessionId_idx";

-- CreateTable
CREATE TABLE "ReleaseNote" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT,
    "type" "ReleaseType" NOT NULL DEFAULT 'MINOR',
    "status" "ReleaseStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "improvements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fixes" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "ReleaseNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseNote_version_key" ON "ReleaseNote"("version");

-- CreateIndex
CREATE INDEX "ReleaseNote_status_publishedAt_idx" ON "ReleaseNote"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "ReleaseNote_version_idx" ON "ReleaseNote"("version");
