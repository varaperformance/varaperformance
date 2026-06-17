-- Composite indexes for common search filter patterns
CREATE INDEX IF NOT EXISTS "Food_isActive_name_idx"
  ON "Food" ("isActive", "name");

CREATE INDEX IF NOT EXISTS "Exercise_isActive_name_idx"
  ON "Exercise" ("isActive", "name");

-- Index on FoodLog for personalized ranking JOINs
CREATE INDEX IF NOT EXISTS "FoodLog_foodId_userId_idx"
  ON "FoodLog" ("foodId", "userId");

-- Index on workouts + workout_sessions for personalized exercise ranking
CREATE INDEX IF NOT EXISTS "workouts_exerciseId_sessionId_idx"
  ON "workouts" ("exerciseId", "sessionId");

CREATE INDEX IF NOT EXISTS "workout_sessions_userId_idx"
  ON "workout_sessions" ("userId");
