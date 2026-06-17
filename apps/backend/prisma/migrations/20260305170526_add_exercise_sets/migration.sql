-- AlterTable
ALTER TABLE "ElevateStory" ALTER COLUMN "expiresAt" SET DEFAULT NOW() + INTERVAL '24 hours';

-- CreateTable
CREATE TABLE "workout_plan_exercise_sets" (
    "id" TEXT NOT NULL,
    "planExerciseId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "targetReps" INTEGER,
    "targetWeight" DOUBLE PRECISION,
    "targetRpe" INTEGER,
    "targetDuration" INTEGER,
    "restAfter" INTEGER,
    "setType" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_plan_exercise_sets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workout_plan_exercise_sets_planExerciseId_idx" ON "workout_plan_exercise_sets"("planExerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "workout_plan_exercise_sets_planExerciseId_setNumber_key" ON "workout_plan_exercise_sets"("planExerciseId", "setNumber");

-- AddForeignKey
ALTER TABLE "workout_plan_exercise_sets" ADD CONSTRAINT "workout_plan_exercise_sets_planExerciseId_fkey" FOREIGN KEY ("planExerciseId") REFERENCES "workout_plan_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
