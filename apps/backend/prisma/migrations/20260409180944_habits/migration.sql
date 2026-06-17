-- CreateEnum
CREATE TYPE "HabitLinkedModule" AS ENUM ('STACK', 'CLIMB', 'INJECTION');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ACHIEVEMENT_UNLOCKED';

-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "linkedModule" "HabitLinkedModule";

-- AlterTable
ALTER TABLE "NotificationPreference" ADD COLUMN     "achievements" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Habit_userId_linkedModule_idx" ON "Habit"("userId", "linkedModule");
