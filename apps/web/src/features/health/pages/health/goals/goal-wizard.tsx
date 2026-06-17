import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Dumbbell,
  Loader2,
  Target,
  Scale,
  Activity,
  Utensils,
  Calculator,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Minus,
  Moon,
  Footprints,
  ClipboardCheck,
  CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useUpdateNutritionGoal } from '@/features/health';
import { useUpdateWeightGoal } from '@/features/health';
import { useUpdateWorkoutGoal } from '@/features/health';
import { useUpdateWaterGoal } from '@/features/health';
import { useUpdateLifestyleGoal } from '@/features/health';

// Types
type UnitSystem = 'metric' | 'imperial';
type Sex = 'male' | 'female';
type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';
type GoalType = 'LOSE' | 'MAINTAIN' | 'GAIN';
type DietType = 'balanced' | 'lowCarb' | 'highCarb' | 'highProtein';

interface TdeeResult {
  tdee: number;
  bmr: number;
  activityMultiplier: number;
}

interface MacrosResult {
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

interface WaterIntakeResult {
  dailyLiters: number;
  dailyOunces: number;
}

interface WizardState {
  // Step 1: Basic Info
  units: UnitSystem;
  sex: Sex;
  age: string;
  weightKg: string;
  weightLb: string;
  heightCm: string;
  heightFt: string;
  heightIn: string;
  // Step 2: Activity Level
  activityLevel: ActivityLevel;
  // Step 3: Goal
  goalType: GoalType;
  // Step 4: Target Weight
  targetWeightKg: string;
  targetWeightLb: string;
  weeklyRate: number; // 0.5, 1, 1.5, 2 lbs per week
  // Step 5: Diet
  dietType: DietType;
  // Step 6: Workout
  weeklyWorkouts: number;
  muscleTargets: Record<string, number>;
  // Step 7: Lifestyle
  sleepHours: number;
  dailySteps: number;
  adherenceTarget: number;
  checkInsPerWeek: number;
}

// Constants
const STEPS = [
  { id: 1, title: 'Basic Info', icon: Scale, description: 'Your measurements' },
  { id: 2, title: 'Activity', icon: Activity, description: 'Activity level' },
  { id: 3, title: 'Goal', icon: Target, description: 'Weight goal' },
  { id: 4, title: 'Target', icon: TrendingDown, description: 'Target weight' },
  { id: 5, title: 'Diet', icon: Utensils, description: 'Macro split' },
  { id: 6, title: 'Workout', icon: Dumbbell, description: 'Training goals' },
  { id: 7, title: 'Lifestyle', icon: Moon, description: 'Sleep & adherence' },
  { id: 8, title: 'Review', icon: Check, description: 'Confirm & save' },
];

const MUSCLE_GROUPS = [
  {
    key: 'CHEST',
    label: 'Chest',
    defaultSets: 16,
    description: 'Bench press, flyes, push-ups',
  },
  {
    key: 'BACK',
    label: 'Back',
    defaultSets: 18,
    description: 'Rows, pull-ups, lat pulldown',
  },
  {
    key: 'SHOULDERS',
    label: 'Shoulders',
    defaultSets: 14,
    description: 'Overhead press, lateral raises',
  },
  {
    key: 'ARMS',
    label: 'Arms',
    defaultSets: 12,
    description: 'Biceps & triceps work',
  },
  {
    key: 'LEGS',
    label: 'Legs',
    defaultSets: 16,
    description: 'Squats, leg press, lunges',
  },
  {
    key: 'CORE',
    label: 'Core',
    defaultSets: 10,
    description: 'Abs, obliques, lower back',
  },
];

const ACTIVITY_LEVELS = [
  {
    value: 'sedentary',
    label: 'Sedentary',
    description: 'Little or no exercise, desk job',
    multiplier: 1.2,
  },
  {
    value: 'light',
    label: 'Lightly Active',
    description: 'Light exercise 1-3 days/week',
    multiplier: 1.375,
  },
  {
    value: 'moderate',
    label: 'Moderately Active',
    description: 'Moderate exercise 3-5 days/week',
    multiplier: 1.55,
  },
  {
    value: 'active',
    label: 'Very Active',
    description: 'Hard exercise 6-7 days/week',
    multiplier: 1.725,
  },
  {
    value: 'very_active',
    label: 'Extra Active',
    description: 'Very hard exercise, physical job',
    multiplier: 1.9,
  },
];

const GOALS = [
  {
    value: 'LOSE',
    label: 'Lose Weight',
    description: 'Caloric deficit to shed fat',
    icon: TrendingDown,
    color: 'text-blue-500',
  },
  {
    value: 'MAINTAIN',
    label: 'Maintain',
    description: 'Keep current weight',
    icon: Minus,
    color: 'text-green-500',
  },
  {
    value: 'GAIN',
    label: 'Build Muscle',
    description: 'Caloric surplus to gain mass',
    icon: TrendingUp,
    color: 'text-orange-500',
  },
];

const WEEKLY_RATES = [
  {
    value: 0.5,
    label: 'Slow',
    description: '0.5 lb/week',
    detail: 'More sustainable, preserves muscle',
  },
  {
    value: 1.0,
    label: 'Moderate',
    description: '1 lb/week',
    detail: 'Balanced approach',
  },
  {
    value: 1.5,
    label: 'Fast',
    description: '1.5 lb/week',
    detail: 'Aggressive but manageable',
  },
  {
    value: 2.0,
    label: 'Aggressive',
    description: '2 lb/week',
    detail: 'Maximum recommended rate',
  },
];

const DIETS = [
  {
    value: 'balanced',
    label: 'Balanced',
    split: '30% P / 40% C / 30% F',
    description: 'Even macro distribution',
    proteinPerKg: 1.6,
    fatPercent: 30,
  },
  {
    value: 'lowCarb',
    label: 'Low Carb',
    split: '40% P / 25% C / 35% F',
    description: 'Reduced carbohydrates',
    proteinPerKg: 2.0,
    fatPercent: 35,
  },
  {
    value: 'highCarb',
    label: 'High Carb',
    split: '25% P / 55% C / 20% F',
    description: 'For high activity levels',
    proteinPerKg: 1.4,
    fatPercent: 20,
  },
  {
    value: 'highProtein',
    label: 'High Protein',
    split: '40% P / 30% C / 30% F',
    description: 'Maximize muscle growth',
    proteinPerKg: 2.2,
    fatPercent: 30,
  },
];

export default function GoalWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [calculatedResults, setCalculatedResults] = useState<{
    tdee: number;
    bmr: number;
    targetCalories: number;
    protein: number;
    carbs: number;
    fat: number;
    requestedCalories: number;
    requestedCalorieAdjustment: number;
    appliedCalorieAdjustment: number;
    requestedWeeklyChangeLb: number | null;
    appliedWeeklyChangeLb: number | null;
    calorieFloor: number;
    guardrails: string[];
    hydrationLiters: number;
    hydrationOunces: number;
    weeksToGoal: number;
    targetDate: string;
  } | null>(null);
  const [calculatedForKey, setCalculatedForKey] = useState<string | null>(null);

