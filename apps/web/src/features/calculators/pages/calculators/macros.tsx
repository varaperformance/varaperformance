import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  mergeStringPrefill,
  useCalculatorPrefill,
} from '@/features/calculators';
import api from '@/lib/api';

type UnitSystem = 'metric' | 'imperial';
type Sex = 'male' | 'female';
type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';
type Goal = 'lose' | 'maintain' | 'gain';
type Diet = 'balanced' | 'lowCarb' | 'highCarb' | 'keto';

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
}

interface DisplayResult {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const activityLevels = [
  {
    value: 'sedentary',
    label: 'Sedentary',
    description: 'Little or no exercise',
  },
  { value: 'light', label: 'Light', description: '1-3 days/week' },
  { value: 'moderate', label: 'Moderate', description: '3-5 days/week' },
  { value: 'active', label: 'Active', description: '6-7 days/week' },
  {
    value: 'very_active',
    label: 'Very Active',
    description: 'Very active or physical job',
  },
];

const goals = [
  { value: 'lose', label: 'Lose Weight', description: 'Caloric deficit' },
  { value: 'maintain', label: 'Maintain', description: 'Stay current' },
  { value: 'gain', label: 'Build Muscle', description: 'Caloric surplus' },
];

const diets = [
  { value: 'balanced', label: 'Balanced', split: '30/40/30 P/C/F' },
  { value: 'lowCarb', label: 'Low Carb', split: '40/25/35 P/C/F' },
  { value: 'highCarb', label: 'High Carb', split: '25/55/20 P/C/F' },
  { value: 'keto', label: 'Low Carb+', split: 'High protein, 40% fat' },
];

const MacrosCalculator = () => {
  const [units, setUnits] = useState<UnitSystem>('metric');
  const prefilledRef = useRef(false);
  const prefill = useCalculatorPrefill();
  const [sex, setSex] = useState<Sex>('male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [goal, setGoal] = useState<Goal>('maintain');
  const [diet, setDiet] = useState<Diet>('balanced');
  const [formData, setFormData] = useState({
    weightKg: '',
    weightLb: '',
    heightCm: '',
    heightFt: '',
    heightIn: '',
    age: '',
  });
  const [result, setResult] = useState<DisplayResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (prefilledRef.current || !prefill.hasPrefill) return;

    if (prefill.unitPreference) {
      setUnits(prefill.unitPreference);
    }

    setFormData((current) =>
      mergeStringPrefill(current, {
        age: prefill.age,
        weightKg: prefill.weightKg,
        weightLb: prefill.weightLb,
        heightCm: prefill.heightCm,
        heightFt: prefill.heightFt,
        heightIn: prefill.heightIn,
      }),
    );

    prefilledRef.current = true;
  }, [prefill]);

