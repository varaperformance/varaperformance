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
type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';

interface WaterIntakeResult {
  dailyLiters: number;
  dailyOunces: number;
}

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
  {
    value: 'light',
    label: 'Light',
    description: 'Light exercise/sports 1-3 days/week',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    description: 'Moderate exercise 3-5 days/week',
  },
  {
    value: 'active',
    label: 'Active',
    description: 'Hard exercise 6-7 days/week',
  },
  {
    value: 'very_active',
    label: 'Very Active',
    description: 'Very hard exercise, physical job',
  },
];

const WaterCalculator = () => {
  const [units, setUnits] = useState<UnitSystem>('metric');
  const prefilledRef = useRef(false);
  const prefill = useCalculatorPrefill();
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [formData, setFormData] = useState({
    weightKg: '',
    weightLb: '',
  });
  const [result, setResult] = useState<WaterIntakeResult | null>(null);
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
        ? { weightKg: parseFloat(formData.weightKg), activityLevel }
        : { weightLb: parseFloat(formData.weightLb), activityLevel };

    try {
      const response = await api.post<{
        success: boolean;
        data: WaterIntakeResult;
      }>('/calculators/water-intake', payload);
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
            <span>Water Intake</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Water Intake Calculator
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Calculate how much water you should drink daily based on your weight
            and activity level.
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
                  Enter your weight and activity level.
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

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Calculating...' : 'Calculate Water Intake'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Results */}
            <div className="space-y-6">
              {result ? (
                <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                  <CardHeader>
                    <CardTitle>Your Daily Water Intake</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center py-8 border-b border-border">
                      <p className="text-sm text-muted-foreground mb-2">
                        Recommended Daily Intake
                      </p>
                      <p className="text-6xl font-bold text-primary">
                        {result.dailyLiters.toFixed(1)}
                      </p>
                      <p className="text-lg text-muted-foreground mt-2">
                        liters
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-500/10 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">Ounces</p>
                        <p className="text-2xl font-bold">
                          {Math.round(result.dailyOunces)} oz
                        </p>
                      </div>
                      <div className="p-4 bg-blue-500/10 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">Cups</p>
                        <p className="text-2xl font-bold">
                          {Math.round(result.dailyOunces / 8)} cups
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">
                        Tips for staying hydrated:
                      </p>
                      <ul className="space-y-1">
                        <li>• Drink a glass of water with each meal</li>
                        <li>• Carry a water bottle throughout the day</li>
                        <li>• Drink more during and after exercise</li>
                        <li>• Increase intake in hot weather</li>
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
                        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                      />
                    </svg>
                    <p>Enter your details to calculate water intake</p>
                  </div>
                </Card>
              )}

              {/* Info Card */}
              <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">About Hydration</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-3">
                  <p>
                    Proper hydration is essential for performance, recovery, and
                    overall health. Even mild dehydration can impair physical
                    and cognitive performance.
                  </p>
                  <p>
                    Signs of good hydration include light-colored urine and
                    consistent energy levels. Increase intake during exercise,
                    hot weather, or illness.
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

export default WaterCalculator;