  const [state, setState] = useState<WizardState>({
    units: 'imperial',
    sex: 'male',
    age: '',
    weightKg: '',
    weightLb: '',
    heightCm: '',
    heightFt: '',
    heightIn: '',
    activityLevel: 'moderate',
    goalType: 'LOSE',
    targetWeightKg: '',
    targetWeightLb: '',
    weeklyRate: 1.0,
    dietType: 'balanced',
    weeklyWorkouts: 4,
    muscleTargets: {
      CHEST: 16,
      BACK: 18,
      SHOULDERS: 14,
      ARMS: 12,
      LEGS: 16,
      CORE: 10,
    },
    sleepHours: 8,
    dailySteps: 10000,
    adherenceTarget: 85,
    checkInsPerWeek: 4,
  });

  const updateNutritionGoal = useUpdateNutritionGoal({
    onSuccess: () => {
      toast.success('Nutrition goals saved!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save nutrition goals');
    },
  });

  const updateWeightGoal = useUpdateWeightGoal({
    onSuccess: () => {
      toast.success('Weight goal saved!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save weight goal');
    },
  });

  const updateWorkoutGoal = useUpdateWorkoutGoal({
    onSuccess: () => {
      toast.success('Workout goals saved!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save workout goals');
    },
  });

  const updateWaterGoal = useUpdateWaterGoal({
    onSuccess: () => {
      toast.success('Hydration goal saved!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save hydration goal');
    },
  });

  const updateLifestyleGoal = useUpdateLifestyleGoal({
    onSuccess: () => {
      toast.success('Lifestyle goals saved!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save lifestyle goals');
    },
  });

  // Helpers
  const getWeightInKg = (wizardState: WizardState): number => {
    if (wizardState.units === 'metric') {
      return parseFloat(wizardState.weightKg) || 0;
    }
    return (parseFloat(wizardState.weightLb) || 0) * 0.453592;
  };

