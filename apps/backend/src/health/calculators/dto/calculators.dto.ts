import { createZodDto } from 'nestjs-zod';
import {
  BmiInputSchema,
  BodyFatNavyInputSchema,
  LeanBodyMassInputSchema,
  WaistToHipInputSchema,
  FfmiInputSchema,
  BmrInputSchema,
  TdeeInputSchema,
  CalorieGoalInputSchema,
  OneRmInputSchema,
  WilksInputSchema,
  DotsInputSchema,
  VolumeLoadInputSchema,
  InolInputSchema,
  MaxHeartRateInputSchema,
  HeartRateZonesInputSchema,
  Vo2MaxInputSchema,
  PaceInputSchema,
  MetInputSchema,
  MacroInputSchema,
  ProteinInputSchema,
  WaterIntakeInputSchema,
  WeightGoalTimelineInputSchema,
} from '@varaperformance/core';

// Body Composition
export class BmiDto extends createZodDto(BmiInputSchema) {}
export class BodyFatNavyDto extends createZodDto(BodyFatNavyInputSchema) {}
export class LeanBodyMassDto extends createZodDto(LeanBodyMassInputSchema) {}
export class WaistToHipDto extends createZodDto(WaistToHipInputSchema) {}
export class FfmiDto extends createZodDto(FfmiInputSchema) {}

// Caloric Needs
export class BmrDto extends createZodDto(BmrInputSchema) {}
export class TdeeDto extends createZodDto(TdeeInputSchema) {}
export class CalorieGoalDto extends createZodDto(CalorieGoalInputSchema) {}

// Strength & Performance
export class OneRmDto extends createZodDto(OneRmInputSchema) {}
export class WilksDto extends createZodDto(WilksInputSchema) {}
export class DotsDto extends createZodDto(DotsInputSchema) {}
export class VolumeLoadDto extends createZodDto(VolumeLoadInputSchema) {}
export class InolDto extends createZodDto(InolInputSchema) {}

// Cardiovascular
export class MaxHeartRateDto extends createZodDto(MaxHeartRateInputSchema) {}
export class HeartRateZonesDto extends createZodDto(
  HeartRateZonesInputSchema,
) {}
export class Vo2MaxDto extends createZodDto(Vo2MaxInputSchema) {}
export class PaceDto extends createZodDto(PaceInputSchema) {}
export class MetDto extends createZodDto(MetInputSchema) {}

// Macros & Nutrition
export class MacroDto extends createZodDto(MacroInputSchema) {}
export class ProteinDto extends createZodDto(ProteinInputSchema) {}
export class WaterIntakeDto extends createZodDto(WaterIntakeInputSchema) {}

// Progress & Goals
export class WeightGoalTimelineDto extends createZodDto(
  WeightGoalTimelineInputSchema,
) {}
