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

interface BodyFatResult {
  bodyFatPercent: number;
  category: string;
  leanMassKg: number;
  fatMassKg: number;
}

const BodyFatCalculator = () => {
  const [units, setUnits] = useState<UnitSystem>('metric');
  const prefilledRef = useRef(false);
  const prefill = useCalculatorPrefill();
  const [sex, setSex] = useState<Sex>('male');
  const [formData, setFormData] = useState({
    weightKg: '',
    weightLb: '',
    heightCm: '',
    heightFt: '',
    heightIn: '',
    waistCm: '',
    waistIn: '',
    neckCm: '',
    neckIn: '',
    hipCm: '',
    hipIn: '',
  });
  const [result, setResult] = useState<BodyFatResult | null>(null);
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

    const basePayload = { gender: sex };

    const payload =
      units === 'metric'
        ? {
            ...basePayload,
            weightKg: parseFloat(formData.weightKg),
            heightCm: parseFloat(formData.heightCm),
            waistCm: parseFloat(formData.waistCm),
            neckCm: parseFloat(formData.neckCm),
            ...(sex === 'female' && { hipCm: parseFloat(formData.hipCm) }),
          }
        : {
            ...basePayload,
            weightLb: parseFloat(formData.weightLb),
            heightIn:
              parseInt(formData.heightFt) * 12 + parseFloat(formData.heightIn),
            waistIn: parseFloat(formData.waistIn),
            neckIn: parseFloat(formData.neckIn),
            ...(sex === 'female' && { hipIn: parseFloat(formData.hipIn) }),
          };

    try {
      const response = await api.post<{
        success: boolean;
        data: BodyFatResult;
      }>('/calculators/body-fat/navy', payload);
      setResult(response.data.data);
    } catch {
      setError('Failed to calculate body fat. Please check your inputs.');
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
            <span>Body Fat Calculator</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Body Fat Calculator
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Estimate your body fat percentage using the U.S. Navy method. This
            calculation uses circumference measurements of your neck, waist, and
            hips (for women).
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
                  Measure at the narrowest point for neck, at navel level for
                  waist, and widest point for hips.
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

                  {units === 'metric' ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="weightKg">Weight (kg)</Label>
                          <Input
                            id="weightKg"
                            type="number"
                            step="0.1"
                            placeholder="70"
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
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="neckCm">Neck (cm)</Label>
                          <Input
                            id="neckCm"
                            type="number"
                            step="0.1"
                            placeholder="38"
                            value={formData.neckCm}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                neckCm: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="waistCm">Waist (cm)</Label>
                          <Input
                            id="waistCm"
                            type="number"
                            step="0.1"
                            placeholder="85"
                            value={formData.waistCm}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                waistCm: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                      </div>
                      {sex === 'female' && (
                        <div className="space-y-2">
                          <Label htmlFor="hipCm">Hip (cm)</Label>
                          <Input
                            id="hipCm"
                            type="number"
                            step="0.1"
                            placeholder="100"
                            value={formData.hipCm}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                hipCm: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="weightLb">Weight (lbs)</Label>
                          <Input
                            id="weightLb"
                            type="number"
                            step="0.1"
                            placeholder="154"
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
                          <div className="grid grid-cols-2 gap-2">
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
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="neckIn">Neck (inches)</Label>
                          <Input
                            id="neckIn"
                            type="number"
                            step="0.1"
                            placeholder="15"
                            value={formData.neckIn}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                neckIn: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="waistIn">Waist (inches)</Label>
                          <Input
                            id="waistIn"
                            type="number"
                            step="0.1"
                            placeholder="34"
                            value={formData.waistIn}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                waistIn: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                      </div>
                      {sex === 'female' && (
                        <div className="space-y-2">
                          <Label htmlFor="hipIn">Hip (inches)</Label>
                          <Input
                            id="hipIn"
                            type="number"
                            step="0.1"
                            placeholder="40"
                            value={formData.hipIn}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                hipIn: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                      )}
                    </>
                  )}

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Calculating...' : 'Calculate Body Fat'}
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
                    <div className="text-center py-6 border-b border-border">
                      <p className="text-sm text-muted-foreground mb-2">
                        Body Fat Percentage
                      </p>
                      <p className="text-6xl font-bold">
                        {result.bodyFatPercent.toFixed(1)}%
                      </p>
                      <p className="text-lg font-medium mt-2 text-primary">
                        {result.category}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">
                          Lean Mass
                        </p>
                        <p className="text-2xl font-bold">
                          {result.leanMassKg.toFixed(1)} kg
                        </p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">
                          Fat Mass
                        </p>
                        <p className="text-2xl font-bold">
                          {result.fatMassKg.toFixed(1)} kg
                        </p>
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
                    <p>Enter your measurements to see your results</p>
                  </div>
                </Card>
              )}

              {/* Info Card */}
              <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">
                    About the Navy Method
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-3">
                  <p>
                    The U.S. Navy body fat formula uses circumference
                    measurements to estimate body fat percentage. It's a
                    practical method that correlates well with more
                    sophisticated techniques.
                  </p>
                  <p>
                    For best accuracy, measure at the same time each day, use a
                    flexible tape measure, and keep the tape snug but not
                    compressing the skin.
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

export default BodyFatCalculator;