  const buildCalculationKey = useCallback(
    (wizardState: WizardState): string => {
      const targetWeight =
        wizardState.units === 'metric'
          ? wizardState.targetWeightKg
          : wizardState.targetWeightLb;

      return JSON.stringify({
        units: wizardState.units,
        sex: wizardState.sex,
        age: wizardState.age,
        weightKg: wizardState.weightKg,
        weightLb: wizardState.weightLb,
        heightCm: wizardState.heightCm,
        heightFt: wizardState.heightFt,
        heightIn: wizardState.heightIn,
        activityLevel: wizardState.activityLevel,
        goalType: wizardState.goalType,
        targetWeight,
        weeklyRate: wizardState.weeklyRate,
        dietType: wizardState.dietType,
      });
    },
    [],
  );

  const calculationInputKey = useMemo(
    () => buildCalculationKey(state),
    [state, buildCalculationKey],
  );

  const calculateResults = useCallback(
    async (
      wizardState: WizardState = state,
      key: string = buildCalculationKey(wizardState),
    ): Promise<boolean> => {
      // Clear previous run so stale values are never shown while recalculating.
      setCalculatedResults(null);
      setCalculatedForKey(null);
      setIsCalculating(true);
      try {
        // Step 1: Calculate TDEE
        const tdeePayload =
          wizardState.units === 'metric'
            ? {
                weightKg: parseFloat(wizardState.weightKg),
                heightCm: parseFloat(wizardState.heightCm),
                ageYears: parseInt(wizardState.age),
                gender: wizardState.sex,
                activityLevel: wizardState.activityLevel,
              }
            : {
                weightLb: parseFloat(wizardState.weightLb),
                heightIn:
                  parseInt(wizardState.heightFt) * 12 +
                  parseFloat(wizardState.heightIn),
                ageYears: parseInt(wizardState.age),
                gender: wizardState.sex,
                activityLevel: wizardState.activityLevel,
              };

        const tdeeResponse = await api.post<{
          success: boolean;
          data: TdeeResult;
        }>('/calculators/tdee', tdeePayload);
        const { tdee, bmr } = tdeeResponse.data.data;

        // Step 2: Calculate macros
        const diet = DIETS.find((d) => d.value === wizardState.dietType)!;
        const weightKg = getWeightInKg(wizardState);

        const macrosPayload = {
          tdee,
          goal: wizardState.goalType.toLowerCase(),
          gender: wizardState.sex,
          weeklyChangeLb:
            wizardState.goalType === 'MAINTAIN'
              ? undefined
              : wizardState.weeklyRate,
          weightKg,
          proteinPerKg: diet.proteinPerKg,
          fatPercent: diet.fatPercent,
        };

        const macrosResponse = await api.post<{
          success: boolean;
          data: MacrosResult;
        }>('/calculators/macros', macrosPayload);
        const macros = macrosResponse.data.data;

        // Step 3: Calculate hydration target
        const waterPayload =
          wizardState.units === 'metric'
            ? {
                weightKg: parseFloat(wizardState.weightKg),
                activityLevel: wizardState.activityLevel,
              }
            : {
                weightLb: parseFloat(wizardState.weightLb),
                activityLevel: wizardState.activityLevel,
              };

        const waterResponse = await api.post<{
          success: boolean;
          data: WaterIntakeResult;
        }>('/calculators/water-intake', waterPayload);
        const water = waterResponse.data.data;

        // Step 4: Calculate weight goal timeline (if not maintaining)
        let weeksToGoal = 0;
        let targetDate = new Date().toISOString();

        if (wizardState.goalType !== 'MAINTAIN') {
          const currentWeight =
            wizardState.units === 'metric'
              ? parseFloat(wizardState.weightKg)
              : parseFloat(wizardState.weightLb);
          const targetWeight =
            wizardState.units === 'metric'
              ? parseFloat(wizardState.targetWeightKg)
              : parseFloat(wizardState.targetWeightLb);

          const weightDiff = Math.abs(currentWeight - targetWeight);
          weeksToGoal = Math.ceil(weightDiff / wizardState.weeklyRate);

          const target = new Date();
          target.setDate(target.getDate() + weeksToGoal * 7);
          targetDate = target.toISOString();
        }

        setCalculatedResults({
          tdee: Math.round(tdee),
          bmr: Math.round(bmr),
          targetCalories: Math.round(macros.calories),
          protein: Math.round(macros.proteinGrams),
          carbs: Math.round(macros.carbsGrams),
          fat: Math.round(macros.fatGrams),
          requestedCalories: Math.round(macros.requestedCalories),
          requestedCalorieAdjustment: Math.round(
            macros.requestedCalorieAdjustment,
          ),
          appliedCalorieAdjustment: Math.round(macros.appliedCalorieAdjustment),
          requestedWeeklyChangeLb: macros.requestedWeeklyChangeLb,
          appliedWeeklyChangeLb: macros.appliedWeeklyChangeLb,
          calorieFloor: macros.calorieFloor,
          guardrails: macros.guardrails,
          hydrationLiters: Math.round(water.dailyLiters * 10) / 10,
          hydrationOunces: Math.round(water.dailyOunces),
          weeksToGoal,
          targetDate,
        });
        setCalculatedForKey(key);
        return true;
      } catch (error) {
        console.error('Calculation error:', error);
        toast.error('Failed to calculate goals. Please check your inputs.');
        return false;
      } finally {
        setIsCalculating(false);
      }
    },
    [buildCalculationKey, state],
  );

