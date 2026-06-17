import type { VolumeUnit } from '../schemas/water.schema';

/**
 * Water log response
 */
export interface WaterLogResponse {
  id: string;
  amount: number;
  unit: VolumeUnit;
  loggedAt: string;
}

/**
 * Water goal response
 */
export interface WaterGoalResponse {
  id: string;
  targetAmount: number;
  targetUnit: VolumeUnit;
}

/**
 * Daily water summary
 */
export interface DailyWaterSummary {
  date: string;
  logs: WaterLogResponse[];
  totalOz: number; // Normalized to oz for easy comparison
  goal: WaterGoalResponse | null;
  progress: number; // Percentage 0-100+
}
