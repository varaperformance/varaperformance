import { z } from 'zod';

// ==================== ENUMS ====================

export const GenderSchema = z.enum(['male', 'female']);
export const ActivityLevelSchema = z.enum([
  'sedentary', // Little or no exercise
  'light', // Light exercise 1-3 days/week
  'moderate', // Moderate exercise 3-5 days/week
  'active', // Hard exercise 6-7 days/week
  'very_active', // Very hard exercise, physical job
]);
export const GoalSchema = z.enum(['lose', 'maintain', 'gain']);
export const FormulaSchema = z.enum(['mifflin', 'harris', 'katch']);
export const OneRmFormulaSchema = z.enum([
  'epley',
  'brzycki',
  'lombardi',
  'mayhew',
  'oconner',
  'wathan',
]);

// ==================== UNIT CONVERSION CONSTANTS ====================
// 1 lb = 0.453592 kg, 1 inch = 2.54 cm, 1 mile = 1.60934 km

// ==================== BODY COMPOSITION ====================

export const BmiInputSchema = z
  .object({
    // Metric
    weightKg: z.number().positive().optional(),
    heightCm: z.number().positive().optional(),
    // Imperial
    weightLb: z.number().positive().optional(),
    heightIn: z.number().positive().optional(),
  })
  .refine((data) => data.weightKg || data.weightLb, {
    message: 'Either weightKg or weightLb is required',
  })
  .refine((data) => data.heightCm || data.heightIn, {
    message: 'Either heightCm or heightIn is required',
  });

export const BodyFatNavyInputSchema = z
  .object({
    gender: GenderSchema,
    // Optional bodyweight for accurate lean/fat mass outputs
    weightKg: z.number().positive().optional(),
    weightLb: z.number().positive().optional(),
    // Metric
    heightCm: z.number().positive().optional(),
    waistCm: z.number().positive().optional(),
    neckCm: z.number().positive().optional(),
    hipCm: z.number().positive().optional(), // Required for female
    // Imperial
    heightIn: z.number().positive().optional(),
    waistIn: z.number().positive().optional(),
    neckIn: z.number().positive().optional(),
    hipIn: z.number().positive().optional(),
  })
  .refine((data) => data.heightCm || data.heightIn, {
    message: 'Either heightCm or heightIn is required',
  })
  .refine((data) => data.waistCm || data.waistIn, {
    message: 'Either waistCm or waistIn is required',
  })
  .refine((data) => data.neckCm || data.neckIn, {
    message: 'Either neckCm or neckIn is required',
  })
  .refine((data) => data.gender === 'male' || data.hipCm || data.hipIn, {
    message: 'Hip measurement is required for females',
  });

export const LeanBodyMassInputSchema = z
  .object({
    // Metric
    weightKg: z.number().positive().optional(),
    // Imperial
    weightLb: z.number().positive().optional(),
    bodyFatPercent: z.number().min(0).max(100),
  })
  .refine((data) => data.weightKg || data.weightLb, {
    message: 'Either weightKg or weightLb is required',
  });

export const WaistToHipInputSchema = z
  .object({
    // Metric
    waistCm: z.number().positive().optional(),
    hipCm: z.number().positive().optional(),
    // Imperial
    waistIn: z.number().positive().optional(),
    hipIn: z.number().positive().optional(),
  })
  .refine((data) => data.waistCm || data.waistIn, {
    message: 'Either waistCm or waistIn is required',
  })
  .refine((data) => data.hipCm || data.hipIn, {
    message: 'Either hipCm or hipIn is required',
  });

export const FfmiInputSchema = z
  .object({
    // Metric
    weightKg: z.number().positive().optional(),
    heightCm: z.number().positive().optional(),
    // Imperial
    weightLb: z.number().positive().optional(),
    heightIn: z.number().positive().optional(),
    bodyFatPercent: z.number().min(0).max(100),
  })
  .refine((data) => data.weightKg || data.weightLb, {
    message: 'Either weightKg or weightLb is required',
  })
  .refine((data) => data.heightCm || data.heightIn, {
    message: 'Either heightCm or heightIn is required',
  });

// ==================== CALORIC NEEDS ====================

export const BmrInputSchema = z
  .object({
    gender: GenderSchema,
    // Metric
    weightKg: z.number().positive().optional(),
    heightCm: z.number().positive().optional(),
    // Imperial
    weightLb: z.number().positive().optional(),
    heightIn: z.number().positive().optional(),
    ageYears: z.number().int().positive(),
    formula: FormulaSchema.default('mifflin'),
    bodyFatPercent: z.number().min(0).max(100).optional(), // For Katch-McArdle
  })
  .refine((data) => data.weightKg || data.weightLb, {
    message: 'Either weightKg or weightLb is required',
  })
  .refine((data) => data.heightCm || data.heightIn, {
    message: 'Either heightCm or heightIn is required',
  });

