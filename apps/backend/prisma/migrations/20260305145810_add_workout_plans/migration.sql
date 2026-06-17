-- CreateEnum
CREATE TYPE "WorkoutPlanVisibility" AS ENUM ('PRIVATE', 'CLIENTS', 'PUBLIC');

-- CreateEnum
CREATE TYPE "WorkoutPlanAssignmentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'WORKOUT_PLAN_ASSIGNED';

-- AlterTable
ALTER TABLE "ElevateStory" ALTER COLUMN "expiresAt" SET DEFAULT NOW() + INTERVAL '24 hours';

-- CreateTable
CREATE TABLE "workout_plans" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "WorkoutPlanVisibility" NOT NULL DEFAULT 'PRIVATE',
    "coachId" TEXT,
    "durationWeeks" INTEGER,
    "difficulty" "ExerciseDifficulty",
    "copyCount" INTEGER NOT NULL DEFAULT 0,
    "assignCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "copiedFromId" TEXT,

    CONSTRAINT "workout_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_plan_days" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "name" TEXT,
    "isRestDay" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_plan_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_plan_exercises" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "targetSets" INTEGER,
    "targetRepsMin" INTEGER,
    "targetRepsMax" INTEGER,
    "targetWeight" DOUBLE PRECISION,
    "targetRpe" INTEGER,
    "targetDuration" INTEGER,
    "targetDistance" DOUBLE PRECISION,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_plan_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_plan_assignments" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "assignedById" TEXT,
    "bookingId" TEXT,
    "status" "WorkoutPlanAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "coachNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_plan_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_plan_completed_days" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "sessionId" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workout_plan_completed_days_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workout_plans_creatorId_idx" ON "workout_plans"("creatorId");

-- CreateIndex
CREATE INDEX "workout_plans_coachId_idx" ON "workout_plans"("coachId");

-- CreateIndex
CREATE INDEX "workout_plans_visibility_idx" ON "workout_plans"("visibility");

-- CreateIndex
CREATE INDEX "workout_plans_isActive_visibility_idx" ON "workout_plans"("isActive", "visibility");

-- CreateIndex
CREATE INDEX "workout_plan_days_planId_idx" ON "workout_plan_days"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "workout_plan_days_planId_dayOfWeek_key" ON "workout_plan_days"("planId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "workout_plan_exercises_dayId_idx" ON "workout_plan_exercises"("dayId");

-- CreateIndex
CREATE INDEX "workout_plan_exercises_exerciseId_idx" ON "workout_plan_exercises"("exerciseId");

-- CreateIndex
CREATE INDEX "workout_plan_assignments_clientId_idx" ON "workout_plan_assignments"("clientId");

-- CreateIndex
CREATE INDEX "workout_plan_assignments_planId_idx" ON "workout_plan_assignments"("planId");

-- CreateIndex
CREATE INDEX "workout_plan_assignments_assignedById_idx" ON "workout_plan_assignments"("assignedById");

-- CreateIndex
CREATE INDEX "workout_plan_assignments_status_idx" ON "workout_plan_assignments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "workout_plan_assignments_planId_clientId_status_key" ON "workout_plan_assignments"("planId", "clientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "workout_plan_completed_days_sessionId_key" ON "workout_plan_completed_days"("sessionId");

-- CreateIndex
CREATE INDEX "workout_plan_completed_days_assignmentId_idx" ON "workout_plan_completed_days"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "workout_plan_completed_days_assignmentId_dayOfWeek_weekNumb_key" ON "workout_plan_completed_days"("assignmentId", "dayOfWeek", "weekNumber");

-- AddForeignKey
ALTER TABLE "workout_plans" ADD CONSTRAINT "workout_plans_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_plans" ADD CONSTRAINT "workout_plans_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_plans" ADD CONSTRAINT "workout_plans_copiedFromId_fkey" FOREIGN KEY ("copiedFromId") REFERENCES "workout_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_plan_days" ADD CONSTRAINT "workout_plan_days_planId_fkey" FOREIGN KEY ("planId") REFERENCES "workout_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_plan_exercises" ADD CONSTRAINT "workout_plan_exercises_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "workout_plan_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_plan_exercises" ADD CONSTRAINT "workout_plan_exercises_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_plan_assignments" ADD CONSTRAINT "workout_plan_assignments_planId_fkey" FOREIGN KEY ("planId") REFERENCES "workout_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_plan_assignments" ADD CONSTRAINT "workout_plan_assignments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_plan_assignments" ADD CONSTRAINT "workout_plan_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_plan_assignments" ADD CONSTRAINT "workout_plan_assignments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_plan_completed_days" ADD CONSTRAINT "workout_plan_completed_days_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "workout_plan_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_plan_completed_days" ADD CONSTRAINT "workout_plan_completed_days_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "workout_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