  const hasStaleResults =
    !!calculatedResults && calculatedForKey !== calculationInputKey;

  const handleSaveGoals = async () => {
    if (!calculatedResults) return;

    setIsSaving(true);
    try {
      // Save nutrition goal
      await updateNutritionGoal.mutateAsync({
        targetCalories: calculatedResults.targetCalories,
        targetProtein: calculatedResults.protein,
        targetCarbs: calculatedResults.carbs,
        targetFat: calculatedResults.fat,
      });

      // Save weight goal (if not maintaining)
      if (state.goalType !== 'MAINTAIN') {
        const targetWeight =
          state.units === 'metric'
            ? parseFloat(state.targetWeightKg)
            : parseFloat(state.targetWeightLb);

        await updateWeightGoal.mutateAsync({
          targetWeight,
          targetUnit: state.units === 'metric' ? 'KG' : 'LB',
          goalType: state.goalType,
          weeklyRate: state.weeklyRate,
        });
      }

      // Save workout goals
      await updateWorkoutGoal.mutateAsync({
        weeklyWorkouts: state.weeklyWorkouts,
        muscleTargets: state.muscleTargets,
      });

      // Save hydration goal in OZ to stay consistent with dashboard/water summary calculations.
      await updateWaterGoal.mutateAsync({
        targetAmount: calculatedResults.hydrationOunces,
        targetUnit: 'OZ',
      });

      // Save lifestyle goals (sleep, steps, adherence, check-ins)
      await updateLifestyleGoal.mutateAsync({
        sleepHours: state.sleepHours,
        dailySteps: state.dailySteps,
        adherenceTarget: state.adherenceTarget,
        checkInsPerWeek: state.checkInsPerWeek,
      });

      toast.success('Your goals have been saved!');
      navigate('/goals');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save goals. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        if (state.units === 'metric') {
          return !!state.age && !!state.weightKg && !!state.heightCm;
        }
        return (
          !!state.age &&
          !!state.weightLb &&
          !!state.heightFt &&
          !!state.heightIn
        );
      case 2:
        return !!state.activityLevel;
      case 3:
        return !!state.goalType;
      case 4:
        if (state.goalType === 'MAINTAIN') return true;
        if (state.units === 'metric') {
          return !!state.targetWeightKg;
        }
        return !!state.targetWeightLb;
      case 5:
        return !!state.dietType;
      case 6:
        return state.weeklyWorkouts >= 1 && state.weeklyWorkouts <= 7;
      case 7:
        return (
          state.sleepHours >= 4 &&
          state.sleepHours <= 12 &&
          state.dailySteps >= 1000 &&
          state.dailySteps <= 50000 &&
          state.adherenceTarget >= 50 &&
          state.adherenceTarget <= 100 &&
          state.checkInsPerWeek >= 1 &&
          state.checkInsPerWeek <= 14
        );
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (currentStep === 7) {
      // Calculate before moving to review
      const snapshot = state;
      const snapshotKey = buildCalculationKey(snapshot);
      const ok = await calculateResults(snapshot, snapshotKey);
      if (!ok) {
        return;
      }
    }
    if (currentStep < STEPS.length) {
      setCurrentStep((previous) => previous + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  // If users modify inputs after a previous run, ensure review always reflects latest values.
  useEffect(() => {
    if (currentStep !== 8) return;
    if (!hasStaleResults) return;
    if (isCalculating) return;

    void calculateResults(state, calculationInputKey);
  }, [
    currentStep,
    hasStaleResults,
    isCalculating,
    calculateResults,
    state,
    calculationInputKey,
  ]);

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-primary text-sm font-medium">
          <Sparkles className="h-4 w-4" />
          Goal Wizard
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Build Your Personalized Plan
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Answer a few questions and we will calculate your nutrition, weight,
          hydration, workout, and lifestyle goals.
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-4">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;
            return (
              <div
                key={step.id}
                className={cn(
                  'flex flex-col items-center gap-1 transition-colors',
                  isActive && 'text-primary',
                  isCompleted && 'text-primary',
                  !isActive && !isCompleted && 'text-muted-foreground',
                )}
              >
                <div
                  className={cn(
                    'h-10 w-10 rounded-full flex items-center justify-center border-2 transition-colors',
                    isActive && 'border-primary bg-primary/10',
                    isCompleted &&
                      'border-primary bg-primary text-primary-foreground',
                    !isActive && !isCompleted && 'border-muted',
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span className="text-xs font-medium hidden sm:block">
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {(() => {
              const StepIcon = STEPS[currentStep - 1].icon;
              return <StepIcon className="h-5 w-5 text-primary" />;
            })()}
            {STEPS[currentStep - 1].title}
          </CardTitle>
          <CardDescription>
            {STEPS[currentStep - 1].description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Unit Toggle */}
              <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
                <button
                  type="button"
                  onClick={() => setState({ ...state, units: 'metric' })}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    state.units === 'metric'
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Metric
                </button>
                <button
                  type="button"
                  onClick={() => setState({ ...state, units: 'imperial' })}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    state.units === 'imperial'
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Imperial
                </button>
              </div>

              {/* Sex and Age */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Biological Sex</Label>
                  <div className="flex gap-1 p-1 bg-muted rounded-lg">
                    <button
                      type="button"
                      onClick={() => setState({ ...state, sex: 'male' })}
                      className={cn(
                        'flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        state.sex === 'male'
                          ? 'bg-background shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      Male
                    </button>
                    <button
                      type="button"
                      onClick={() => setState({ ...state, sex: 'female' })}
                      className={cn(
                        'flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        state.sex === 'female'
                          ? 'bg-background shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      Female
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="30"
                    value={state.age}
                    onChange={(e) =>
                      setState({ ...state, age: e.target.value })
                    }
                    min={13}
                    max={120}
                  />
                </div>
              </div>

              {/* Weight and Height */}
              {state.units === 'metric' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="weightKg">Current Weight (kg)</Label>
                    <Input
                      id="weightKg"
                      type="number"
                      step="0.1"
                      placeholder="75"
                      value={state.weightKg}
                      onChange={(e) =>
                        setState({ ...state, weightKg: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heightCm">Height (cm)</Label>
                    <Input
                      id="heightCm"
                      type="number"
                      step="0.1"
                      placeholder="175"
                      value={state.heightCm}
                      onChange={(e) =>
                        setState({ ...state, heightCm: e.target.value })
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="weightLb">Current Weight (lbs)</Label>
                    <Input
                      id="weightLb"
                      type="number"
                      step="0.1"
                      placeholder="165"
                      value={state.weightLb}
                      onChange={(e) =>
                        setState({ ...state, weightLb: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Height</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        id="heightFt"
                        type="number"
                        placeholder="5 ft"
                        value={state.heightFt}
                        onChange={(e) =>
                          setState({ ...state, heightFt: e.target.value })
                        }
                      />
                      <Input
                        id="heightIn"
                        type="number"
                        step="0.1"
                        placeholder="9 in"
                        value={state.heightIn}
                        onChange={(e) =>
                          setState({ ...state, heightIn: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Activity Level */}
          {currentStep === 2 && (
            <div className="grid gap-3">
              {ACTIVITY_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() =>
                    setState({
                      ...state,
                      activityLevel: level.value as ActivityLevel,
                    })
                  }
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-all',
                    state.activityLevel === level.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50',
                  )}
                >
                  <div className="flex-1">
                    <div className="font-medium">{level.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {level.description}
                    </div>
                  </div>
                  <div
                    className={cn(
                      'h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors',
                      state.activityLevel === level.value
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground',
                    )}
                  >
                    {state.activityLevel === level.value && (
                      <Check className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Goal */}
          {currentStep === 3 && (
            <div className="grid gap-4 sm:grid-cols-3">
              {GOALS.map((goal) => {
                const Icon = goal.icon;
                return (
                  <button
                    key={goal.value}
                    type="button"
                    onClick={() =>
                      setState({ ...state, goalType: goal.value as GoalType })
                    }
                    className={cn(
                      'flex flex-col items-center gap-3 p-6 rounded-xl border-2 text-center transition-all',
                      state.goalType === goal.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50',
                    )}
                  >
                    <div
                      className={cn(
                        'h-12 w-12 rounded-full flex items-center justify-center',
                        state.goalType === goal.value
                          ? 'bg-primary/20'
                          : 'bg-muted',
                      )}
                    >
                      <Icon className={cn('h-6 w-6', goal.color)} />
                    </div>
                    <div>
                      <div className="font-semibold">{goal.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {goal.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 4: Target Weight */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {state.goalType === 'MAINTAIN' ? (
                <div className="text-center py-8">
                  <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold">
                    Maintaining Your Weight
                  </h3>
                  <p className="text-muted-foreground mt-2">
                    We'll calculate your TDEE to help you maintain your current
                    weight. No target weight needed!
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="targetWeight">
                      Target Weight ({state.units === 'metric' ? 'kg' : 'lbs'})
                    </Label>
                    {state.units === 'metric' ? (
                      <Input
                        id="targetWeight"
                        type="number"
                        step="0.1"
                        placeholder="70"
                        value={state.targetWeightKg}
                        onChange={(e) =>
                          setState({ ...state, targetWeightKg: e.target.value })
                        }
                      />
                    ) : (
                      <Input
                        id="targetWeight"
                        type="number"
                        step="0.1"
                        placeholder="150"
                        value={state.targetWeightLb}
                        onChange={(e) =>
                          setState({ ...state, targetWeightLb: e.target.value })
                        }
                      />
                    )}
                    <p className="text-xs text-muted-foreground">
                      Current:{' '}
                      {state.units === 'metric'
                        ? `${state.weightKg} kg`
                        : `${state.weightLb} lbs`}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label>
                      Weekly {state.goalType === 'LOSE' ? 'Loss' : 'Gain'} Rate
                    </Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {WEEKLY_RATES.map((rate) => (
                        <button
                          key={rate.value}
                          type="button"
                          onClick={() =>
                            setState({ ...state, weeklyRate: rate.value })
                          }
                          className={cn(
                            'flex flex-col p-4 rounded-lg border-2 text-left transition-all',
                            state.weeklyRate === rate.value
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50',
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{rate.label}</span>
                            <span className="text-sm text-primary font-semibold">
                              {rate.description}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground mt-1">
                            {rate.detail}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 5: Diet */}
          {currentStep === 5 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {DIETS.map((diet) => (
                <button
                  key={diet.value}
                  type="button"
                  onClick={() =>
                    setState({ ...state, dietType: diet.value as DietType })
                  }
                  className={cn(
                    'flex flex-col gap-2 p-4 rounded-lg border-2 text-left transition-all',
                    state.dietType === diet.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{diet.label}</span>
                    {state.dietType === diet.value && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <span className="text-xs font-mono text-primary">
                    {diet.split}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {diet.description}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Step 6: Workout Goals */}
          {currentStep === 6 && (
            <div className="space-y-6">
              {/* Weekly Workouts */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  Weekly Workout Frequency
                </Label>
                <p className="text-sm text-muted-foreground">
                  How many days per week do you plan to train?
                </p>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() =>
                        setState({ ...state, weeklyWorkouts: num })
                      }
                      className={cn(
                        'h-12 w-12 rounded-lg border-2 font-semibold transition-all',
                        state.weeklyWorkouts === num
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:border-primary/50',
                      )}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {state.weeklyWorkouts <= 2 &&
                    'Great for beginners or recovery weeks'}
                  {state.weeklyWorkouts >= 3 &&
                    state.weeklyWorkouts <= 4 &&
                    'Optimal for most trainees'}
                  {state.weeklyWorkouts >= 5 &&
                    state.weeklyWorkouts <= 6 &&
                    'Intermediate to advanced'}
                  {state.weeklyWorkouts === 7 &&
                    'Very advanced, ensure adequate recovery'}
                </p>
              </div>

              {/* Muscle Group Targets */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  Weekly Set Targets by Muscle Group
                </Label>
                <p className="text-sm text-muted-foreground">
                  How many sets per muscle group per week? Adjust based on your
                  experience level.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {MUSCLE_GROUPS.map((muscle) => (
                    <div
                      key={muscle.key}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{muscle.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {muscle.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setState({
                              ...state,
                              muscleTargets: {
                                ...state.muscleTargets,
                                [muscle.key]: Math.max(
                                  0,
                                  (state.muscleTargets[muscle.key] ||
                                    muscle.defaultSets) - 2,
                                ),
                              },
                            })
                          }
                          className="h-8 w-8 rounded border hover:bg-muted flex items-center justify-center"
                        >
                          -
                        </button>
                        <Input
                          type="number"
                          min={0}
                          max={30}
                          value={
                            state.muscleTargets[muscle.key] ??
                            muscle.defaultSets
                          }
                          onChange={(e) =>
                            setState({
                              ...state,
                              muscleTargets: {
                                ...state.muscleTargets,
                                [muscle.key]: parseInt(e.target.value) || 0,
                              },
                            })
                          }
                          className="w-14 text-center"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setState({
                              ...state,
                              muscleTargets: {
                                ...state.muscleTargets,
                                [muscle.key]: Math.min(
                                  30,
                                  (state.muscleTargets[muscle.key] ||
                                    muscle.defaultSets) + 2,
                                ),
                              },
                            })
                          }
                          className="h-8 w-8 rounded border hover:bg-muted flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total weekly sets:{' '}
                  {Object.values(state.muscleTargets).reduce(
                    (a, b) => a + b,
                    0,
                  )}{' '}
                  sets
                </p>
              </div>
            </div>
          )}

          {/* Step 7: Lifestyle Goals */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="border-indigo-500/20 bg-indigo-500/5">
                  <CardContent className="pt-5 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Moon className="h-4 w-4 text-indigo-500" /> Sleep goal
                      (hours/night)
                    </div>
                    <Input
                      type="number"
                      min={4}
                      max={12}
                      step={0.5}
                      value={state.sleepHours}
                      onChange={(e) =>
                        setState({
                          ...state,
                          sleepHours: Number(e.target.value) || 8,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Recommended range: 7 to 9 hours.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-emerald-500/20 bg-emerald-500/5">
                  <CardContent className="pt-5 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Footprints className="h-4 w-4 text-emerald-500" /> Step
                      goal (per day)
                    </div>
                    <Input
                      type="number"
                      min={1000}
                      max={50000}
                      step={500}
                      value={state.dailySteps}
                      onChange={(e) =>
                        setState({
                          ...state,
                          dailySteps: Number(e.target.value) || 10000,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Typical target: 8,000 to 12,000 steps.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="border-amber-500/20 bg-amber-500/5">
                  <CardContent className="pt-5 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ClipboardCheck className="h-4 w-4 text-amber-500" />{' '}
                      Adherence target (%)
                    </div>
                    <Input
                      type="number"
                      min={50}
                      max={100}
                      step={1}
                      value={state.adherenceTarget}
                      onChange={(e) =>
                        setState({
                          ...state,
                          adherenceTarget: Number(e.target.value) || 85,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Aim for consistency, not perfection.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-cyan-500/20 bg-cyan-500/5">
                  <CardContent className="pt-5 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarDays className="h-4 w-4 text-cyan-500" />{' '}
                      Check-ins per week
                    </div>
                    <Input
                      type="number"
                      min={1}
                      max={14}
                      step={1}
                      value={state.checkInsPerWeek}
                      onChange={(e) =>
                        setState({
                          ...state,
                          checkInsPerWeek: Number(e.target.value) || 4,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Use this for accountability touchpoints.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Step 8: Review */}
          {currentStep === 8 && (
            <div className="space-y-6">
              {isCalculating ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="mt-4 text-muted-foreground">
                    Calculating your personalized plan...
                  </p>
                </div>
              ) : calculatedResults ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Calorie Card */}
                    <Card className="bg-linear-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                            <Calculator className="h-5 w-5 text-orange-500" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Daily Calories
                            </p>
                            <p className="text-2xl font-bold">
                              {calculatedResults.targetCalories}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-orange-500/20">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">TDEE</span>
                            <span>{calculatedResults.tdee} cal</span>
                          </div>
                          <div className="flex justify-between text-sm mt-1">
                            <span className="text-muted-foreground">BMR</span>
                            <span>{calculatedResults.bmr} cal</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Macros Card */}
                    <Card className="bg-linear-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <Utensils className="h-5 w-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Daily Macros
                            </p>
                            <p className="text-sm font-medium mt-1">
                              {
                                DIETS.find((d) => d.value === state.dietType)
                                  ?.label
                              }{' '}
                              Diet
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-blue-500/20 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Protein
                            </span>
                            <span className="font-semibold">
                              {calculatedResults.protein}g
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Carbs
                            </span>
                            <span className="font-semibold">
                              {calculatedResults.carbs}g
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Fat
                            </span>
                            <span className="font-semibold">
                              {calculatedResults.fat}g
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Hydration Card */}
                    <Card className="bg-linear-to-br from-cyan-500/10 to-sky-500/10 border-cyan-500/20">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                            <Activity className="h-5 w-5 text-cyan-500" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Daily Hydration
                            </p>
                            <p className="text-sm font-medium mt-1">
                              {calculatedResults.hydrationLiters.toFixed(1)} L
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-cyan-500/20">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Ounces
                            </span>
                            <span className="font-semibold">
                              {calculatedResults.hydrationOunces} oz
                            </span>
                          </div>
                          <div className="flex justify-between text-sm mt-1">
                            <span className="text-muted-foreground">
                              Approx cups
                            </span>
                            <span className="font-semibold">
                              {Math.round(
                                calculatedResults.hydrationOunces / 8,
                              )}{' '}
                              cups
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Lifestyle Card */}
                    <Card className="bg-linear-to-br from-indigo-500/10 to-violet-500/10 border-indigo-500/20">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                            <Moon className="h-5 w-5 text-indigo-500" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Lifestyle Targets
                            </p>
                            <p className="text-sm font-medium mt-1">
                              Daily rhythm & accountability
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-indigo-500/20 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Sleep</span>
                            <span className="font-semibold">
                              {state.sleepHours} h
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Steps</span>
                            <span className="font-semibold">
                              {state.dailySteps.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Adherence
                            </span>
                            <span className="font-semibold">
                              {state.adherenceTarget}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Check-ins
                            </span>
                            <span className="font-semibold">
                              {state.checkInsPerWeek}/week
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Weight Goal Card (if not maintaining) */}
                  {state.goalType !== 'MAINTAIN' &&
                    calculatedResults.weeksToGoal > 0 && (
                      <Card className="bg-linear-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                              <Target className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Weight Goal Timeline
                              </p>
                              <p className="text-lg font-semibold">
                                {state.goalType === 'LOSE' ? 'Lose' : 'Gain'}{' '}
                                {Math.abs(
                                  state.units === 'metric'
                                    ? parseFloat(state.weightKg) -
                                        parseFloat(state.targetWeightKg)
                                    : parseFloat(state.weightLb) -
                                        parseFloat(state.targetWeightLb),
                                ).toFixed(1)}{' '}
                                {state.units === 'metric' ? 'kg' : 'lbs'}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 pt-4 border-t border-green-500/20">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Estimated Time
                              </span>
                              <span className="font-medium">
                                {calculatedResults.weeksToGoal} weeks
                              </span>
                            </div>
                            <div className="flex justify-between text-sm mt-1">
                              <span className="text-muted-foreground">
                                Target Date
                              </span>
                              <span className="font-medium">
                                {new Date(
                                  calculatedResults.targetDate,
                                ).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm mt-1">
                              <span className="text-muted-foreground">
                                Weekly Rate
                              </span>
                              <span className="font-medium">
                                {(
                                  calculatedResults.appliedWeeklyChangeLb ??
                                  state.weeklyRate
                                ).toFixed(2)}{' '}
                                lb/week
                              </span>
                            </div>
                            {calculatedResults.appliedWeeklyChangeLb !== null &&
                              calculatedResults.requestedWeeklyChangeLb !==
                                null &&
                              Math.abs(
                                calculatedResults.appliedWeeklyChangeLb -
                                  calculatedResults.requestedWeeklyChangeLb,
                              ) >= 0.01 && (
                                <div className="flex justify-between text-sm mt-1">
                                  <span className="text-muted-foreground">
                                    Requested Rate
                                  </span>
                                  <span className="font-medium">
                                    {calculatedResults.requestedWeeklyChangeLb.toFixed(
                                      2,
                                    )}{' '}
                                    lb/week
                                  </span>
                                </div>
                              )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                  {calculatedResults.guardrails.length > 0 && (
                    <Card className="border-amber-500/30 bg-amber-500/5">
                      <CardContent className="pt-4 space-y-2">
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                          Safety guardrails adjusted your targets
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Requested calories:{' '}
                          {calculatedResults.requestedCalories} cal/day
                          {' • '}
                          Applied calories: {
                            calculatedResults.targetCalories
                          }{' '}
                          cal/day
                        </p>
                        <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
                          {calculatedResults.guardrails.map((guardrail) => (
                            <li key={guardrail}>
                              {guardrail.replaceAll('_', ' ')}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Disclaimer */}
                  <p className="text-xs text-muted-foreground text-center">
                    These calculations are evidence-informed estimates and
                    include safety guardrails. Individual responses vary;
                    consult a healthcare professional before major diet or
                    exercise changes.
                  </p>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Something went wrong. Please go back and try again.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={currentStep === 1 ? () => navigate(-1) : handleBack}
          disabled={isCalculating || isSaving}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {currentStep === 1 ? 'Cancel' : 'Back'}
        </Button>

        {currentStep < STEPS.length ? (
          <Button
            onClick={handleNext}
            disabled={!canProceed() || isCalculating}
          >
            {isCalculating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleSaveGoals}
            disabled={!calculatedResults || isSaving}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Save My Goals
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
