export interface MeasurementDeltas {
  waist: number | null;
  chest: number | null;
  hips: number | null;
}

export interface WeeklyReportData {
  workoutsLogged: number;
  personalRecords: number;
  waterGoalDaysHit: number;
  habitsCompleted: number;
  currentHabitStreak: number;
  caloriesAvg: number | null;
  proteinAvg: number | null;

  // Full macro breakdown
  carbsAvg: number | null;
  fatsAvg: number | null;
  nutritionLoggedDays: number;

  // Workout summary
  workoutDurationMinutes: number;
  totalVolume: number;
  muscleGroupsTrained: number;

  // Habit completion
  habitCompletionPercent: number | null;

  // Body measurement deltas
  measurementDeltas: MeasurementDeltas | null;

  // Achievements & challenges
  achievementsEarned: number;
  activeChallenges: number;

  // Steps
  avgDailySteps: number | null;
  stepGoalDaysHit: number;

  // Lifestyle adherence
  lifestyleAdherenceScore: number | null;
  lifestyleAdherencePrevious: number | null;

  // Stack / injection compliance
  stackCompliancePercent: number | null;
  injectionCompliancePercent: number | null;
}
