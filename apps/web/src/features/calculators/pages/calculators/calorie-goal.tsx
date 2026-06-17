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

interface CalorieGoalResult {
  tdee: number;
  targetCalories: number;
  deficit: number;
  surplus: number;
  weeklyChangeKg: number;
}

const activityLevels: {
  value: ActivityLevel;
  label: string;
  description: string;
}[] = [
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

const goals: { value: Goal; label: string; description: string }[] = [
  { value: 'lose', label: 'Lose Weight', description: 'Caloric deficit' },
  { value: 'maintain', label: 'Maintain', description: 'Stay current weight' },
  { value: 'gain', label: 'Gain Weight', description: 'Caloric surplus' },
];

const deficitOptions = [
  { value: 250, label: 'Slow', description: '~0.25 kg/week' },
  { value: 500, label: 'Moderate', description: '~0.5 kg/week' },
  { value: 750, label: 'Aggressive', description: '~0.75 kg/week' },
  { value: 1000, label: 'Very Aggressive', description: '~1 kg/week' },
];

const CalorieGoalCalculator = () => {
  const [units, setUnits] = useState<UnitSystem>('metric');
  const prefilledRef = useRef(false);
  const prefill = useCalculatorPrefill();
  const [sex, setSex] = useState<Sex>('male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [goal, setGoal] = useState<Goal>('lose');
  const [deficitSurplus, setDeficitSurplus] = useState(500);
  const [formData, setFormData] = useState({
    weightKg: '',
    weightLb: '',
    heightCm: '',
    heightFt: '',
    heightIn: '',
    age: '',
  });
  const [result, setResult] = useState<CalorieGoalResult | null>(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload =
      units === 'metric'
        ? {
            weightKg: parseFloat(formData.weightKg),
            heightCm: parseFloat(formData.heightCm),
            ageYears: parseInt(formData.age),
            gender: sex,
            activityLevel,
            goal,
            deficitSurplus: goal === 'maintain' ? 0 : deficitSurplus,
          }
        : {
            weightLb: parseFloat(formData.weightLb),
            heightIn:
              parseInt(formData.heightFt) * 12 + parseFloat(formData.heightIn),
            ageYears: parseInt(formData.age),
            gender: sex,
            activityLevel,
            goal,
            deficitSurplus: goal === 'maintain' ? 0 : deficitSurplus,
          };

    try {
      const response = await api.post<{
        success: boolean;
        data: CalorieGoalResult;
      }>('/calculators/calorie-goal', payload);
      setResult(response.data.data);
    } catch {
      setError('Failed to calculate. Please check your inputs.');
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
            <span>Calorie Goal Calculator</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Calorie Goal Calculator
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Calculate your daily calorie target based on your weight goals. Set
            a realistic deficit or surplus to achieve sustainable results.
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
                <CardTitle>Enter Your Details</CardTitle>
                <CardDescription>
                  We'll calculate your maintenance calories and adjust for your
                  goal.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Unit Toggle */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setUnits('metric')}
                      className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        units === 'metric'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      Metric (kg/cm)
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnits('imperial')}
                      className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        units === 'imperial'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      Imperial (lb/ft)
                    </button>
                  </div>

                  {/* Sex Selection */}
                  <div className="space-y-2">
                    <Label>Sex</Label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSex('male')}
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          sex === 'male'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        Male
                      </button>
                      <button
                        type="button"
                        onClick={() => setSex('female')}
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          sex === 'female'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        Female
                      </button>
                    </div>
                  </div>

                  {/* Weight & Height */}
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
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="weightLb">Weight (lb)</Label>
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
                        <Label htmlFor="heightFt">Height (ft)</Label>
                        <Input
                          id="heightFt"
                          type="number"
                          placeholder="5"
                          value={formData.heightFt}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              heightFt: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="heightIn">Height (in)</Label>
                        <Input
                          id="heightIn"
                          type="number"
                          step="0.1"
                          placeholder="9"
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
                  )}

                  {/* Age */}
                  <div className="space-y-2">
                    <Label htmlFor="age">Age (years)</Label>
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

                  {/* Activity Level */}
                  <div className="space-y-3">
                    <Label>Activity Level</Label>
                    <div className="space-y-2">
                      {activityLevels.map((level) => (
                        <label
                          key={level.value}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            activityLevel === level.value
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/30'
                          }`}
                        >
                          <input
                            type="radio"
                            name="activityLevel"
                            value={level.value}
                            checked={activityLevel === level.value}
                            onChange={(e) =>
                              setActivityLevel(e.target.value as ActivityLevel)
                            }
                          />
                          <div>
                            <p className="font-medium text-sm">{level.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {level.description}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Goal */}
                  <div className="space-y-3">
                    <Label>Goal</Label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {goals.map((g) => (
                        <button
                          key={g.value}
                          type="button"
                          onClick={() => setGoal(g.value)}
                          className={`p-3 rounded-lg border text-center transition-colors ${
                            goal === g.value
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/30'
                          }`}
                        >
                          <p className="font-medium text-sm">{g.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {g.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Deficit/Surplus Amount */}
                  {goal !== 'maintain' && (
                    <div className="space-y-3">
                      <Label>
                        Weekly {goal === 'lose' ? 'Deficit' : 'Surplus'}
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        {deficitOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setDeficitSurplus(option.value)}
                            className={`p-3 rounded-lg border text-center transition-colors ${
                              deficitSurplus === option.value
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/30'
                            }`}
                          >
                            <p className="font-medium text-sm">
                              {option.label}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {option.description}
                            </p>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Daily {goal === 'lose' ? 'deficit' : 'surplus'}:{' '}
                        {deficitSurplus} calories
                      </p>
                    </div>
                  )}

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Calculating...' : 'Calculate Calorie Goal'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Results */}
            <div className="space-y-6">
              {result ? (
                <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                  <CardHeader>
                    <CardTitle>Your Calorie Target</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Main Result */}
                    <div className="text-center py-8 border-b border-border">
                      <p className="text-sm text-muted-foreground mb-2">
                        Daily Calorie Goal
                      </p>
                      <p className="text-6xl font-bold text-primary">
                        {result.targetCalories.toLocaleString()}
                      </p>
                      <p className="text-lg text-muted-foreground mt-2">
                        calories/day
                      </p>
                    </div>

                    {/* Breakdown */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">
                          Maintenance (TDEE)
                        </p>
                        <p className="text-2xl font-bold">
                          {result.tdee.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          calories/day
                        </p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">
                          {result.deficit > 0
                            ? 'Daily Deficit'
                            : result.surplus > 0
                              ? 'Daily Surplus'
                              : 'Adjustment'}
                        </p>
                        <p className="text-2xl font-bold">
                          {result.deficit > 0
                            ? `-${result.deficit}`
                            : result.surplus > 0
                              ? `+${result.surplus}`
                              : '0'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          calories
                        </p>
                      </div>
                    </div>

                    {/* Weekly Change */}
                    {result.weeklyChangeKg > 0 && (
                      <div className="p-4 bg-primary/5 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground mb-1">
                          Estimated Weekly Change
                        </p>
                        <p className="text-xl font-bold text-primary">
                          {result.deficit > 0 ? '-' : '+'}
                          {result.weeklyChangeKg} kg
                          <span className="text-sm font-normal text-muted-foreground ml-2">
                            ({(result.weeklyChangeKg * 2.205).toFixed(1)} lb)
                          </span>
                        </p>
                      </div>
                    )}

                    {/* Tips */}
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">
                        Tips for success:
                      </p>
                      <ul className="space-y-1">
                        {goal === 'lose' && (
                          <>
                            <li>
                              • Prioritize protein to preserve muscle mass
                            </li>
                            <li>
                              • Don't go below 1200 cal (women) or 1500 cal
                              (men)
                            </li>
                            <li>• Track your intake for at least 2 weeks</li>
                          </>
                        )}
                        {goal === 'gain' && (
                          <>
                            <li>• Combine with resistance training</li>
                            <li>
                              • Aim for 1.6-2.2g protein per kg bodyweight
                            </li>
                            <li>• Expect some fat gain alongside muscle</li>
                          </>
                        )}
                        {goal === 'maintain' && (
                          <>
                            <li>• Monitor weight weekly, not daily</li>
                            <li>
                              • Adjust if weight changes by 1+ kg over 2 weeks
                            </li>
                            <li>• Stay consistent with activity levels</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="flex items-center justify-center min-h-100">
                  <div className="text-center text-muted-foreground">
                    <p className="text-lg">Enter your details to calculate</p>
                    <p className="text-sm">
                      Your calorie goal will appear here
                    </p>
                  </div>
                </Card>
              )}

              {/* Info Card */}
              <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">About Calorie Goals</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-3">
                  <p>
                    Your calorie goal is based on your Total Daily Energy
                    Expenditure (TDEE) adjusted for your weight goal.
                  </p>
                  <p>
                    <strong>Weight loss:</strong> A 500 calorie daily deficit
                    leads to approximately 0.5 kg (1 lb) of weight loss per
                    week.
                  </p>
                  <p>
                    <strong>Weight gain:</strong> A moderate surplus of 300-500
                    calories supports muscle growth while minimizing fat gain.
                  </p>
                  <p>
                    <strong>Note:</strong> These are estimates. Track your
                    progress and adjust based on actual results over 2-3 weeks.
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

export default CalorieGoalCalculator;
