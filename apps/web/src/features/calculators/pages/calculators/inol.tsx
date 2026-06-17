import { useState } from 'react';
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
import api from '@/lib/api';

interface InolResult {
  inol: number;
  recommendation: string;
}

export default function InolCalculator() {
  const [formData, setFormData] = useState({ reps: '', percentOf1Rm: '' });
  const [result, setResult] = useState<InolResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        reps: parseInt(formData.reps),
        percentOf1Rm: parseFloat(formData.percentOf1Rm),
      };

      const response = await api.post<{ success: boolean; data: InolResult }>(
        '/calculators/inol',
        payload,
      );
      setResult(response.data.data);
    } catch (err) {
      console.error('INOL calculation error:', err);
      setError('Failed to calculate. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const getInolColor = (inol: number) => {
    if (inol < 0.4) return 'text-blue-500';
    if (inol < 1.0) return 'text-green-500';
    if (inol < 2.0) return 'text-yellow-500';
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
            <span>INOL Calculator</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            INOL Calculator
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Calculate Intensity Number of Lifts (INOL) to gauge training stress
            per exercise. INOL helps you balance volume and intensity for
            optimal strength gains.
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
                  Enter total reps and intensity to calculate INOL score.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="reps">Total Reps (across all sets)</Label>
                    <Input
                      id="reps"
                      type="number"
                      value={formData.reps}
                      onChange={(e) =>
                        setFormData({ ...formData, reps: e.target.value })
                      }
                      placeholder="25"
                      required
                      min={1}
                    />
                    <p className="text-sm text-muted-foreground">
                      e.g., 5 sets of 5 reps = 25 total reps
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="percentOf1Rm">Intensity (% of 1RM)</Label>
                    <Input
                      id="percentOf1Rm"
                      type="number"
                      step="0.1"
                      value={formData.percentOf1Rm}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          percentOf1Rm: e.target.value,
                        })
                      }
                      placeholder="75"
                      required
                      min={50}
                      max={99.9}
                    />
                    <p className="text-sm text-muted-foreground">
                      Must be less than 100 to avoid invalid INOL values.
                    </p>
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Calculating...' : 'Calculate INOL'}
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
                        INOL Score
                      </p>
                      <p
                        className={`text-6xl font-bold ${getInolColor(result.inol)}`}
                      >
                        {result.inol.toFixed(2)}
                      </p>
                      <p className="text-lg font-medium mt-2">
                        {result.recommendation}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">INOL Categories</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between py-1">
                          <span className="text-blue-500">&lt; 0.4</span>
                          <span className="text-muted-foreground">
                            Too easy
                          </span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-green-500">0.4 - 1.0</span>
                          <span className="text-muted-foreground">
                            Maintenance
                          </span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-yellow-500">1.0 - 2.0</span>
                          <span className="text-muted-foreground">Optimal</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-red-500">&gt; 2.0</span>
                          <span className="text-muted-foreground">
                            High stress
                          </span>
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
                    <p>Enter your training data to see your INOL score</p>
                  </div>
                </Card>
              )}

              {/* Info Card */}
              <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">About INOL</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-3">
                  <p>
                    INOL (Intensity Number of Lifts) = Reps / (100 -
                    Intensity%). It quantifies the training stress of a single
                    exercise at a given intensity.
                  </p>
                  <p>
                    Weekly INOL per exercise should stay under 4.0 for
                    sustainable progress. Use this to balance volume and
                    intensity across your training week.
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
