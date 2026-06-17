import type { WeightUnit, WeightGoalType } from '../schemas/weight.schema';

/**
 * Weight log response (decrypted)
 */
export interface WeightLogResponse {
  id: string;
  value: number;
  unit: WeightUnit;
  bodyFat: number | null;
  muscleMass: number | null;
  note: string | null;
  source: string;
  loggedAt: string;
  createdAt: string;
}

/**
 * Weight goal response (decrypted)
 */
export interface WeightGoalResponse {
  id: string;
  targetWeight: number;
  targetUnit: WeightUnit;
  goalType: WeightGoalType;
  weeklyRate: number;
}

/**
 * Weight logs list response
 */
export interface WeightLogsListData {
  items: WeightLogResponse[];
  goal: WeightGoalResponse | null;
  stats?: {
    min: number;
    max: number;
    avg: number;
    change: number; // Change from first to last in range
    avgBodyFat?: number;
    bodyFatChange?: number;
  };
}
