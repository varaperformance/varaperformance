import { Injectable } from '@nestjs/common';
import type {
  BmiInput,
  BodyFatNavyInput,
  LeanBodyMassInput,
  WaistToHipInput,
  FfmiInput,
  BmrInput,
  TdeeInput,
  CalorieGoalInput,
  OneRmInput,
  WilksInput,
  DotsInput,
  VolumeLoadInput,
  InolInput,
  MaxHeartRateInput,
  HeartRateZonesInput,
  Vo2MaxInput,
  PaceInput,
  MetInput,
  MacroInput,
  ProteinInput,
  WaterIntakeInput,
  WeightGoalTimelineInput,
  Gender,
  ActivityLevel,
  BmiResult,
  BodyFatResult,
  LeanBodyMassResult,
  WaistToHipResult,
  FfmiResult,
  BmrResult,
  TdeeResult,
  CalorieGoalResult,
  OneRmResult,
  WilksResult,
  DotsResult,
  VolumeLoadResult,
  InolResult,
  MaxHeartRateResult,
  HeartRateZonesResult,
  Vo2MaxResult,
  PaceResult,
  MetResult,
  MacroResult,
  ProteinResult,
  WaterIntakeResult,
  WeightGoalTimelineResult,
  SuccessResponse,
} from '@varaperformance/core';

@Injectable()
export class CalculatorsService {
  // ==================== UNIT CONVERSION HELPERS ====================
  private readonly LB_TO_KG = 0.453592;
  private readonly IN_TO_CM = 2.54;
  private readonly MILE_TO_KM = 1.60934;

  private lbToKg(lb: number): number {
    return lb * this.LB_TO_KG;
  }

  private inToCm(inches: number): number {
    return inches * this.IN_TO_CM;
  }

  private milesToKm(miles: number): number {
    return miles * this.MILE_TO_KM;
  }

  private getWeightKg(kg?: number, lb?: number): number {
    return kg ?? this.lbToKg(lb!);
  }

  private getHeightCm(cm?: number, inches?: number): number {
    return cm ?? this.inToCm(inches!);
  }

  private getDistanceKm(km?: number, miles?: number): number {
    return km ?? this.milesToKm(miles!);
  }

  private getMeasurementCm(cm?: number, inches?: number): number {
    return cm ?? this.inToCm(inches!);
  }

  // ==================== BODY COMPOSITION ====================

  calculateBmi(input: BmiInput): SuccessResponse<BmiResult> {
    const weightKg = this.getWeightKg(input.weightKg, input.weightLb);
    const heightCm = this.getHeightCm(input.heightCm, input.heightIn);
    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);

    let category: BmiResult['category'];
    if (bmi < 18.5) category = 'underweight';
    else if (bmi < 25) category = 'normal';
    else if (bmi < 30) category = 'overweight';
    else category = 'obese';

    const healthyWeightRange = {
      min: Math.round(18.5 * heightM * heightM * 10) / 10,
      max: Math.round(24.9 * heightM * heightM * 10) / 10,
    };

