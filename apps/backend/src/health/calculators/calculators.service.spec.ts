import { CalculatorsService } from './calculators.service';

describe('CalculatorsService', () => {
  let service: CalculatorsService;

  beforeEach(() => {
    service = new CalculatorsService();
  });

  it('calculates BMI correctly', () => {
    const result = service.calculateBmi({ weightKg: 70, heightCm: 175 }).data;
    expect(result.bmi).toBe(22.9);
    expect(result.category).toBe('normal');
  });

  it('calculates Navy body fat and uses provided bodyweight for mass outputs', () => {
    const result = service.calculateBodyFatNavy({
      gender: 'male',
      weightKg: 80,
      heightCm: 180,
      waistCm: 88,
      neckCm: 40,
    }).data;

    expect(result.bodyFatPercent).toBeGreaterThan(0);
    expect(result.bodyFatPercent).toBeLessThan(40);
    expect(Math.round((result.leanMassKg + result.fatMassKg) * 10) / 10).toBe(
      80,
    );
  });

  it('calculates lean body mass correctly', () => {
    const result = service.calculateLeanBodyMass({
      weightKg: 80,
      bodyFatPercent: 20,
    }).data;
    expect(result.leanMassKg).toBe(64);
    expect(result.fatMassKg).toBe(16);
  });

  it('calculates waist-to-hip ratio correctly', () => {
    const result = service.calculateWaistToHip({ waistCm: 82, hipCm: 98 }).data;
    expect(result.ratio).toBe(0.84);
    expect(result.risk).toBe('low');
  });

  it('calculates FFMI correctly', () => {
    const result = service.calculateFfmi({
      weightKg: 85,
      heightCm: 182,
      bodyFatPercent: 15,
    }).data;

    expect(result.ffmi).toBeCloseTo(21.8, 1);
    expect(result.adjustedFfmi).toBeCloseTo(21.7, 1);
  });

  it('calculates BMR using Mifflin-St Jeor correctly', () => {
    const result = service.calculateBmr({
      gender: 'male',
      weightKg: 80,
      heightCm: 180,
      ageYears: 30,
      formula: 'mifflin',
    }).data;

    expect(result.bmr).toBe(1780);
    expect(result.formula).toContain('Mifflin');
  });

  it('calculates TDEE correctly from BMR and activity multiplier', () => {
    const result = service.calculateTdee({
      gender: 'male',
      weightKg: 80,
      heightCm: 180,
      ageYears: 30,
      formula: 'mifflin',
      activityLevel: 'moderate',
    }).data;

    expect(result.bmr).toBe(1780);
    expect(result.activityMultiplier).toBe(1.55);
    expect(result.tdee).toBe(2759);
  });

  it('calculates calorie goal correctly', () => {
    const result = service.calculateCalorieGoal({
      gender: 'male',
      weightKg: 80,
      heightCm: 180,
      ageYears: 30,
      formula: 'mifflin',
      activityLevel: 'moderate',
      goal: 'lose',
      deficitSurplus: 500,
    }).data;

    expect(result.tdee).toBe(2759);
    expect(result.targetCalories).toBe(2259);
    expect(result.weeklyChangeKg).toBeCloseTo(0.45, 2);
  });

  it('calculates one-rep max correctly with Epley', () => {
    const result = service.calculateOneRm({
      weightKg: 100,
      reps: 5,
      formula: 'epley',
    }).data;

    expect(result.oneRm).toBeCloseTo(116.7, 1);
    expect(result.percentages[90]).toBe(105);
  });

  it('calculates Wilks score and DOTS score as finite values', () => {
    const wilks = service.calculateWilks({
      gender: 'male',
      bodyweightKg: 90,
      totalKg: 700,
    }).data;

    const dots = service.calculateDots({
      gender: 'male',
      bodyweightKg: 90,
      totalKg: 700,
    }).data;

    expect(Number.isFinite(wilks.wilksScore)).toBe(true);
    expect(Number.isFinite(dots.dotsScore)).toBe(true);
    expect(wilks.wilksScore).toBeGreaterThan(0);
    expect(dots.dotsScore).toBeGreaterThan(0);
  });

  it('calculates volume load correctly', () => {
    const result = service.calculateVolumeLoad({
      sets: 5,
      reps: 5,
      weightKg: 100,
    }).data;

    expect(result.volumeLoad).toBe(2500);
    expect(result.tonnage).toBe(2.5);
  });

  it('calculates INOL correctly and returns recommendation', () => {
    const result = service.calculateInol({ reps: 20, percentOf1Rm: 80 }).data;
    expect(result.inol).toBe(1);
    expect(result.recommendation.toLowerCase()).toContain('optimal');
  });

  it('throws for invalid INOL denominator at 100 percent', () => {
    expect(() =>
      service.calculateInol({ reps: 10, percentOf1Rm: 100 }),
    ).toThrow();
  });

  it('calculates max heart rate and zones correctly', () => {
    const maxHr = service.calculateMaxHeartRate({
      ageYears: 40,
      formula: 'tanaka',
    }).data;
    const zones = service.calculateHeartRateZones({
      maxHeartRate: maxHr.maxHr,
    }).data;

    expect(maxHr.maxHr).toBe(180);
    expect(zones.zones).toHaveLength(5);
    expect(zones.zones[0].minBpm).toBe(90);
    expect(zones.zones[4].maxBpm).toBe(180);
  });

  it('calculates VO2 max correctly', () => {
    const result = service.calculateVo2Max({
      gender: 'male',
      ageYears: 30,
      restingHeartRate: 60,
    }).data;

    expect(result.vo2Max).toBeCloseTo(47.7, 1);
  });

  it('formats pace output safely when seconds round to 60', () => {
    const result = service.calculatePace({
      distanceKm: 10,
      timeMinutes: 59.999,
    }).data;

    expect(result.pacePerKm).toBe('6:00');
    expect(result.pacePerMile).toMatch(/^\d+:\d{2}$/);
  });

  it('calculates MET calories burned correctly', () => {
    const result = service.calculateMet({
      activityMet: 8,
      weightKg: 70,
      durationMinutes: 30,
    }).data;

    expect(result.caloriesBurned).toBe(280);
    expect(result.met).toBe(8);
  });

  it('applies macro guardrails for aggressive deficits', () => {
    const result = service.calculateMacros({
      tdee: 2200,
      goal: 'lose',
      weightKg: 70,
      gender: 'female',
      proteinPerKg: 2,
      fatPercent: 30,
      calorieAdjustment: -1200,
    }).data;

    expect(result.guardrails).toContain('deficit_capped_to_25_percent_tdee');
    expect(result.calories).toBeGreaterThanOrEqual(1200);
    expect(result.carbsGrams).toBeGreaterThanOrEqual(0);
  });

  it('calculates protein and water targets correctly', () => {
    const protein = service.calculateProtein({
      weightKg: 80,
      goal: 'maintain',
      activityLevel: 'moderate',
    }).data;

    const water = service.calculateWaterIntake({
      weightKg: 80,
      activityLevel: 'moderate',
      climate: 'temperate',
    }).data;

    expect(protein.dailyProteinGrams).toBe(104);
    expect(water.dailyLiters).toBe(3.2);
  });

  it('calculates weight-goal timeline correctly', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-06T00:00:00.000Z'));

    const result = service.calculateWeightGoalTimeline({
      currentWeightKg: 90,
      targetWeightKg: 80,
      weeklyChangeKg: 0.5,
    }).data;

    const expectedDate = new Date('2026-03-06T00:00:00.000Z');
    expectedDate.setDate(expectedDate.getDate() + 20 * 7);

    expect(result.weeksToGoal).toBe(20);
    expect(result.totalChangeKg).toBe(10);
    expect(result.targetDate).toBe(expectedDate.toISOString().split('T')[0]);

    jest.useRealTimers();
  });
});
