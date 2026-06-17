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

interface FfmiResult {
  ffmi: number;
  adjustedFfmi: number;
  category: string;
}

const FfmiCalculator = () => {
  const [units, setUnits] = useState<UnitSystem>('metric');
  const prefilledRef = useRef(false);
  const prefill = useCalculatorPrefill();
  const [formData, setFormData] = useState({
    weightKg: '',
    weightLb: '',
    heightCm: '',
    heightFt: '',
    heightIn: '',
    bodyFatPercent: '',
  });
  const [result, setResult] = useState<FfmiResult | null>(null);
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
            bodyFatPercent: parseFloat(formData.bodyFatPercent),
          }
        : {
            weightLb: parseFloat(formData.weightLb),
            heightIn:
              parseInt(formData.heightFt) * 12 + parseFloat(formData.heightIn),
            bodyFatPercent: parseFloat(formData.bodyFatPercent),
          };

    try {
      const response = await api.post<{ success: boolean; data: FfmiResult }>(
        '/calculators/ffmi',
        payload,
      );
      setResult(response.data.data);
    } catch {
      setError('Failed to calculate FFMI. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const getFfmiColor = (ffmi: number) => {
    if (ffmi < 18) return 'text-muted-foreground';
    if (ffmi < 20) return 'text-blue-500';
    if (ffmi < 22) return 'text-green-500';
    if (ffmi < 24) return 'text-yellow-500';
    if (ffmi < 26) return 'text-orange-500';
    return 'text-red-500';
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
            <span>FFMI Calculator</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            FFMI Calculator
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Calculate your Fat-Free Mass Index (FFMI) to assess your muscular
            development relative to your height. FFMI is useful for tracking
            muscle building progress.
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
                <CardTitle>Enter Your Measurements</CardTitle>
                <CardDescription>
                  You'll need to know your body fat percentage for this
                  calculation.
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

                  {units === 'metric' ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="weightKg">Weight (kg)</Label>
                        <Input
                          id="weightKg"
                          type="number"
                          step="0.1"
                          placeholder="80"
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
                          placeholder="180"
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
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="weightLb">Weight (lbs)</Label>
                        <Input
                          id="weightLb"
                          type="number"
                          step="0.1"
                          placeholder="176"
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
                          <div>
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
                            <span className="text-xs text-muted-foreground">
                              feet
                            </span>
                          </div>
                          <div>
                            <Input
                              id="heightIn"
                              type="number"
                              step="0.1"
                              placeholder="11"
                              value={formData.heightIn}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  heightIn: e.target.value,
                                })
                              }
                              required
                            />
                            <span className="text-xs text-muted-foreground">
                              inches
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="bodyFatPercent">Body Fat %</Label>
                    <Input
                      id="bodyFatPercent"
                      type="number"
                      step="0.1"
                      placeholder="15"
                      value={formData.bodyFatPercent}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bodyFatPercent: e.target.value,
                        })
                      }
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Don't know your body fat? Use our{' '}
                      <Link
                        to="/calculators/body-fat"
                        className="text-primary hover:underline"
                      >
                        Body Fat Calculator
                      </Link>
                    </p>
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Calculating...' : 'Calculate FFMI'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Results */}
            <div className="space-y-6">
              {result ? (
                <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                  <CardHeader>
                    <CardTitle>Your Results</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="text-center py-6 border-b border-border">
                        <p className="text-sm text-muted-foreground mb-2">
                          FFMI
                        </p>
                        <p
                          className={`text-5xl font-bold ${getFfmiColor(result.ffmi)}`}
                        >
                          {result.ffmi.toFixed(1)}
                        </p>
                      </div>
                      <div className="text-center py-6 border-b border-border">
                        <p className="text-sm text-muted-foreground mb-2">
                          Adjusted FFMI
                        </p>
                        <p
                          className={`text-5xl font-bold ${getFfmiColor(result.adjustedFfmi)}`}
                        >
                          {result.adjustedFfmi.toFixed(1)}
                        </p>
                      </div>
                    </div>

                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="font-semibold text-lg">{result.category}</p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">FFMI Categories</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between py-1">
                          <span className="text-muted-foreground">
                            Below average
                          </span>
                          <span className="text-muted-foreground">&lt; 18</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-blue-500">Average</span>
                          <span className="text-muted-foreground">18 - 20</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-green-500">Above average</span>
                          <span className="text-muted-foreground">20 - 22</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-yellow-500">Excellent</span>
                          <span className="text-muted-foreground">22 - 23</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-orange-500">Superior</span>
                          <span className="text-muted-foreground">23 - 26</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-red-500">
                            Suspicious (natural limit ~25)
                          </span>
                          <span className="text-muted-foreground">&gt; 26</span>
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
                        d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z"
                      />
                    </svg>
                    <p>Enter your measurements to see your FFMI</p>
                  </div>
                </Card>
              )}

              {/* Info Card */}
              <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">About FFMI</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-3">
                  <p>
                    FFMI (Fat-Free Mass Index) measures your lean mass relative
                    to your height, similar to BMI but excluding fat. It's
                    calculated as: FFMI = lean mass (kg) / height² (m).
                  </p>
                  <p>
                    The adjusted FFMI normalizes to a height of 1.8m for fair
                    comparison. Research suggests an FFMI of ~25 is the natural
                    limit for most drug-free individuals.
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

export default FfmiCalculator;