    return {
      success: true,
      data: {
        bmi: Math.round(bmi * 10) / 10,
        category,
        healthyWeightRange,
      },
    };
  }

  calculateBodyFatNavy(
    input: BodyFatNavyInput,
  ): SuccessResponse<BodyFatResult> {
    const { gender } = input;
    const heightCm = this.getHeightCm(input.heightCm, input.heightIn);
    const waistCm = this.getMeasurementCm(input.waistCm, input.waistIn);
    const neckCm = this.getMeasurementCm(input.neckCm, input.neckIn);
    const hipCm =
      input.hipCm ?? (input.hipIn ? this.inToCm(input.hipIn) : undefined);

    let bodyFatPercent: number;

    if (gender === 'male') {
      // US Navy formula for men
      bodyFatPercent =
        495 /
          (1.0324 -
            0.19077 * Math.log10(waistCm - neckCm) +
            0.15456 * Math.log10(heightCm)) -
        450;
    } else {
      // US Navy formula for women (requires hip measurement)
      if (!hipCm) {
        throw new Error('Hip measurement is required for female body fat');
      }
      const hip = hipCm;
      bodyFatPercent =
        495 /
          (1.29579 -
            0.35004 * Math.log10(waistCm + hip - neckCm) +
            0.221 * Math.log10(heightCm)) -
        450;
    }

    bodyFatPercent = Math.max(0, Math.min(100, bodyFatPercent));
    const category = this.getBodyFatCategory(gender, bodyFatPercent);

    // Use provided bodyweight when available for accurate mass outputs.
    const bodyWeightKg =
      input.weightKg ??
      (input.weightLb ? this.lbToKg(input.weightLb) : (heightCm - 100) * 0.9);
    const fatMassKg = (bodyFatPercent / 100) * bodyWeightKg;
    const leanMassKg = bodyWeightKg - fatMassKg;

    return {
      success: true,
      data: {
        bodyFatPercent: Math.round(bodyFatPercent * 10) / 10,
        category,
        leanMassKg: Math.round(leanMassKg * 10) / 10,
        fatMassKg: Math.round(fatMassKg * 10) / 10,
      },
    };
  }

  calculateLeanBodyMass(
    input: LeanBodyMassInput,
  ): SuccessResponse<LeanBodyMassResult> {
    const weightKg = this.getWeightKg(input.weightKg, input.weightLb);
    const { bodyFatPercent } = input;
    const fatMassKg = (bodyFatPercent / 100) * weightKg;
    const leanMassKg = weightKg - fatMassKg;

    return {
      success: true,
      data: {
        leanMassKg: Math.round(leanMassKg * 10) / 10,
        fatMassKg: Math.round(fatMassKg * 10) / 10,
      },
    };
  }

  calculateWaistToHip(
    input: WaistToHipInput,
  ): SuccessResponse<WaistToHipResult> {
    const waistCm = this.getMeasurementCm(input.waistCm, input.waistIn);
    const hipCm = this.getMeasurementCm(input.hipCm, input.hipIn);
    const ratio = waistCm / hipCm;

    // Risk categories (general guidelines)
    let risk: WaistToHipResult['risk'];
    if (ratio < 0.85) risk = 'low';
    else if (ratio < 0.95) risk = 'moderate';
    else risk = 'high';

    return {
      success: true,
      data: {
        ratio: Math.round(ratio * 100) / 100,
        risk,
      },
    };
  }

  calculateFfmi(input: FfmiInput): SuccessResponse<FfmiResult> {
    const weightKg = this.getWeightKg(input.weightKg, input.weightLb);
    const heightCm = this.getHeightCm(input.heightCm, input.heightIn);
    const { bodyFatPercent } = input;
    const heightM = heightCm / 100;
    const leanMassKg = weightKg * (1 - bodyFatPercent / 100);

    const ffmi = leanMassKg / (heightM * heightM);
    // Normalized to 1.8m height
    const adjustedFfmi = ffmi + 6.1 * (1.8 - heightM);

    let category: string;
    if (adjustedFfmi < 18) category = 'Below average';
    else if (adjustedFfmi < 20) category = 'Average';
    else if (adjustedFfmi < 22) category = 'Above average';
    else if (adjustedFfmi < 23) category = 'Excellent';
    else if (adjustedFfmi < 26) category = 'Superior';
    else category = 'Suspicious (potential PED use)';

    return {
      success: true,
      data: {
        ffmi: Math.round(ffmi * 10) / 10,
        adjustedFfmi: Math.round(adjustedFfmi * 10) / 10,
        category,
      },
    };
  }

  // ==================== CALORIC NEEDS ====================

  calculateBmr(input: BmrInput): SuccessResponse<BmrResult> {
    const { gender, ageYears, formula, bodyFatPercent } = input;
    const weightKg = this.getWeightKg(input.weightKg, input.weightLb);
    const heightCm = this.getHeightCm(input.heightCm, input.heightIn);

    let bmr: number;
    let formulaUsed: string;

    switch (formula) {
      case 'harris':
        // Harris-Benedict (revised)
        if (gender === 'male') {
          bmr =
            88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * ageYears;
        } else {
          bmr = 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * ageYears;
        }
        formulaUsed = 'Harris-Benedict (Revised)';
        break;

      case 'katch':
        // Katch-McArdle (requires body fat)
        if (bodyFatPercent !== undefined) {
          const leanMass = weightKg * (1 - bodyFatPercent / 100);
          bmr = 370 + 21.6 * leanMass;
          formulaUsed = 'Katch-McArdle';
        } else {
          // Fall back to Mifflin if no body fat provided
          if (gender === 'male') {
            bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;
          } else {
            bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161;
          }
          formulaUsed = 'Mifflin-St Jeor (fallback)';
        }
        break;

      case 'mifflin':
      default:
        // Mifflin-St Jeor
        if (gender === 'male') {
          bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;
        } else {
          bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161;
        }
        formulaUsed = 'Mifflin-St Jeor';
    }

    return {
      success: true,
      data: {
        bmr: Math.round(bmr),
        formula: formulaUsed,
      },
    };
  }

  calculateTdee(input: TdeeInput): SuccessResponse<TdeeResult> {
    const { activityLevel } = input;
    const bmrResult = this.calculateBmr(input);
    const bmr = bmrResult.data.bmr;

    const multipliers: Record<ActivityLevel, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };

    const multiplier = multipliers[activityLevel];
    const tdee = bmr * multiplier;

    return {
      success: true,
      data: {
        bmr,
        tdee: Math.round(tdee),
        activityMultiplier: multiplier,
      },
    };
  }

  calculateCalorieGoal(
    input: CalorieGoalInput,
  ): SuccessResponse<CalorieGoalResult> {
    const { goal, deficitSurplus, ...tdeeInput } = input;
    const tdeeResult = this.calculateTdee(tdeeInput);
    const tdee = tdeeResult.data.tdee;

    let targetCalories: number;
    let deficit = 0;
    let surplus = 0;

    switch (goal) {
      case 'lose':
        targetCalories = tdee - deficitSurplus;
        deficit = deficitSurplus;
        break;
      case 'gain':
        targetCalories = tdee + deficitSurplus;
        surplus = deficitSurplus;
        break;
      case 'maintain':
      default:
        targetCalories = tdee;
    }

    // 7700 kcal ≈ 1 kg of body weight
    const weeklyChangeKg = ((deficit || surplus) * 7) / 7700;

    return {
      success: true,
      data: {
        tdee,
        targetCalories: Math.round(targetCalories),
        deficit,
        surplus,
        weeklyChangeKg: Math.round(weeklyChangeKg * 100) / 100,
      },
    };
  }

  // ==================== STRENGTH & PERFORMANCE ====================

  calculateOneRm(input: OneRmInput): SuccessResponse<OneRmResult> {
    const weightLifted = this.getWeightKg(input.weightKg, input.weightLb);
    const { reps, formula } = input;

    let oneRm: number;

    switch (formula) {
      case 'brzycki':
        oneRm = weightLifted * (36 / (37 - reps));
        break;
      case 'lombardi':
        oneRm = weightLifted * Math.pow(reps, 0.1);
        break;
      case 'mayhew':
        oneRm = (100 * weightLifted) / (52.2 + 41.9 * Math.exp(-0.055 * reps));
        break;
      case 'oconner':
        oneRm = weightLifted * (1 + 0.025 * reps);
        break;
      case 'wathan':
        oneRm = (100 * weightLifted) / (48.8 + 53.8 * Math.exp(-0.075 * reps));
        break;
      case 'epley':
      default:
        oneRm = weightLifted * (1 + reps / 30);
    }

    // Generate percentage table
    const percentages: Record<number, number> = {};
    for (const pct of [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50]) {
      percentages[pct] = Math.round((oneRm * pct) / 100);
    }

    return {
      success: true,
      data: {
        oneRm: Math.round(oneRm * 10) / 10,
        percentages,
      },
    };
  }

  calculateWilks(input: WilksInput): SuccessResponse<WilksResult> {
    const { gender } = input;
    const bodyweightKg = this.getWeightKg(
      input.bodyweightKg,
      input.bodyweightLb,
    );
    const totalKg = this.getWeightKg(input.totalKg, input.totalLb);

    // Wilks coefficients
    const maleCoeffs = {
      a: -216.0475144,
      b: 16.2606339,
      c: -0.002388645,
      d: -0.00113732,
      e: 7.01863e-6,
      f: -1.291e-8,
    };
    const femaleCoeffs = {
      a: 594.31747775582,
      b: -27.23842536447,
      c: 0.82112226871,
      d: -0.00930733913,
      e: 4.731582e-5,
      f: -9.054e-8,
    };

    const c = gender === 'male' ? maleCoeffs : femaleCoeffs;
    const x = bodyweightKg;

    const denominator =
      c.a +
      c.b * x +
      c.c * Math.pow(x, 2) +
      c.d * Math.pow(x, 3) +
      c.e * Math.pow(x, 4) +
      c.f * Math.pow(x, 5);

    const coefficient = 500 / denominator;
    const wilksScore = totalKg * coefficient;

    return {
      success: true,
      data: {
        coefficient: Math.round(coefficient * 10000) / 10000,
        wilksScore: Math.round(wilksScore * 100) / 100,
      },
    };
  }

  calculateDots(input: DotsInput): SuccessResponse<DotsResult> {
    const { gender } = input;
    const bodyweightKg = this.getWeightKg(
      input.bodyweightKg,
      input.bodyweightLb,
    );
    const totalKg = this.getWeightKg(input.totalKg, input.totalLb);

    // DOTS coefficients (updated version of Wilks)
    const maleCoeffs = {
      a: -307.75076,
      b: 24.0900756,
      c: -0.1918759221,
      d: 0.0007391293,
      e: -0.000001093,
    };
    const femaleCoeffs = {
      a: -57.96288,
      b: 13.6175032,
      c: -0.1126655495,
      d: 0.0005158568,
      e: -0.0000010706,
    };

    const c = gender === 'male' ? maleCoeffs : femaleCoeffs;
    const x = bodyweightKg;

    const denominator =
      c.a +
      c.b * x +
      c.c * Math.pow(x, 2) +
      c.d * Math.pow(x, 3) +
      c.e * Math.pow(x, 4);

    const coefficient = 500 / denominator;
    const dotsScore = totalKg * coefficient;

    return {
      success: true,
      data: {
        coefficient: Math.round(coefficient * 10000) / 10000,
        dotsScore: Math.round(dotsScore * 100) / 100,
      },
    };
  }

  calculateVolumeLoad(
    input: VolumeLoadInput,
  ): SuccessResponse<VolumeLoadResult> {
    const { sets, reps } = input;
    const weightKg = this.getWeightKg(input.weightKg, input.weightLb);
    const volumeLoad = sets * reps * weightKg;
    const tonnage = volumeLoad / 1000; // Convert to metric tons

    return {
      success: true,
      data: {
        volumeLoad: Math.round(volumeLoad),
        tonnage: Math.round(tonnage * 100) / 100,
      },
    };
  }

  calculateInol(input: InolInput): SuccessResponse<InolResult> {
    const { reps, percentOf1Rm } = input;
    if (percentOf1Rm >= 100) {
      throw new Error('percentOf1Rm must be less than 100');
    }
    // INOL = reps / (100 - percent)
    const inol = reps / (100 - percentOf1Rm);

    let recommendation: string;
    if (inol < 0.4) recommendation = 'Too easy - increase intensity or volume';
    else if (inol < 1.0) recommendation = 'Good for maintenance/technique work';
    else if (inol < 2.0) recommendation = 'Optimal for strength gains';
    else recommendation = 'High stress - ensure adequate recovery';

    return {
      success: true,
      data: {
        inol: Math.round(inol * 100) / 100,
        recommendation,
      },
    };
  }

  // ==================== CARDIOVASCULAR ====================

  calculateMaxHeartRate(
    input: MaxHeartRateInput,
  ): SuccessResponse<MaxHeartRateResult> {
    const { ageYears, formula } = input;

    let maxHr: number;
    let formulaUsed: string;

    switch (formula) {
      case 'standard':
        maxHr = 220 - ageYears;
        formulaUsed = '220 - age';
        break;
      case 'gulati':
        // Gulati formula (for women)
        maxHr = 206 - 0.88 * ageYears;
        formulaUsed = 'Gulati (women)';
        break;
      case 'tanaka':
      default:
        // Tanaka formula (more accurate)
        maxHr = 208 - 0.7 * ageYears;
        formulaUsed = 'Tanaka';
    }

    return {
      success: true,
      data: {
        maxHr: Math.round(maxHr),
        formula: formulaUsed,
      },
    };
  }

  calculateHeartRateZones(
    input: HeartRateZonesInput,
  ): SuccessResponse<HeartRateZonesResult> {
    let maxHr: number;

    if (input.maxHeartRate) {
      maxHr = input.maxHeartRate;
    } else if (input.ageYears) {
      maxHr = 208 - 0.7 * input.ageYears; // Tanaka formula
    } else {
      maxHr = 180; // Default fallback
    }

    const zones = [
      { name: 'Zone 1 (Recovery)', min: 50, max: 60 },
      { name: 'Zone 2 (Fat Burn)', min: 60, max: 70 },
      { name: 'Zone 3 (Aerobic)', min: 70, max: 80 },
      { name: 'Zone 4 (Anaerobic)', min: 80, max: 90 },
      { name: 'Zone 5 (Max Effort)', min: 90, max: 100 },
    ].map((zone) => ({
      name: zone.name,
      minBpm: Math.round(maxHr * (zone.min / 100)),
      maxBpm: Math.round(maxHr * (zone.max / 100)),
      percentRange: `${zone.min}-${zone.max}%`,
    }));

    return {
      success: true,
      data: {
        maxHr: Math.round(maxHr),
        zones,
      },
    };
  }

  calculateVo2Max(input: Vo2MaxInput): SuccessResponse<Vo2MaxResult> {
    const { gender, ageYears, restingHeartRate } = input;

    // Uth–Sørensen–Overgaard–Pedersen estimation
    const maxHr = 208 - 0.7 * ageYears;
    const vo2Max = 15.3 * (maxHr / restingHeartRate);

    const fitnessLevel = this.getVo2MaxCategory(gender, ageYears, vo2Max);

    return {
      success: true,
      data: {
        vo2Max: Math.round(vo2Max * 10) / 10,
        fitnessLevel,
      },
    };
  }

  calculatePace(input: PaceInput): SuccessResponse<PaceResult> {
    const distanceKm = this.getDistanceKm(
      input.distanceKm,
      input.distanceMiles,
    );
    const { timeMinutes } = input;

    const paceMinPerKm = timeMinutes / distanceKm;
    const paceMinPerMile = paceMinPerKm * 1.60934;
    const speedKmH = (distanceKm / timeMinutes) * 60;

    const formatPace = (minutes: number): string => {
      let mins = Math.floor(minutes);
      let secs = Math.round((minutes - mins) * 60);
      if (secs === 60) {
        mins += 1;
        secs = 0;
      }
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return {
      success: true,
      data: {
        pacePerKm: formatPace(paceMinPerKm),
        pacePerMile: formatPace(paceMinPerMile),
        speed: Math.round(speedKmH * 10) / 10,
      },
    };
  }

  calculateMet(input: MetInput): SuccessResponse<MetResult> {
    const { activityMet, durationMinutes } = input;
    const weightKg = this.getWeightKg(input.weightKg, input.weightLb);

    // Calories = MET × weight (kg) × duration (hours)
    const durationHours = durationMinutes / 60;
    const caloriesBurned = activityMet * weightKg * durationHours;

    return {
      success: true,
      data: {
        caloriesBurned: Math.round(caloriesBurned),
        met: activityMet,
      },
    };
  }

  // ==================== MACROS & NUTRITION ====================

  calculateMacros(input: MacroInput): SuccessResponse<MacroResult> {
    const {
      tdee,
      goal,
      proteinPerKg,
      fatPercent,
      calorieAdjustment,
      gender,
      weeklyChangeLb,
    } = input;
    const weightKg = this.getWeightKg(input.weightKg, input.weightLb);
    const weightLb = input.weightLb ?? weightKg / this.LB_TO_KG;
    const guardrails: string[] = [];

    let requestedWeeklyChangeLb: number | null =
      weeklyChangeLb !== undefined ? weeklyChangeLb : null;
    let appliedWeeklyChangeLb: number | null =
      weeklyChangeLb !== undefined ? weeklyChangeLb : null;

    // Default calorie adjustment based on goal, unless caller provides an explicit one.
    let defaultCalorieAdjustment = 0;
    switch (goal) {
      case 'lose':
        defaultCalorieAdjustment = -500;
        break;
      case 'gain':
        defaultCalorieAdjustment = 300;
        break;
      case 'maintain':
      default:
        defaultCalorieAdjustment = 0;
    }

    let requestedCalorieAdjustment =
      calorieAdjustment ?? defaultCalorieAdjustment;
    let appliedCalorieAdjustment = requestedCalorieAdjustment;

    if (weeklyChangeLb !== undefined) {
      if (goal === 'maintain') {
        requestedWeeklyChangeLb = 0;
        appliedWeeklyChangeLb = 0;
        requestedCalorieAdjustment = 0;
        appliedCalorieAdjustment = 0;
        guardrails.push('maintain_goal_forces_zero_adjustment');
      } else {
        const direction = goal === 'lose' ? -1 : 1;

        // Evidence-based bodyweight-relative weekly change caps.
        const maxWeeklyPercent = goal === 'lose' ? 0.01 : 0.005;
        const maxWeeklyChangeLb = weightLb * maxWeeklyPercent;

        if (appliedWeeklyChangeLb! > maxWeeklyChangeLb) {
          appliedWeeklyChangeLb = maxWeeklyChangeLb;
          guardrails.push(
            goal === 'lose'
              ? 'weekly_loss_rate_capped_to_1_percent_bodyweight'
              : 'weekly_gain_rate_capped_to_0_5_percent_bodyweight',
          );
        }

        requestedCalorieAdjustment =
          direction * (requestedWeeklyChangeLb ?? 0) * 500;
        appliedCalorieAdjustment =
          direction * (appliedWeeklyChangeLb ?? 0) * 500;
      }
    }

    // Evidence-based intensity caps to reduce risk of overly aggressive targets.
    const maxDeficit = tdee * 0.25; // up to 25% deficit for fat loss phases
    const maxSurplus = tdee * 0.15; // up to 15% surplus for lean gain phases

    if (goal === 'lose' && appliedCalorieAdjustment < -maxDeficit) {
      appliedCalorieAdjustment = -maxDeficit;
      guardrails.push('deficit_capped_to_25_percent_tdee');
    }

    if (goal === 'gain' && appliedCalorieAdjustment > maxSurplus) {
      appliedCalorieAdjustment = maxSurplus;
      guardrails.push('surplus_capped_to_15_percent_tdee');
    }

    if (goal === 'maintain' && appliedCalorieAdjustment !== 0) {
      appliedCalorieAdjustment = 0;
      guardrails.push('maintain_goal_forces_zero_adjustment');
    }

    if (weeklyChangeLb !== undefined) {
      appliedWeeklyChangeLb = Math.abs(appliedCalorieAdjustment) / 500;
    }

    const requestedCalories = tdee + requestedCalorieAdjustment;
    let calories = tdee + appliedCalorieAdjustment;

    // Conservative calorie floor commonly used in nutrition practice.
    const calorieFloor =
      gender === 'male' ? 1500 : gender === 'female' ? 1200 : 1200;

    if (calories < calorieFloor) {
      calories = calorieFloor;
      appliedCalorieAdjustment = calories - tdee;
      guardrails.push('minimum_calorie_floor_applied');
    }

    // Calculate macros
    const proteinGrams = weightKg * proteinPerKg;
    const proteinCalories = proteinGrams * 4;

    let fatCalories = calories * (fatPercent / 100);

    // Guard against impossible macro allocations at very low calories/high protein.
    if (proteinCalories + fatCalories > calories) {
      fatCalories = Math.max(0, calories - proteinCalories);
      guardrails.push('fat_adjusted_to_preserve_non_negative_carbs');
    }

    const fatGrams = fatCalories / 9;

    const carbsCalories = Math.max(0, calories - proteinCalories - fatCalories);
    const carbsGrams = carbsCalories / 4;

    return {
      success: true,
      data: {
        calories: Math.round(calories),
        proteinGrams: Math.round(proteinGrams),
        carbsGrams: Math.round(carbsGrams),
        fatGrams: Math.round(fatGrams),
        proteinCalories: Math.round(proteinCalories),
        carbsCalories: Math.round(carbsCalories),
        fatCalories: Math.round(fatCalories),
        requestedCalories: Math.round(requestedCalories),
        requestedCalorieAdjustment: Math.round(requestedCalorieAdjustment),
        appliedCalorieAdjustment: Math.round(appliedCalorieAdjustment),
        requestedWeeklyChangeLb:
          requestedWeeklyChangeLb === null
            ? null
            : Math.round(requestedWeeklyChangeLb * 100) / 100,
        appliedWeeklyChangeLb:
          appliedWeeklyChangeLb === null
            ? null
            : Math.round(appliedWeeklyChangeLb * 100) / 100,
        calorieFloor,
        guardrails,
      },
    };
  }

  calculateProtein(input: ProteinInput): SuccessResponse<ProteinResult> {
    const { goal, activityLevel } = input;
    const weightKg = this.getWeightKg(input.weightKg, input.weightLb);

    // Base recommendations (g/kg)
    const recommendations: Record<
      ActivityLevel,
      Record<typeof goal, { min: number; max: number }>
    > = {
      sedentary: {
        lose: { min: 1.2, max: 1.6 },
        maintain: { min: 0.8, max: 1.0 },
        gain: { min: 1.0, max: 1.2 },
      },
      light: {
        lose: { min: 1.4, max: 1.8 },
        maintain: { min: 1.0, max: 1.2 },
        gain: { min: 1.2, max: 1.4 },
      },
      moderate: {
        lose: { min: 1.6, max: 2.0 },
        maintain: { min: 1.2, max: 1.4 },
        gain: { min: 1.4, max: 1.8 },
      },
      active: {
        lose: { min: 1.8, max: 2.2 },
        maintain: { min: 1.4, max: 1.6 },
        gain: { min: 1.6, max: 2.0 },
      },
      very_active: {
        lose: { min: 2.0, max: 2.4 },
        maintain: { min: 1.6, max: 2.0 },
        gain: { min: 1.8, max: 2.2 },
      },
    };

    const range = recommendations[activityLevel][goal];
    const avgGramsPerKg = (range.min + range.max) / 2;
    const dailyProteinGrams = weightKg * avgGramsPerKg;

    return {
      success: true,
      data: {
        dailyProteinGrams: Math.round(dailyProteinGrams),
        gramsPerKg: Math.round(avgGramsPerKg * 10) / 10,
        recommendation: `${range.min}-${range.max}g per kg bodyweight`,
      },
    };
  }

  calculateWaterIntake(
    input: WaterIntakeInput,
  ): SuccessResponse<WaterIntakeResult> {
    const { activityLevel, climate } = input;
    const weightKg = this.getWeightKg(input.weightKg, input.weightLb);

    // Base: 30-35ml per kg
    let mlPerKg = 33;

    // Adjust for activity
    const activityMultipliers: Record<ActivityLevel, number> = {
      sedentary: 1.0,
      light: 1.1,
      moderate: 1.2,
      active: 1.3,
      very_active: 1.4,
    };

    // Adjust for climate
    const climateMultipliers = {
      cold: 0.9,
      temperate: 1.0,
      hot: 1.2,
    };

    mlPerKg *= activityMultipliers[activityLevel];
    mlPerKg *= climateMultipliers[climate];

    const dailyMl = weightKg * mlPerKg;
    const dailyLiters = dailyMl / 1000;
    const dailyOunces = dailyMl * 0.033814;

    return {
      success: true,
      data: {
        dailyLiters: Math.round(dailyLiters * 10) / 10,
        dailyOunces: Math.round(dailyOunces),
      },
    };
  }

  // ==================== PROGRESS & GOALS ====================

  calculateWeightGoalTimeline(
    input: WeightGoalTimelineInput,
  ): SuccessResponse<WeightGoalTimelineResult> {
    const currentWeightKg = this.getWeightKg(
      input.currentWeightKg,
      input.currentWeightLb,
    );
    const targetWeightKg = this.getWeightKg(
      input.targetWeightKg,
      input.targetWeightLb,
    );
    // Default to 0.5 kg/week if not provided
    const weeklyChangeKg =
      input.weeklyChangeKg ??
      (input.weeklyChangeLb ? this.lbToKg(input.weeklyChangeLb) : 0.5);

    const totalChangeKg = Math.abs(targetWeightKg - currentWeightKg);
    const weeksToGoal = Math.ceil(totalChangeKg / weeklyChangeKg);

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + weeksToGoal * 7);

    return {
      success: true,
      data: {
        weeksToGoal,
        targetDate: targetDate.toISOString().split('T')[0],
        weeklyChangeKg,
        totalChangeKg: Math.round(totalChangeKg * 10) / 10,
      },
    };
  }

  // ==================== HELPER METHODS ====================

  private getBodyFatCategory(gender: Gender, bodyFatPercent: number): string {
    if (gender === 'male') {
      if (bodyFatPercent < 6) return 'Essential fat';
      if (bodyFatPercent < 14) return 'Athletes';
      if (bodyFatPercent < 18) return 'Fitness';
      if (bodyFatPercent < 25) return 'Average';
      return 'Obese';
    } else {
      if (bodyFatPercent < 14) return 'Essential fat';
      if (bodyFatPercent < 21) return 'Athletes';
      if (bodyFatPercent < 25) return 'Fitness';
      if (bodyFatPercent < 32) return 'Average';
      return 'Obese';
    }
  }

  private getVo2MaxCategory(
    gender: Gender,
    ageYears: number,
    vo2Max: number,
  ): string {
    // Simplified categories based on age and gender
    const thresholds =
      gender === 'male'
        ? { excellent: 50, good: 42, average: 35, poor: 30 }
        : { excellent: 45, good: 37, average: 30, poor: 25 };

    // Adjust for age (roughly -0.5 per year after 30)
    const ageAdjustment = ageYears > 30 ? (ageYears - 30) * 0.5 : 0;
    const adjustedVo2 = vo2Max + ageAdjustment;

    if (adjustedVo2 >= thresholds.excellent) return 'Excellent';
    if (adjustedVo2 >= thresholds.good) return 'Good';
    if (adjustedVo2 >= thresholds.average) return 'Average';
    if (adjustedVo2 >= thresholds.poor) return 'Below Average';
    return 'Poor';
  }
}
