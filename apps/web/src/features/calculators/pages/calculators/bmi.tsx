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

interface BmiResult {
  bmi: number;
  category: 'underweight' | 'normal' | 'overweight' | 'obese';
  healthyWeightRange: { min: number; max: number };
}

const BmiCalculator = () => {
  const [units, setUnits] = useState<UnitSystem>('metric');
  const prefilledRef = useRef(false);
  const prefill = useCalculatorPrefill();
  const [formData, setFormData] = useState({
    weightKg: '',
    weightLb: '',
    heightCm: '',
    heightFt: '',
    heightIn: '',
  });
  const [result, setResult] = useState<BmiResult | null>(null);
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
          }
        : {
            weightLb: parseFloat(formData.weightLb),
            // Convert feet + inches to total inches
            heightIn:
              parseInt(formData.heightFt) * 12 +
              parseFloat(formData.heightIn || '0'),
          };

    try {
      const response = await api.post<{ success: boolean; data: BmiResult }>(
        '/calculators/bmi',
        payload,
      );
      setResult(response.data.data);
    } catch (err) {
      console.error('BMI calculation error:', err);
      if (err instanceof Error && err.message.includes('Network Error')) {
        setError(
          'Cannot connect to server. Make sure the backend is running on port 3000.',
        );
      } else {
        setError('Failed to calculate BMI. Please check your inputs.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'underweight':
        return 'text-blue-500';
      case 'normal':
        return 'text-green-500';
      case 'overweight':
        return 'text-yellow-500';
      case 'obese':
        return 'text-red-500';
      default:
        return '';
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
            <span>BMI Calculator</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            BMI Calculator
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Calculate your Body Mass Index (BMI) to understand your weight
            relative to your height. BMI is a useful screening tool, though it
            doesn't directly measure body fat.
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
                  Choose your preferred unit system and enter your details.
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
                      Metric (kg/cm)
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
                      Imperial (lb/ft)
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
                    </>
                  ) : (
                    <>
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
                            <span className="text-xs text-muted-foreground">
                              inches
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Calculating...' : 'Calculate BMI'}
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
                        Your BMI
                      </p>
                      <p className="text-6xl font-bold">
                        {result.bmi.toFixed(1)}
                      </p>
                      <p
                        className={`text-lg font-medium capitalize mt-2 ${getCategoryColor(result.category)}`}
                      >
                        {result.category}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-3">
                        Healthy Weight Range
                      </p>
                      <p className="text-muted-foreground">
                        For your height, a healthy weight is between{' '}
                        <span className="font-semibold text-foreground">
                          {result.healthyWeightRange.min.toFixed(1)} kg
                        </span>{' '}
                        and{' '}
                        <span className="font-semibold text-foreground">
                          {result.healthyWeightRange.max.toFixed(1)} kg
                        </span>
                        .
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">BMI Categories</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between py-1">
                          <span className="text-blue-500">Underweight</span>
                          <span className="text-muted-foreground">
                            &lt; 18.5
                          </span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-green-500">Normal</span>
                          <span className="text-muted-foreground">
                            18.5 - 24.9
                          </span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-yellow-500">Overweight</span>
                          <span className="text-muted-foreground">
                            25 - 29.9
                          </span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-red-500">Obese</span>
                          <span className="text-muted-foreground">&ge; 30</span>
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
                    <p>Enter your measurements to see your BMI results</p>
                  </div>
                </Card>
              )}

              {/* Info Card */}
              <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">About BMI</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-3">
                  <p>
                    Body Mass Index (BMI) is calculated by dividing weight in
                    kilograms by the square of height in meters: BMI = kg/m².
                  </p>
                  <p>
                    While BMI is a useful screening tool, it doesn't account for
                    muscle mass, bone density, or fat distribution. Individuals
                    with higher muscle mass may have a high BMI while being
                    healthy.
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

export default BmiCalculator;
