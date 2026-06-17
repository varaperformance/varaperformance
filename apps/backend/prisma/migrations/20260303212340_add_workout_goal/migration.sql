-- CreateTable
CREATE TABLE "workout_goals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weeklyWorkouts" INTEGER NOT NULL DEFAULT 4,
    "muscleTargets" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workout_goals_userId_key" ON "workout_goals"("userId");

-- AddForeignKey
ALTER TABLE "workout_goals" ADD CONSTRAINT "workout_goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
