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

interface VolumeLoadResult {
  volumeLoad: number;
  tonnage: number;
}

export default function VolumeLoadCalculator() {
  const [units, setUnits] = useState<UnitSystem>('imperial');
  const prefilledRef = useRef(false);
  const prefill = useCalculatorPrefill();
  const [formData, setFormData] = useState({
    sets: '',
    reps: '',
    weightKg: '',
    weightLb: '',
  });
  const [result, setResult] = useState<VolumeLoadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    setResult(null);

    try {
      const payload: Record<string, number> = {
        sets: parseInt(formData.sets),
        reps: parseInt(formData.reps),
      };

      if (units === 'metric') {
        payload.weightKg = parseFloat(formData.weightKg);
      } else {
        payload.weightLb = parseFloat(formData.weightLb);
      }

      const response = await api.post<{
        success: boolean;
        data: VolumeLoadResult;
      }>('/calculators/volume-load', payload);
      setResult(response.data.data);
    } catch (err) {
      console.error('Volume load calculation error:', err);
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
            <span>Volume Load Calculator</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Volume Load Calculator
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Calculate your total training volume load to track and optimize your
            workout intensity. Volume load is a key metric for progressive
            overload and training periodization.
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
                <CardTitle>Enter Your Training Data</CardTitle>
                <CardDescription>
                  Input sets, reps, and weight to calculate total volume.
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
                      <Label htmlFor="sets">Sets</Label>
                      <Input
                        id="sets"
                        type="number"
                        value={formData.sets}
                        onChange={(e) =>
                          setFormData({ ...formData, sets: e.target.value })
                        }
                        placeholder="3"
                        required
                        min={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reps">Reps per Set</Label>
                      <Input
                        id="reps"
                        type="number"
                        value={formData.reps}
                        onChange={(e) =>
                          setFormData({ ...formData, reps: e.target.value })
                        }
                        placeholder="10"
                        required
                        min={1}
                      />
                    </div>
                  </div>

                  {units === 'metric' ? (
                    <div className="space-y-2">
                      <Label htmlFor="weightKg">Weight (kg)</Label>
                      <Input
                        id="weightKg"
                        type="number"
                        step="0.5"
                        value={formData.weightKg}
                        onChange={(e) =>
                          setFormData({ ...formData, weightKg: e.target.value })
                        }
                        placeholder="100"
                        required
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="weightLb">Weight (lb)</Label>
                      <Input
                        id="weightLb"
                        type="number"
                        step="0.5"
                        value={formData.weightLb}
                        onChange={(e) =>
                          setFormData({ ...formData, weightLb: e.target.value })
                        }
                        placeholder="225"
                        required
                      />
                    </div>
                  )}

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Calculating...' : 'Calculate Volume Load'}
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
                        Total Volume Load
                      </p>
                      <p className="text-6xl font-bold">
                        {result.volumeLoad.toLocaleString()}
                      </p>
                      <p className="text-muted-foreground">kg</p>
                    </div>

                    <div className="text-center p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Tonnage</p>
                      <p className="text-2xl font-bold">
                        {result.tonnage.toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        metric tons
                      </p>
                    </div>

                    <div className="p-4 rounded-lg border">
                      <p className="text-sm font-medium mb-2">Formula</p>
                      <p className="text-muted-foreground font-mono text-sm">
                        Volume Load = Sets × Reps × Weight
                      </p>
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
                    <p>Enter your training data to calculate volume load</p>
                  </div>
                </Card>
              )}

              {/* Info Card */}
              <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">About Volume Load</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-3">
                  <p>
                    Volume load (also called tonnage) is calculated by
                    multiplying sets × reps × weight. It's a key metric for
                    tracking progressive overload in strength training.
                  </p>
                  <p>
                    Increasing volume load over time is one of the primary
                    drivers of muscle and strength gains. Track this metric
                    weekly to ensure consistent progress.
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
