// ==================== BODY COMPOSITION ====================

export interface BmiResult {
  bmi: number;
  category: 'underweight' | 'normal' | 'overweight' | 'obese';
  healthyWeightRange: { min: number; max: number };
}

export interface BodyFatResult {
  bodyFatPercent: number;
  category: string;
  leanMassKg: number;
  fatMassKg: number;
}

export interface LeanBodyMassResult {
  leanMassKg: number;
  fatMassKg: number;
}

export interface WaistToHipResult {
  ratio: number;
  risk: 'low' | 'moderate' | 'high';
}

export interface FfmiResult {
  ffmi: number;
  adjustedFfmi: number;
  category: string;
}

// ==================== CALORIC NEEDS ====================

export interface BmrResult {
  bmr: number;
  formula: string;
}

export interface TdeeResult {
  bmr: number;
  tdee: number;
  activityMultiplier: number;
}

export interface CalorieGoalResult {
  tdee: number;
  targetCalories: number;
  deficit: number;
  surplus: number;
  weeklyChangeKg: number;
}

// ==================== STRENGTH & PERFORMANCE ====================

export interface OneRmResult {
  oneRm: number;
  percentages: Record<number, number>; // e.g., { 90: 180, 80: 160 }
}

export interface WilksResult {
  coefficient: number;
  wilksScore: number;
}

export interface DotsResult {
  coefficient: number;
  dotsScore: number;
}

export interface VolumeLoadResult {
  volumeLoad: number;
  tonnage: number;
}

export interface InolResult {
  inol: number;
  recommendation: string;
}

// ==================== CARDIOVASCULAR ====================

export interface MaxHeartRateResult {
  maxHr: number;
  formula: string;
}

export interface HeartRateZone {
  name: string;
  minBpm: number;
  maxBpm: number;
  percentRange: string;
}

export interface HeartRateZonesResult {
  maxHr: number;
  zones: HeartRateZone[];
}

export interface Vo2MaxResult {
  vo2Max: number;
  fitnessLevel: string;
}

export interface PaceResult {
  pacePerKm: string; // mm:ss
  pacePerMile: string;
  speed: number; // km/h
}

export interface MetResult {
  caloriesBurned: number;
  met: number;
}

// ==================== MACROS & NUTRITION ====================

export interface MacroResult {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  proteinCalories: number;
  carbsCalories: number;
  fatCalories: number;
  requestedCalories: number;
  requestedCalorieAdjustment: number;
  appliedCalorieAdjustment: number;
  requestedWeeklyChangeLb: number | null;
  appliedWeeklyChangeLb: number | null;
  calorieFloor: number;
  guardrails: string[];
}

export interface ProteinResult {
  dailyProteinGrams: number;
  gramsPerKg: number;
  recommendation: string;
}

export interface WaterIntakeResult {
  dailyLiters: number;
  dailyOunces: number;
}

// ==================== PROGRESS & GOALS ====================

export interface WeightGoalTimelineResult {
  weeksToGoal: number;
  targetDate: string;
  weeklyChangeKg: number;
  totalChangeKg: number;
}

// ==================== STRENGTH STANDARDS ====================

export type StrengthLevel =
  | 'beginner'
  | 'novice'
  | 'intermediate'
  | 'advanced'
  | 'elite';

export interface StrengthStandard {
  level: StrengthLevel;
  multiplier: number; // Multiplier of bodyweight
  weight: number; // Actual weight for this level
}

export interface StrengthStandardsResult {
  exercise: string;
  bodyweightKg: number;
  currentLevel: StrengthLevel;
  standards: StrengthStandard[];
}