  // Map diet to macro split percentages (protein/carbs/fat)
  // fatPercent max is 40 per backend schema
  const getDietParams = (diet: Diet) => {
    switch (diet) {
      case 'balanced':
        return { proteinPerKg: 1.6, fatPercent: 30 };
      case 'lowCarb':
        return { proteinPerKg: 2.0, fatPercent: 35 };
      case 'highCarb':
        return { proteinPerKg: 1.4, fatPercent: 20 };
      case 'keto':
        return { proteinPerKg: 2.2, fatPercent: 40 }; // Max fat%, higher protein
      default:
        return { proteinPerKg: 1.6, fatPercent: 25 };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Step 1: Calculate TDEE first
      const tdeePayload =
        units === 'metric'
          ? {
              weightKg: parseFloat(formData.weightKg),
              heightCm: parseFloat(formData.heightCm),
              ageYears: parseInt(formData.age),
              gender: sex,
              activityLevel,
            }
          : {
              weightLb: parseFloat(formData.weightLb),
              heightIn:
                parseInt(formData.heightFt) * 12 +
                parseFloat(formData.heightIn),
              ageYears: parseInt(formData.age),
              gender: sex,
              activityLevel,
            };

      const tdeeResponse = await api.post<{
        success: boolean;
        data: TdeeResult;
      }>('/calculators/tdee', tdeePayload);
      const tdee = tdeeResponse.data.data.tdee;

      // Step 2: Calculate macros using TDEE
      const { proteinPerKg, fatPercent } = getDietParams(diet);
      const weight =
        units === 'metric'
          ? parseFloat(formData.weightKg)
          : parseFloat(formData.weightLb) * 0.453592;

      const macrosPayload = {
        tdee,
        goal,
        weightKg: weight,
        proteinPerKg,
        fatPercent,
      };

      const macrosResponse = await api.post<{
        success: boolean;
        data: MacrosResult;
      }>('/calculators/macros', macrosPayload);
      const data = macrosResponse.data.data;

      setResult({
        calories: data.calories,
        protein: data.proteinGrams,
        carbs: data.carbsGrams,
        fat: data.fatGrams,
      });
    } catch {
      setError('Failed to calculate macros. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border bg-card px-5 py-5 sm:px-7 sm:py-6">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-emerald-500/10" />
        <div className="relative">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link to="/calculators" className="hover:text-foreground">
              Calculators
            </Link>
            <span>/</span>
            <span>Macro Calculator</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Macro Calculator
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Calculate your daily protein, carbohydrates, and fat targets based
            on your goals and preferred diet type.
          </p>
        </div>
      </section>

      {/* Calculator */}
      <section>
        <div>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Form */}
            <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
              <CardHeader>
                <CardTitle>Your Details</CardTitle>
                <CardDescription>
                  Enter your stats and select your goal and diet preference.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Unit Toggle */}
                  <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
                    <button
                      type="button"
                      onClick={() => setUnits('metric')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        units === 'metric'
                          ? 'bg-background shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Metric
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnits('imperial')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        units === 'imperial'
                          ? 'bg-background shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Imperial
                    </button>
                  </div>

                  {/* Sex and Age */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Sex</Label>
                      <div className="flex gap-1 p-1 bg-muted rounded-lg">
                        <button
                          type="button"
                          onClick={() => setSex('male')}
                          className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            sex === 'male'
                              ? 'bg-background shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Male
                        </button>
                        <button
                          type="button"
                          onClick={() => setSex('female')}
                          className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            sex === 'female'
                              ? 'bg-background shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
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
                        value={formData.age}
                        onChange={(e) =>
                          setFormData({ ...formData, age: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  {/* Weight and Height */}
                  {units === 'metric' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="weightKg">Weight (kg)</Label>
                        <Input
                          id="weightKg"
                          type="number"
                          step="0.1"
                          placeholder="75"
                          value={formData.weightKg}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              weightKg: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="heightCm">Height (cm)</Label>
                        <Input
                          id="heightCm"
                          type="number"
                          step="0.1"
                          placeholder="175"
                          value={formData.heightCm}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              heightCm: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="weightLb">Weight (lbs)</Label>
                        <Input
                          id="weightLb"
                          type="number"
                          step="0.1"
                          placeholder="165"
                          value={formData.weightLb}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              weightLb: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Height</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            id="heightFt"
                            type="number"
                            placeholder="5 ft"
                            value={formData.heightFt}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                heightFt: e.target.value,
                              })
                            }
                            required
                          />
                          <Input
                            id="heightIn"
                            type="number"
                            step="0.1"
                            placeholder="9 in"
                            value={formData.heightIn}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                heightIn: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Activity Level */}
                  <div className="space-y-2">
                    <Label>Activity Level</Label>
                    <select
                      value={activityLevel}
                      onChange={(e) =>
                        setActivityLevel(e.target.value as ActivityLevel)
                      }
                      className="w-full rounded-lg border border-border/50 bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {activityLevels.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level.label} - {level.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Goal */}
                  <div className="space-y-2">
                    <Label>Goal</Label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {goals.map((g) => (
                        <button
                          key={g.value}
                          type="button"
                          onClick={() => setGoal(g.value as Goal)}
                          className={`p-3 rounded-lg border text-center transition-colors ${
                            goal === g.value
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/30'
                          }`}
                        >
                          <p className="font-medium text-sm">{g.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Diet Type */}
                  <div className="space-y-2">
                    <Label>Diet Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {diets.map((d) => (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => setDiet(d.value as Diet)}
                          className={`p-3 rounded-lg border text-left transition-colors ${
                            diet === d.value
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/30'
                          }`}
                        >
                          <p className="font-medium text-sm">{d.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {d.split}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Calculating...' : 'Calculate Macros'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Results */}
            <div className="space-y-6">
              {result ? (
                <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                  <CardHeader>
                    <CardTitle>Your Daily Macros</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center py-6 border-b border-border">
                      <p className="text-sm text-muted-foreground mb-2">
                        Daily Calories
                      </p>
                      <p className="text-5xl font-bold text-primary">
                        {Math.round(result.calories)}
                      </p>
                      <p className="text-muted-foreground mt-1">kcal</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="text-center p-4 bg-red-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">
                          Protein
                        </p>
                        <p className="text-3xl font-bold text-red-500">
                          {Math.round(result.protein)}
                        </p>
                        <p className="text-xs text-muted-foreground">grams</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {Math.round(
                            ((result.protein * 4) / result.calories) * 100,
                          )}
                          %
                        </p>
                      </div>
                      <div className="text-center p-4 bg-blue-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">
                          Carbs
                        </p>
                        <p className="text-3xl font-bold text-blue-500">
                          {Math.round(result.carbs)}
                        </p>
                        <p className="text-xs text-muted-foreground">grams</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {Math.round(
                            ((result.carbs * 4) / result.calories) * 100,
                          )}
                          %
                        </p>
                      </div>
                      <div className="text-center p-4 bg-yellow-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">
                          Fat
                        </p>
                        <p className="text-3xl font-bold text-yellow-500">
                          {Math.round(result.fat)}
                        </p>
                        <p className="text-xs text-muted-foreground">grams</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {Math.round(
                            ((result.fat * 9) / result.calories) * 100,
                          )}
                          %
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <p className="font-medium">Calorie breakdown:</p>
                      <div className="space-y-1 text-muted-foreground">
                        <p>
                          Protein: {Math.round(result.protein * 4)} kcal (4
                          kcal/g)
                        </p>
                        <p>
                          Carbs: {Math.round(result.carbs * 4)} kcal (4 kcal/g)
                        </p>
                        <p>Fat: {Math.round(result.fat * 9)} kcal (9 kcal/g)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="flex items-center justify-center min-h-100">
                  <div className="text-center text-muted-foreground">
                    <svg
                      className="h-12 w-12 mx-auto mb-4 opacity-50"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.125-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12"
                      />
                    </svg>
                    <p>Enter your details to calculate your macros</p>
                  </div>
                </Card>
              )}

              {/* Info Card */}
              <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">About Macros</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-3">
                  <p>
                    Macronutrients (macros) are protein, carbohydrates, and
                    fat—the nutrients your body needs in large amounts. Tracking
                    them helps optimize body composition.
                  </p>
                  <p>
                    Protein is essential for muscle; aim for at least
                    1.6-2.2g/kg bodyweight when training. Adjust carbs and fat
                    based on preference and activity level.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default MacrosCalculator;