export const TdeeInputSchema = z
  .object({
    gender: GenderSchema,
    weightKg: z.number().positive().optional(),
    heightCm: z.number().positive().optional(),
    weightLb: z.number().positive().optional(),
    heightIn: z.number().positive().optional(),
    ageYears: z.number().int().positive(),
    formula: FormulaSchema.default('mifflin'),
    bodyFatPercent: z.number().min(0).max(100).optional(),
    activityLevel: ActivityLevelSchema,
  })
  .refine((data) => data.weightKg || data.weightLb, {
    message: 'Either weightKg or weightLb is required',
  })
  .refine((data) => data.heightCm || data.heightIn, {
    message: 'Either heightCm or heightIn is required',
  });

export const CalorieGoalInputSchema = z
  .object({
    gender: GenderSchema,
    weightKg: z.number().positive().optional(),
    heightCm: z.number().positive().optional(),
    weightLb: z.number().positive().optional(),
    heightIn: z.number().positive().optional(),
    ageYears: z.number().int().positive(),
    formula: FormulaSchema.default('mifflin'),
    bodyFatPercent: z.number().min(0).max(100).optional(),
    activityLevel: ActivityLevelSchema,
    goal: GoalSchema,
    deficitSurplus: z.number().min(0).max(1500).default(500),
  })
  .refine((data) => data.weightKg || data.weightLb, {
    message: 'Either weightKg or weightLb is required',
  })
  .refine((data) => data.heightCm || data.heightIn, {
    message: 'Either heightCm or heightIn is required',
  });

// ==================== STRENGTH & PERFORMANCE ====================

export const OneRmInputSchema = z
  .object({
    // Metric
    weightKg: z.number().positive().optional(),
    // Imperial
    weightLb: z.number().positive().optional(),
    reps: z.number().int().min(1).max(30),
    formula: OneRmFormulaSchema.default('epley'),
  })
  .refine((data) => data.weightKg || data.weightLb, {
    message: 'Either weightKg or weightLb is required',
  });

export const WilksInputSchema = z
  .object({
    gender: GenderSchema,
    // Metric
    bodyweightKg: z.number().positive().optional(),
    totalKg: z.number().positive().optional(),
    // Imperial
    bodyweightLb: z.number().positive().optional(),
    totalLb: z.number().positive().optional(),
  })
  .refine((data) => data.bodyweightKg || data.bodyweightLb, {
    message: 'Either bodyweightKg or bodyweightLb is required',
  })
  .refine((data) => data.totalKg || data.totalLb, {
    message: 'Either totalKg or totalLb is required',
  });

export const DotsInputSchema = z
  .object({
    gender: GenderSchema,
    // Metric
    bodyweightKg: z.number().positive().optional(),
    totalKg: z.number().positive().optional(),
    // Imperial
    bodyweightLb: z.number().positive().optional(),
    totalLb: z.number().positive().optional(),
  })
  .refine((data) => data.bodyweightKg || data.bodyweightLb, {
    message: 'Either bodyweightKg or bodyweightLb is required',
  })
  .refine((data) => data.totalKg || data.totalLb, {
    message: 'Either totalKg or totalLb is required',
  });

export const VolumeLoadInputSchema = z
  .object({
    sets: z.number().int().positive(),
    reps: z.number().int().positive(),
    // Metric
    weightKg: z.number().positive().optional(),
    // Imperial
    weightLb: z.number().positive().optional(),
  })
  .refine((data) => data.weightKg || data.weightLb, {
    message: 'Either weightKg or weightLb is required',
  });

export const InolInputSchema = z.object({
  reps: z.number().int().positive(),
  percentOf1Rm: z
    .number()
    .min(0)
    .lt(100, { message: 'percentOf1Rm must be less than 100' }),
});

// ==================== CARDIOVASCULAR ====================

export const MaxHeartRateInputSchema = z.object({
  ageYears: z.number().int().positive(),
  formula: z.enum(['standard', 'tanaka', 'gulati']).default('tanaka'),
  gender: GenderSchema.optional(), // For Gulati (female-specific)
});

export const HeartRateZonesInputSchema = z.object({
  maxHeartRate: z.number().positive().optional(),
  ageYears: z.number().int().positive().optional(),
  restingHeartRate: z.number().positive().optional(), // For Karvonen
});

export const Vo2MaxInputSchema = z.object({
  gender: GenderSchema,
  ageYears: z.number().int().positive(),
  restingHeartRate: z.number().positive(),
});

export const PaceInputSchema = z
  .object({
    // Metric
    distanceKm: z.number().positive().optional(),
    // Imperial
    distanceMiles: z.number().positive().optional(),
    timeMinutes: z.number().positive(),
  })
  .refine((data) => data.distanceKm || data.distanceMiles, {
    message: 'Either distanceKm or distanceMiles is required',
  });

