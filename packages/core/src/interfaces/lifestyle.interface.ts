export interface LifestyleGoalResponse {
  id: string;
  sleepHours: number;
  dailySteps: number;
  adherenceTarget: number;
  checkInsPerWeek: number;
  createdAt: string;
  updatedAt: string;
}

export interface LifestyleTrendPoint {
  date: string;
  workoutCount: number;
  nutritionLogged: boolean;
  hydrationLogged: boolean;
  stepCount: number;
  sleepHours: number;
  adherenceScore: number;
  recoveryScore: number;
}

export interface LifestyleInsightsWeekSummary {
  workoutDays: number;
  workoutTarget: number;
  nutritionDays: number;
  hydrationDays: number;
  stepsDays: number;
  stepsTarget: number;
  checkInDays: number;
  checkInTarget: number;
}

export interface LifestyleInsightsResponse {
  adherenceScore: number;
  adherenceTarget: number;
  adherenceTrend: 'up' | 'down' | 'neutral';
  adherenceDelta: number;
  recoveryScore: number;
  recoveryTrend: 'up' | 'down' | 'neutral';
  recoveryDelta: number;
  currentWeek: LifestyleInsightsWeekSummary;
  previousWeek: LifestyleInsightsWeekSummary;
  trend: LifestyleTrendPoint[];
}
