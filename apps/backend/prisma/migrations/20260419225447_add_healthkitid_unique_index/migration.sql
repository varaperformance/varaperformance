-- CreateIndex
CREATE UNIQUE INDEX "WorkoutSession_userId_healthKitId_key" ON "workout_sessions"("userId", "healthKitId");
