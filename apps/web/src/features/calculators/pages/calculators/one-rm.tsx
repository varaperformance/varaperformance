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
type Formula = 'brzycki' | 'epley' | 'lombardi';

interface OneRmResult {
  oneRm: number;
  percentages: Record<number, number>;
}

const formulas: { value: Formula; label: string; description: string }[] = [
  {
    value: 'brzycki',
    label: 'Brzycki',
    description: 'Most accurate for 1-10 reps',
  },
  { value: 'epley', label: 'Epley', description: 'Good for higher rep ranges' },
  { value: 'lombardi', label: 'Lombardi', description: 'Alternative formula' },
];

const OneRmCalculator = () => {
  const [units, setUnits] = useState<UnitSystem>('metric');
  const prefilledRef = useRef(false);
  const prefill = useCalculatorPrefill();
  const [formula, setFormula] = useState<Formula>('brzycki');
  const [formData, setFormData] = useState({
    weightKg: '',
    weightLb: '',
    reps: '',
  });
  const [result, setResult] = useState<OneRmResult | null>(null);
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
        ? {
            weightKg: parseFloat(formData.weightKg),
            reps: parseInt(formData.reps),
            formula,
          }
        : {
            weightLb: parseFloat(formData.weightLb),
            reps: parseInt(formData.reps),
            formula,
          };

    try {
      const response = await api.post<{ success: boolean; data: OneRmResult }>(
        '/calculators/one-rm',
        payload,
      );
      setResult(response.data.data);
    } catch {
      setError('Failed to calculate 1RM. Please check your inputs.');
    } finally {
      setLoading(false);
    }
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
            <span>1RM Calculator</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            One Rep Max Calculator
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Estimate your one-rep max (1RM) from a submaximal lift. Perfect for
            programming your training without testing actual maxes.
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
                <CardTitle>Enter Your Lift</CardTitle>
                <CardDescription>
                  Input a weight and rep count you can perform with good form.
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="weight">Weight ({unit})</Label>
                      <Input
                        id="weight"
                        type="number"
                        step="0.5"
                        placeholder={units === 'metric' ? '100' : '225'}
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
                    <div className="space-y-2">
                      <Label htmlFor="reps">Reps</Label>
                      <Input
                        id="reps"
                        type="number"
                        min="1"
                        max="30"
                        placeholder="5"
                        value={formData.reps}
                        onChange={(e) =>
                          setFormData({ ...formData, reps: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  {/* Formula Selection */}
                  <div className="space-y-3">
                    <Label>Formula</Label>
                    <div className="space-y-2">
                      {formulas.map((f) => (
                        <label
                          key={f.value}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            formula === f.value
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/30'
                          }`}
                        >
                          <input
                            type="radio"
                            name="formula"
                            value={f.value}
                            checked={formula === f.value}
                            onChange={(e) =>
                              setFormula(e.target.value as Formula)
                            }
                            className="mt-1"
                          />
                          <div>
                            <p className="font-medium text-sm">{f.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {f.description}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Calculating...' : 'Calculate 1RM'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Results */}
            <div className="space-y-6">
              {result ? (
                <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                  <CardHeader>
                    <CardTitle>Your Estimated 1RM</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center py-8 border-b border-border">
                      <p className="text-sm text-muted-foreground mb-2">
                        One Rep Max
                      </p>
                      <p className="text-6xl font-bold text-primary">
                        {result.oneRm.toFixed(1)}
                      </p>
                      <p className="text-lg text-muted-foreground mt-2">
                        {unit}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <p className="font-medium">Percentage Chart</p>
                      <div className="space-y-2">
                        {[100, 95, 90, 85, 80, 75, 70, 65, 60].map((pct) => (
                          <div
                            key={pct}
                            className="flex justify-between items-center p-2 rounded hover:bg-muted/50"
                          >
                            <span className="text-sm text-muted-foreground">
                              {pct}%
                            </span>
                            <span className="font-mono font-medium">
                              {(result.oneRm * (pct / 100)).toFixed(1)} {unit}
                            </span>
                            <span className="text-xs text-muted-foreground w-20 text-right">
                              {pct === 100 && '1 rep'}
                              {pct === 95 && '~2 reps'}
                              {pct === 90 && '~3-4 reps'}
                              {pct === 85 && '~5-6 reps'}
                              {pct === 80 && '~7-8 reps'}
                              {pct === 75 && '~10 reps'}
                              {pct === 70 && '~12 reps'}
                              {pct === 65 && '~15 reps'}
                              {pct === 60 && '~20 reps'}
                            </span>
                          </div>
                        ))}
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
                    <p>Enter your lift details to estimate your 1RM</p>
                  </div>
                </Card>
              )}

              {/* Info Card */}
              <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">
                    About 1RM Calculations
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-3">
                  <p>
                    One Rep Max (1RM) is the maximum weight you can lift for a
                    single repetition. It's commonly used to program training
                    percentages.
                  </p>
                  <p>
                    These formulas are most accurate for 1-10 reps. For best
                    results, use a weight you can lift with good form for 3-6
                    reps.
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

export default OneRmCalculator;