export const MetInputSchema = z
  .object({
    activityMet: z.number().positive(),
    // Metric
    weightKg: z.number().positive().optional(),
    // Imperial
    weightLb: z.number().positive().optional(),
    durationMinutes: z.number().positive(),
  })
  .refine((data) => data.weightKg || data.weightLb, {
    message: 'Either weightKg or weightLb is required',
  });

// ==================== MACROS & NUTRITION ====================

export const MacroInputSchema = z
  .object({
    tdee: z.number().positive(),
    goal: GoalSchema,
    gender: GenderSchema.optional(),
    weeklyChangeLb: z.number().min(0.1).max(3).optional(),
    calorieAdjustment: z.number().min(-1500).max(1500).optional(),
    // Metric
    weightKg: z.number().positive().optional(),
    // Imperial
    weightLb: z.number().positive().optional(),
    proteinPerKg: z.number().min(0.8).max(3.0).default(1.6),
    fatPercent: z.number().min(15).max(40).default(25),
  })
  .refine((data) => data.weightKg || data.weightLb, {
    message: 'Either weightKg or weightLb is required',
  });

export const ProteinInputSchema = z
  .object({
    // Metric
    weightKg: z.number().positive().optional(),
    // Imperial
    weightLb: z.number().positive().optional(),
    goal: GoalSchema,
    activityLevel: ActivityLevelSchema,
  })
  .refine((data) => data.weightKg || data.weightLb, {
    message: 'Either weightKg or weightLb is required',
  });

export const WaterIntakeInputSchema = z
  .object({
    // Metric
    weightKg: z.number().positive().optional(),
    // Imperial
    weightLb: z.number().positive().optional(),
    activityLevel: ActivityLevelSchema,
    climate: z.enum(['temperate', 'hot', 'cold']).default('temperate'),
  })
  .refine((data) => data.weightKg || data.weightLb, {
    message: 'Either weightKg or weightLb is required',
  });

// ==================== PROGRESS & GOALS ====================

export const WeightGoalTimelineInputSchema = z
  .object({
    // Metric
    currentWeightKg: z.number().positive().optional(),
    targetWeightKg: z.number().positive().optional(),
    weeklyChangeKg: z.number().min(0.1).max(1.0).optional(),
    // Imperial
    currentWeightLb: z.number().positive().optional(),
    targetWeightLb: z.number().positive().optional(),
    weeklyChangeLb: z.number().min(0.2).max(2.2).optional(), // ~0.1-1.0 kg
  })
  .refine((data) => data.currentWeightKg || data.currentWeightLb, {
    message: 'Either currentWeightKg or currentWeightLb is required',
  })
  .refine((data) => data.targetWeightKg || data.targetWeightLb, {
    message: 'Either targetWeightKg or targetWeightLb is required',
  });

// ==================== INFERRED TYPES ====================

export type Gender = z.infer<typeof GenderSchema>;
export type ActivityLevel = z.infer<typeof ActivityLevelSchema>;
export type Goal = z.infer<typeof GoalSchema>;
export type Formula = z.infer<typeof FormulaSchema>;
export type OneRmFormula = z.infer<typeof OneRmFormulaSchema>;

export type BmiInput = z.infer<typeof BmiInputSchema>;
export type BodyFatNavyInput = z.infer<typeof BodyFatNavyInputSchema>;
export type LeanBodyMassInput = z.infer<typeof LeanBodyMassInputSchema>;
export type WaistToHipInput = z.infer<typeof WaistToHipInputSchema>;
export type FfmiInput = z.infer<typeof FfmiInputSchema>;
export type BmrInput = z.infer<typeof BmrInputSchema>;
export type TdeeInput = z.infer<typeof TdeeInputSchema>;
export type CalorieGoalInput = z.infer<typeof CalorieGoalInputSchema>;
export type OneRmInput = z.infer<typeof OneRmInputSchema>;
export type WilksInput = z.infer<typeof WilksInputSchema>;
export type DotsInput = z.infer<typeof DotsInputSchema>;
export type VolumeLoadInput = z.infer<typeof VolumeLoadInputSchema>;
export type InolInput = z.infer<typeof InolInputSchema>;
export type MaxHeartRateInput = z.infer<typeof MaxHeartRateInputSchema>;
export type HeartRateZonesInput = z.infer<typeof HeartRateZonesInputSchema>;
export type Vo2MaxInput = z.infer<typeof Vo2MaxInputSchema>;
export type PaceInput = z.infer<typeof PaceInputSchema>;
export type MetInput = z.infer<typeof MetInputSchema>;
export type MacroInput = z.infer<typeof MacroInputSchema>;
export type ProteinInput = z.infer<typeof ProteinInputSchema>;
export type WaterIntakeInput = z.infer<typeof WaterIntakeInputSchema>;
export type WeightGoalTimelineInput = z.infer<
  typeof WeightGoalTimelineInputSchema
>;
