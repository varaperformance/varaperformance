export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'legs'
  | 'glutes';

export interface DailyActivity {
  date: string;
  workouts: number;
  calories: number;
}

export interface MuscleData {
  muscle: MuscleGroup;
  fullName: string;
  value: number;
  colorIndex: number;
}

export type DateRangePreset =
  | 'today'
  | '7d'
  | '30d'
  | '60d'
  | '90d'
  | '1y'
  | 'custom';

export interface DateRange {
  startDate: string;
  endDate: string;
  label: string;
}

export interface ChartColors {
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  border: string;
  muted: string;
  mutedForeground: string;
  background: string;
}
