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
type Formula = 'mifflin' | 'harris';

interface BmrResult {
  bmr: number;
  formula: string;
}

const BmrCalculator = () => {
  const [units, setUnits] = useState<UnitSystem>('metric');
  const prefilledRef = useRef(false);
  const prefill = useCalculatorPrefill();
  const [sex, setSex] = useState<Sex>('male');
  const [formula, setFormula] = useState<Formula>('mifflin');
  const [formData, setFormData] = useState({
    weightKg: '',
    weightLb: '',
    heightCm: '',
    heightFt: '',
    heightIn: '',
    age: '',
  });
  const [result, setResult] = useState<BmrResult | null>(null);
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
            formula,
          }
        : {
            weightLb: parseFloat(formData.weightLb),
            heightIn:
              parseInt(formData.heightFt) * 12 + parseFloat(formData.heightIn),
            ageYears: parseInt(formData.age),
            gender: sex,
            formula,
          };

    try {
      const response = await api.post<{ success: boolean; data: BmrResult }>(
        '/calculators/bmr',
        payload,
      );
      setResult(response.data.data);
    } catch {
      setError('Failed to calculate BMR. Please check your inputs.');
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
            <span>BMR Calculator</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            BMR Calculator
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Calculate your Basal Metabolic Rate (BMR) - the number of calories
            your body burns at complete rest. This is your baseline for
            calculating daily calorie needs.
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
                  Your BMR depends on age, sex, height, and weight.
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

                  {units === 'metric' ? (
                    <>
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
                    </>
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

                  {/* Formula Selection */}
                  <div className="space-y-2">
                    <Label>Formula</Label>
                    <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
                      <button
                        type="button"
                        onClick={() => setFormula('mifflin')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          formula === 'mifflin'
                            ? 'bg-background shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Mifflin-St Jeor
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormula('harris')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          formula === 'harris'
                            ? 'bg-background shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Harris-Benedict
                      </button>
                    </div>
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Calculating...' : 'Calculate BMR'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Results */}
            <div className="space-y-6">
              {result ? (
                <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                  <CardHeader>
                    <CardTitle>Your Basal Metabolic Rate</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center py-8 border-b border-border">
                      <p className="text-sm text-muted-foreground mb-2">
                        Calories burned at rest per day
                      </p>
                      <p className="text-6xl font-bold text-primary">
                        {Math.round(result.bmr)}
                      </p>
                      <p className="text-lg text-muted-foreground mt-2">
                        kcal/day
                      </p>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Calculated using the{' '}
                        <span className="font-medium text-foreground">
                          {result.formula}
                        </span>{' '}
                        formula
                      </p>
                    </div>

                    <div className="space-y-3">
                      <p className="font-medium">What this means:</p>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li className="flex gap-2">
                          <span className="text-primary">•</span>
                          This is the minimum calories your body needs just to
                          function
                        </li>
                        <li className="flex gap-2">
                          <span className="text-primary">•</span>
                          It doesn't include any physical activity
                        </li>
                        <li className="flex gap-2">
                          <span className="text-primary">•</span>
                          Your actual daily needs are higher (see TDEE)
                        </li>
                      </ul>
                    </div>

                    <div className="pt-4">
                      <Link to="/calculators/tdee">
                        <Button variant="outline" className="w-full">
                          Calculate TDEE →
                        </Button>
                      </Link>
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
                        d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"
                      />
                    </svg>
                    <p>Enter your details to calculate your BMR</p>
                  </div>
                </Card>
              )}

              {/* Info Card */}
              <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">About BMR</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-3">
                  <p>
                    Basal Metabolic Rate (BMR) is the energy your body expends
                    at complete rest — breathing, circulation, cell production,
                    and basic brain function.
                  </p>
                  <p>
                    The Mifflin-St Jeor equation is generally considered more
                    accurate for modern populations, while Harris-Benedict is
                    the older, classic formula.
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

export default BmrCalculator;
