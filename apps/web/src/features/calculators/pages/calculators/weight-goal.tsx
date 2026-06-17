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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  mergeStringPrefill,
  useCalculatorPrefill,
} from '@/features/calculators';
import api from '@/lib/api';

type UnitSystem = 'metric' | 'imperial';

interface WeightGoalResult {
  weeksToGoal: number;
  targetDate: string;
  weeklyChangeKg: number;
  totalChangeKg: number;
}

export default function WeightGoalCalculator() {
  const [units, setUnits] = useState<UnitSystem>('imperial');
  const prefilledRef = useRef(false);
  const prefill = useCalculatorPrefill();
  const [formData, setFormData] = useState({
    currentWeightKg: '',
    targetWeightKg: '',
    weeklyChangeKg: '',
    currentWeightLb: '',
    targetWeightLb: '',
    weeklyChangeLb: '',
  });
  const [result, setResult] = useState<WeightGoalResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (prefilledRef.current || !prefill.hasPrefill) return;

    if (prefill.unitPreference) {
      setUnits(prefill.unitPreference);
    }

    setFormData((current) =>
      mergeStringPrefill(current, {
        currentWeightKg: prefill.weightKg,
        currentWeightLb: prefill.weightLb,
      }),
    );

    prefilledRef.current = true;
  }, [prefill]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload: Record<string, number> = {};

      if (units === 'metric') {
        payload.currentWeightKg = parseFloat(formData.currentWeightKg);
        payload.targetWeightKg = parseFloat(formData.targetWeightKg);
        if (formData.weeklyChangeKg) {
          payload.weeklyChangeKg = parseFloat(formData.weeklyChangeKg);
        }
      } else {
        payload.currentWeightLb = parseFloat(formData.currentWeightLb);
        payload.targetWeightLb = parseFloat(formData.targetWeightLb);
        if (formData.weeklyChangeLb) {
          payload.weeklyChangeLb = parseFloat(formData.weeklyChangeLb);
        }
      }

      const response = await api.post<{
        success: boolean;
        data: WeightGoalResult;
      }>('/calculators/weight-goal-timeline', payload);
      setResult(response.data.data);
    } catch (err) {
      console.error('Weight goal calculation error:', err);
      setError('Failed to calculate. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
            <span>Weight Goal Timeline</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Weight Goal Timeline
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Calculate how long it will take to reach your target weight with
            sustainable, healthy weight change rates. Set realistic expectations
            for your fitness journey.
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
                <CardTitle>Enter Your Weight Goals</CardTitle>
                <CardDescription>
                  Input your current and target weights to calculate your
                  timeline.
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

                  {units === 'metric' ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="currentWeightKg">
                            Current Weight (kg)
                          </Label>
                          <Input
                            id="currentWeightKg"
                            type="number"
                            step="0.1"
                            value={formData.currentWeightKg}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                currentWeightKg: e.target.value,
                              })
                            }
                            placeholder="80"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="targetWeightKg">
                            Target Weight (kg)
                          </Label>
                          <Input
                            id="targetWeightKg"
                            type="number"
                            step="0.1"
                            value={formData.targetWeightKg}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                targetWeightKg: e.target.value,
                              })
                            }
                            placeholder="70"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="weeklyChangeKg">
                          Weekly Change (kg) - Optional
                        </Label>
                        <Input
                          id="weeklyChangeKg"
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="1.0"
                          value={formData.weeklyChangeKg}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              weeklyChangeKg: e.target.value,
                            })
                          }
                          placeholder="0.5"
                        />
                        <p className="text-sm text-muted-foreground">
                          Default: 0.5 kg/week. Safe range: 0.1-1.0 kg/week.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="currentWeightLb">
                            Current Weight (lb)
                          </Label>
                          <Input
                            id="currentWeightLb"
                            type="number"
                            step="0.1"
                            value={formData.currentWeightLb}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                currentWeightLb: e.target.value,
                              })
                            }
                            placeholder="176"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="targetWeightLb">
                            Target Weight (lb)
                          </Label>
                          <Input
                            id="targetWeightLb"
                            type="number"
                            step="0.1"
                            value={formData.targetWeightLb}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                targetWeightLb: e.target.value,
                              })
                            }
                            placeholder="154"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="weeklyChangeLb">
                          Weekly Change (lb) - Optional
                        </Label>
                        <Input
                          id="weeklyChangeLb"
                          type="number"
                          step="0.1"
                          min="0.2"
                          max="2.2"
                          value={formData.weeklyChangeLb}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              weeklyChangeLb: e.target.value,
                            })
                          }
                          placeholder="1"
                        />
                        <p className="text-sm text-muted-foreground">
                          Default: ~1 lb/week. Safe range: 0.5-2 lb/week.
                        </p>
                      </div>
                    </>
                  )}

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Calculating...' : 'Calculate Timeline'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Results */}
            <div className="space-y-6">
              {result ? (
                <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                  <CardHeader>
                    <CardTitle>Your Weight Journey</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center py-6 border-b border-border">
                      <p className="text-sm text-muted-foreground mb-2">
                        Time to Goal
                      </p>
                      <p className="text-6xl font-bold">{result.weeksToGoal}</p>
                      <p className="text-muted-foreground">weeks</p>
                      <p className="text-lg font-medium mt-4 text-primary">
                        Target: {formatDate(result.targetDate)}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">
                          Total Change
                        </p>
                        <p className="text-2xl font-bold">
                          {Math.abs(result.totalChangeKg).toFixed(1)}
                        </p>
                        <p className="text-sm text-muted-foreground">kg</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">
                          Weekly Rate
                        </p>
                        <p className="text-2xl font-bold">
                          {result.weeklyChangeKg.toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">kg/week</p>
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
                        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                      />
                    </svg>
                    <p>Enter your goals to see your weight timeline</p>
                  </div>
                </Card>
              )}

              {/* Info Card */}
              <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">
                    About Weight Change
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-3">
                  <p>
                    A safe rate of weight change is generally 0.5-1 kg (1-2 lb)
                    per week for sustainable, long-term results. Faster rates
                    may lead to muscle loss.
                  </p>
                  <p>
                    This timeline is an estimate based on consistent weekly
                    progress. Actual results may vary based on adherence,
                    metabolism, and other factors.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
