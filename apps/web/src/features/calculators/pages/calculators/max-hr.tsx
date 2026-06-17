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
import { useCalculatorPrefill } from '@/features/calculators';
import api from '@/lib/api';

type Formula = 'standard' | 'tanaka' | 'gulati';

interface MaxHeartRateResult {
  maxHr: number;
  formula: string;
}

const formulas: { value: Formula; label: string; equation: string }[] = [
  { value: 'standard', label: 'Standard (Fox)', equation: '220 - age' },
  { value: 'tanaka', label: 'Tanaka', equation: '208 - (0.7 × age)' },
  { value: 'gulati', label: 'Gulati (Women)', equation: '206 - (0.88 × age)' },
];

const MaxHrCalculator = () => {
  const prefilledRef = useRef(false);
  const prefill = useCalculatorPrefill();
  const [formula, setFormula] = useState<Formula>('tanaka');
  const [age, setAge] = useState('');
  const [result, setResult] = useState<MaxHeartRateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (prefilledRef.current || !prefill.hasPrefill) return;

    setAge((current) => (current.trim() === '' ? prefill.age : current));
    prefilledRef.current = true;
  }, [prefill]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post<{
        success: boolean;
        data: MaxHeartRateResult;
      }>('/calculators/max-heart-rate', {
        ageYears: parseInt(age),
        formula,
      });
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
            <span>Max Heart Rate</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Max Heart Rate Calculator
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Estimate your maximum heart rate to set accurate training zones for
            cardio workouts.
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
                <CardTitle>Enter Your Age</CardTitle>
                <CardDescription>
                  Choose a formula and enter your age to calculate max HR.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="age">Age (years)</Label>
                    <Input
                      id="age"
                      type="number"
                      placeholder="30"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      required
                    />
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
                            <p className="text-xs text-muted-foreground font-mono">
                              {f.equation}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Calculating...' : 'Calculate Max HR'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Results */}
            <div className="space-y-6">
              {result ? (
                <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                  <CardHeader>
                    <CardTitle>Your Max Heart Rate</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center py-8 border-b border-border">
                      <p className="text-sm text-muted-foreground mb-2">
                        Maximum Heart Rate
                      </p>
                      <p className="text-6xl font-bold text-primary">
                        {result.maxHr}
                      </p>
                      <p className="text-lg text-muted-foreground mt-2">bpm</p>
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

                    <div className="pt-4">
                      <Link to="/calculators/hr-zones">
                        <Button variant="outline" className="w-full">
                          Calculate Training Zones →
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="flex items-center justify-center min-h-75">
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
                        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                      />
                    </svg>
                    <p>Enter your age to calculate max heart rate</p>
                  </div>
                </Card>
              )}

              {/* Info Card */}
              <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">
                    About Max Heart Rate
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-3">
                  <p>
                    Max HR is the highest number of beats per minute your heart
                    can achieve during maximal exertion. It's used to calculate
                    training zones.
                  </p>
                  <p>
                    Tanaka is generally more accurate than the classic "220 -
                    age" formula, especially for older adults.
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

export default MaxHrCalculator;
