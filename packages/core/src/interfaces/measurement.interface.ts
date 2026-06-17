import type { MeasurementUnit } from '../schemas/measurement.schema';

/**
 * Single body measurement response (decrypted)
 */
export interface BodyMeasurementResponse {
  id: string;
  unit: MeasurementUnit;
  neck: number | null;
  shoulders: number | null;
  chest: number | null;
  leftBicep: number | null;
  rightBicep: number | null;
  waist: number | null;
  hips: number | null;
  leftThigh: number | null;
  rightThigh: number | null;
  leftCalf: number | null;
  rightCalf: number | null;
  note: string | null;
  loggedAt: string;
  createdAt: string;
}

/**
 * Body measurements list response
 */
export interface BodyMeasurementsListData {
  items: BodyMeasurementResponse[];
  stats?: {
    waistChange: number | null;
    chestChange: number | null;
    hipsChange: number | null;
  };
}
