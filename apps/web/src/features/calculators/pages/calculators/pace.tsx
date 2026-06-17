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
import { useCalculatorPrefill } from '@/features/calculators';
import api from '@/lib/api';

type UnitSystem = 'metric' | 'imperial';

interface PaceResult {
  pacePerKm: string;
  pacePerMile: string;
  speed: number;
}

export default function PaceCalculator() {
  const prefilledRef = useRef(false);
  const prefill = useCalculatorPrefill();
  const [units, setUnits] = useState<UnitSystem>('imperial');
  const [formData, setFormData] = useState({
    distanceKm: '',
    distanceMiles: '',
    timeMinutes: '',
  });
  const [result, setResult] = useState<PaceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (prefilledRef.current || !prefill.hasPrefill) return;

    if (prefill.unitPreference) {
      setUnits(prefill.unitPreference);
    }

    prefilledRef.current = true;
  }, [prefill]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload: Record<string, number> = {
        timeMinutes: parseFloat(formData.timeMinutes),
      };

      if (units === 'metric') {
        payload.distanceKm = parseFloat(formData.distanceKm);
      } else {
        payload.distanceMiles = parseFloat(formData.distanceMiles);
      }

      const response = await api.post<{ success: boolean; data: PaceResult }>(
        '/calculators/pace',
        payload,
      );
      setResult(response.data.data);
    } catch (err) {
      console.error('Pace calculation error:', err);
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
            <span>Pace Calculator</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Running Pace Calculator
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Calculate your running pace and speed from distance and time. Plan
            your races and track your training progress with accurate pace
            conversions.
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
                <CardTitle>Enter Your Run Details</CardTitle>
                <CardDescription>
                  Input distance and time to calculate your pace.
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
                      Kilometers
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
                      Miles
                    </button>
                  </div>

                  {units === 'metric' ? (
                    <div className="space-y-2">
                      <Label htmlFor="distanceKm">Distance (km)</Label>
                      <Input
                        id="distanceKm"
                        type="number"
                        step="0.01"
                        value={formData.distanceKm}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            distanceKm: e.target.value,
                          })
                        }
                        placeholder="5"
                        required
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="distanceMiles">Distance (miles)</Label>
                      <Input
                        id="distanceMiles"
                        type="number"
                        step="0.01"
                        value={formData.distanceMiles}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            distanceMiles: e.target.value,
                          })
                        }
                        placeholder="3.1"
                        required
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="timeMinutes">Total Time (minutes)</Label>
                    <Input
                      id="timeMinutes"
                      type="number"
                      step="0.01"
                      value={formData.timeMinutes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          timeMinutes: e.target.value,
                        })
                      }
                      placeholder="25"
                      required
                      min={0.1}
                    />
                    <p className="text-sm text-muted-foreground">
                      e.g., 1:30:00 = 90 minutes
                    </p>
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Calculating...' : 'Calculate Pace'}
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
                    <div className="grid grid-cols-3 gap-4 py-4 border-b border-border">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-1">
                          Pace/km
                        </p>
                        <p className="text-2xl font-bold">{result.pacePerKm}</p>
                        <p className="text-xs text-muted-foreground">min/km</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-1">
                          Pace/mile
                        </p>
                        <p className="text-2xl font-bold">
                          {result.pacePerMile}
                        </p>
                        <p className="text-xs text-muted-foreground">min/mi</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-1">
                          Speed
                        </p>
                        <p className="text-2xl font-bold">{result.speed}</p>
                        <p className="text-xs text-muted-foreground">km/h</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        Common Race Distances
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between py-1">
                          <span>5K</span>
                          <span className="text-muted-foreground">3.1 mi</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span>10K</span>
                          <span className="text-muted-foreground">6.2 mi</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span>Half Marathon</span>
                          <span className="text-muted-foreground">13.1 mi</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span>Marathon</span>
                          <span className="text-muted-foreground">26.2 mi</span>
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
                        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                      />
                    </svg>
                    <p>Enter distance and time to calculate your pace</p>
                  </div>
                </Card>
              )}

              {/* Info Card */}
              <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">
                    About Running Pace
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-3">
                  <p>
                    Pace is typically expressed as minutes per mile or minutes
                    per kilometer. Knowing your pace helps you plan race
                    strategies and set realistic goals.
                  </p>
                  <p>
                    For training, vary your pace: easy runs should be
                    conversational, while tempo runs should be comfortably hard.
                    Intervals can be at race pace or faster.
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
