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

interface WilksResult {
  coefficient: number;
  wilksScore: number;
}

const WilksCalculator = () => {
  const [units, setUnits] = useState<UnitSystem>('metric');
  const prefilledRef = useRef(false);
  const prefill = useCalculatorPrefill();
  const [sex, setSex] = useState<Sex>('male');
  const [formData, setFormData] = useState({
    bodyweightKg: '',
    bodyweightLb: '',
    totalKg: '',
    totalLb: '',
  });
  const [result, setResult] = useState<WilksResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (prefilledRef.current || !prefill.hasPrefill) return;

    if (prefill.unitPreference) {
      setUnits(prefill.unitPreference);
    }

    setFormData((current) =>
      mergeStringPrefill(current, {
        bodyweightKg: prefill.weightKg,
        bodyweightLb: prefill.weightLb,
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
            bodyweightKg: parseFloat(formData.bodyweightKg),
            totalKg: parseFloat(formData.totalKg),
            gender: sex,
          }
        : {
            bodyweightLb: parseFloat(formData.bodyweightLb),
            totalLb: parseFloat(formData.totalLb),
            gender: sex,
          };

    try {
      const response = await api.post<{ success: boolean; data: WilksResult }>(
        '/calculators/wilks',
        payload,
      );
      setResult(response.data.data);
    } catch {
      setError('Failed to calculate Wilks score. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreRating = (score: number) => {
    if (score < 300)
      return { label: 'Beginner', color: 'text-muted-foreground' };
    if (score < 350) return { label: 'Intermediate', color: 'text-blue-500' };
    if (score < 400) return { label: 'Advanced', color: 'text-green-500' };
    if (score < 450) return { label: 'Elite', color: 'text-yellow-500' };
    if (score < 500) return { label: 'Pro', color: 'text-orange-500' };
    return { label: 'World Class', color: 'text-red-500' };
  };

  const unit = units === 'metric' ? 'kg' : 'lb';

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
            <span>Wilks Calculator</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Wilks Score Calculator
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Calculate your Wilks coefficient to compare powerlifting totals
            across different bodyweights. The classic formula for relative
            strength.
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
                <CardTitle>Enter Your Lifts</CardTitle>
                <CardDescription>
                  Input your bodyweight and powerlifting total (S+B+D).
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

                  {/* Sex Toggle */}
                  <div className="space-y-2">
                    <Label>Sex</Label>
                    <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
                      <button
                        type="button"
                        onClick={() => setSex('male')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
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
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
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
                    <Label htmlFor="bodyweight">Bodyweight ({unit})</Label>
                    <Input
                      id="bodyweight"
                      type="number"
                      step="0.1"
                      placeholder={units === 'metric' ? '82.5' : '181'}
                      value={
                        units === 'metric'
                          ? formData.bodyweightKg
                          : formData.bodyweightLb
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [units === 'metric'
                            ? 'bodyweightKg'
                            : 'bodyweightLb']: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="total">Total ({unit})</Label>
                    <Input
                      id="total"
                      type="number"
                      step="0.5"
                      placeholder={units === 'metric' ? '600' : '1320'}
                      value={
                        units === 'metric' ? formData.totalKg : formData.totalLb
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [units === 'metric' ? 'totalKg' : 'totalLb']:
                            e.target.value,
                        })
                      }
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Sum of your best Squat + Bench + Deadlift
                    </p>
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Calculating...' : 'Calculate Wilks'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Results */}
            <div className="space-y-6">
              {result ? (
                <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                  <CardHeader>
                    <CardTitle>Your Wilks Score</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center py-8 border-b border-border">
                      <p className="text-sm text-muted-foreground mb-2">
                        Wilks Score
                      </p>
                      <p className="text-6xl font-bold text-primary">
                        {result.wilksScore.toFixed(2)}
                      </p>
                      <p
                        className={`text-lg font-medium mt-2 ${getScoreRating(result.wilksScore).color}`}
                      >
                        {getScoreRating(result.wilksScore).label}
                      </p>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">
                        Coefficient
                      </p>
                      <p className="text-2xl font-bold">
                        {result.coefficient.toFixed(6)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Score Ranges</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between py-1">
                          <span className="text-muted-foreground">
                            Beginner
                          </span>
                          <span>&lt; 300</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-blue-500">Intermediate</span>
                          <span>300 - 350</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-green-500">Advanced</span>
                          <span>350 - 400</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-yellow-500">Elite</span>
                          <span>400 - 450</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-orange-500">Pro</span>
                          <span>450 - 500</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-red-500">World Class</span>
                          <span>&gt; 500</span>
                        </div>
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
                        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                      />
                    </svg>
                    <p>Enter your details to calculate your Wilks score</p>
                  </div>
                </Card>
              )}

              {/* Info Card */}
              <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">About Wilks Score</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-3">
                  <p>
                    The Wilks coefficient allows comparison of powerlifting
                    totals across different bodyweights. Developed by Robert
                    Wilks in the 1990s.
                  </p>
                  <p>
                    While still widely used, the DOTS score has become the more
                    modern standard. Try our{' '}
                    <Link
                      to="/calculators/dots"
                      className="text-primary hover:underline"
                    >
                      DOTS Calculator
                    </Link>{' '}
                    for comparison.
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

export default WilksCalculator;
