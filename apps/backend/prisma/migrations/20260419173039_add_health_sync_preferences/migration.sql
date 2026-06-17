-- AlterTable
ALTER TABLE "workout_sessions" ADD COLUMN     "healthKitId" TEXT;

-- CreateTable
CREATE TABLE "health_sync_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readSteps" BOOLEAN NOT NULL DEFAULT true,
    "readSleep" BOOLEAN NOT NULL DEFAULT true,
    "readHeartRate" BOOLEAN NOT NULL DEFAULT true,
    "readWeight" BOOLEAN NOT NULL DEFAULT true,
    "readWater" BOOLEAN NOT NULL DEFAULT true,
    "readWorkouts" BOOLEAN NOT NULL DEFAULT true,
    "writeWeight" BOOLEAN NOT NULL DEFAULT false,
    "writeWater" BOOLEAN NOT NULL DEFAULT false,
    "writeWorkouts" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_sync_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "health_sync_preferences_userId_key" ON "health_sync_preferences"("userId");

-- AddForeignKey
ALTER TABLE "health_sync_preferences" ADD CONSTRAINT "health_sync_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
