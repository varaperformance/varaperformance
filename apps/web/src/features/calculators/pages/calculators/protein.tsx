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
type Goal = 'lose' | 'maintain' | 'gain';
type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';

interface ProteinResult {
  dailyProteinGrams: number;
  gramsPerKg: number;
  recommendation: string;
}

const goals: { value: Goal; label: string; description: string }[] = [
  {
    value: 'lose',
    label: 'Lose Weight',
    description: 'Caloric deficit, preserve muscle',
  },
  { value: 'maintain', label: 'Maintain', description: 'Stay current weight' },
  {
    value: 'gain',
    label: 'Build Muscle',
    description: 'Caloric surplus, maximize growth',
  },
];

const activityLevels: {
  value: ActivityLevel;
  label: string;
  description: string;
}[] = [
  {
    value: 'sedentary',
    label: 'Sedentary',
    description: 'Little to no exercise',
  },
  { value: 'light', label: 'Light', description: 'Exercise 1-3 days/week' },
  {
    value: 'moderate',
    label: 'Moderate',
    description: 'Exercise 3-5 days/week',
  },
  {
    value: 'active',
    label: 'Active',
    description: 'Hard exercise 6-7 days/week',
  },
  {
    value: 'very_active',
    label: 'Very Active',
    description: 'Very active or physical job',
  },
];

const ProteinCalculator = () => {
  const [units, setUnits] = useState<UnitSystem>('metric');
  const prefilledRef = useRef(false);
  const prefill = useCalculatorPrefill();
  const [goal, setGoal] = useState<Goal>('maintain');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [formData, setFormData] = useState({
    weightKg: '',
    weightLb: '',
  });
  const [result, setResult] = useState<ProteinResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (prefilledRef.current || !prefill.hasPrefill) return;

    if (prefill.unitPreference) {
      setUnits(prefill.unitPreference);
    }

    setFormData((current) =>
      mergeStringPrefill(current, {
        weightKg: prefill.weightKg,
        weightLb: prefill.weightLb,
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
        ? { weightKg: parseFloat(formData.weightKg), goal, activityLevel }
        : { weightLb: parseFloat(formData.weightLb), goal, activityLevel };

    try {
      const response = await api.post<{
        success: boolean;
        data: ProteinResult;
      }>('/calculators/protein', payload);
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
            <span>Protein Calculator</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Protein Calculator
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Calculate your daily protein needs based on your weight and fitness
            goals.
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
                  Enter your weight and select your goal.
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
                      Metric (kg)
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
                      Imperial (lb)
                    </button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weight">
                      Weight ({units === 'metric' ? 'kg' : 'lbs'})
                    </Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      placeholder={units === 'metric' ? '75' : '165'}
                      value={
                        units === 'metric'
                          ? formData.weightKg
                          : formData.weightLb
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [units === 'metric' ? 'weightKg' : 'weightLb']:
                            e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  {/* Goal Selection */}
                  <div className="space-y-3">
                    <Label>Goal</Label>
                    <div className="space-y-2">
                      {goals.map((g) => (
                        <label
                          key={g.value}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            goal === g.value
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/30'
                          }`}
                        >
                          <input
                            type="radio"
                            name="goal"
                            value={g.value}
                            checked={goal === g.value}
                            onChange={(e) => setGoal(e.target.value as Goal)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{g.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {g.description}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Activity Level Selection */}
                  <div className="space-y-3">
                    <Label>Activity Level</Label>
                    <div className="space-y-2">
                      {activityLevels.map((level) => (
                        <label
                          key={level.value}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
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
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{level.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {level.description}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Calculating...' : 'Calculate Protein'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Results */}
            <div className="space-y-6">
              {result ? (
                <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                  <CardHeader>
                    <CardTitle>Your Daily Protein</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center py-8 border-b border-border">
                      <p className="text-sm text-muted-foreground mb-2">
                        Recommended Daily Intake
                      </p>
                      <p className="text-6xl font-bold text-primary">
                        {Math.round(result.dailyProteinGrams)}
                      </p>
                      <p className="text-lg text-muted-foreground mt-2">
                        grams
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">
                          Per kg Bodyweight
                        </p>
                        <p className="text-2xl font-bold">
                          {result.gramsPerKg}g/kg
                        </p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">
                          Recommendation
                        </p>
                        <p className="text-lg font-medium">
                          {result.recommendation}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">
                        Protein sources:
                      </p>
                      <ul className="space-y-1">
                        <li>• Chicken breast: ~31g per 100g</li>
                        <li>• Eggs: ~6g per egg</li>
                        <li>• Greek yogurt: ~10g per 100g</li>
                        <li>• Whey protein: ~25g per scoop</li>
                      </ul>
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
                        d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513"
                      />
                    </svg>
                    <p>Enter your details to calculate protein needs</p>
                  </div>
                </Card>
              )}

              {/* Info Card */}
              <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">
                    About Protein Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-3">
                  <p>
                    Protein is essential for muscle repair and growth. Research
                    suggests 1.6-2.2g/kg bodyweight for those training for
                    muscle gain.
                  </p>
                  <p>
                    Spread protein intake across 4-6 meals for optimal muscle
                    protein synthesis, with 20-40g per meal being ideal.
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

export default ProteinCalculator;
