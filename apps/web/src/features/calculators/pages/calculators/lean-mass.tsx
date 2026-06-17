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

interface LeanMassResult {
  leanMassKg: number;
  fatMassKg: number;
}

const LeanMassCalculator = () => {
  const [units, setUnits] = useState<UnitSystem>('metric');
  const prefilledRef = useRef(false);
  const prefill = useCalculatorPrefill();
  const [formData, setFormData] = useState({
    weightKg: '',
    weightLb: '',
    bodyFatPercent: '',
  });
  const [result, setResult] = useState<LeanMassResult | null>(null);
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
            bodyFatPercent: parseFloat(formData.bodyFatPercent),
          }
        : {
            weightLb: parseFloat(formData.weightLb),
            bodyFatPercent: parseFloat(formData.bodyFatPercent),
          };

    try {
      const response = await api.post<{
        success: boolean;
        data: LeanMassResult;
      }>('/calculators/lean-body-mass', payload);
      setResult(response.data.data);
    } catch {
      setError('Failed to calculate. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  // Convert kg to lb for display
  const toLb = (kg: number) => (kg * 2.205).toFixed(1);

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
            <span>Lean Body Mass Calculator</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Lean Body Mass Calculator
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Calculate your lean body mass (LBM) - the weight of everything in
            your body except fat. This includes muscles, bones, organs, and
            water.
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
                  You'll need to know your body fat percentage for this
                  calculation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Unit Toggle */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setUnits('metric')}
                      className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        units === 'metric'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      Metric (kg)
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnits('imperial')}
                      className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        units === 'imperial'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      Imperial (lb)
                    </button>
                  </div>

                  {/* Weight */}
                  <div className="space-y-2">
                    <Label htmlFor="weight">
                      Weight ({units === 'metric' ? 'kg' : 'lb'})
                    </Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      placeholder={units === 'metric' ? '75' : '165'}
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

                  {/* Body Fat */}
                  <div className="space-y-2">
                    <Label htmlFor="bodyFat">Body Fat Percentage (%)</Label>
                    <Input
                      id="bodyFat"
                      type="number"
                      step="0.1"
                      min="3"
                      max="60"
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
                    {loading ? 'Calculating...' : 'Calculate Lean Mass'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Results */}
            <div className="space-y-6">
              {result ? (
                <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                  <CardHeader>
                    <CardTitle>Your Body Composition</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Lean Mass */}
                      <div className="p-6 bg-primary/5 rounded-lg text-center border border-primary/20">
                        <p className="text-sm text-muted-foreground mb-2">
                          Lean Body Mass
                        </p>
                        <p className="text-4xl font-bold text-primary">
                          {result.leanMassKg.toFixed(1)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          kg ({toLb(result.leanMassKg)} lb)
                        </p>
                      </div>

                      {/* Fat Mass */}
                      <div className="p-6 bg-muted/50 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground mb-2">
                          Fat Mass
                        </p>
                        <p className="text-4xl font-bold">
                          {result.fatMassKg.toFixed(1)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          kg ({toLb(result.fatMassKg)} lb)
                        </p>
                      </div>
                    </div>

                    {/* Visual Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Lean Mass</span>
                        <span>Fat Mass</span>
                      </div>
                      <div className="h-4 rounded-full overflow-hidden flex">
                        <div
                          className="bg-primary"
                          style={{
                            width: `${(result.leanMassKg / (result.leanMassKg + result.fatMassKg)) * 100}%`,
                          }}
                        />
                        <div className="bg-muted flex-1" />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {(
                            (result.leanMassKg /
                              (result.leanMassKg + result.fatMassKg)) *
                            100
                          ).toFixed(1)}
                          %
                        </span>
                        <span>
                          {(
                            (result.fatMassKg /
                              (result.leanMassKg + result.fatMassKg)) *
                            100
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground space-y-2">
                      <p className="font-medium text-foreground">
                        What is Lean Body Mass?
                      </p>
                      <p>
                        LBM includes your muscles, bones, organs, skin, and body
                        water - everything except stored fat. Tracking LBM helps
                        ensure you're losing fat, not muscle, during weight
                        loss.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="flex items-center justify-center min-h-100">
                  <div className="text-center text-muted-foreground">
                    <p className="text-lg">Enter your details to calculate</p>
                    <p className="text-sm">
                      Your lean body mass will appear here
                    </p>
                  </div>
                </Card>
              )}

              {/* Info Card */}
              <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">
                    Why Track Lean Body Mass?
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-3">
                  <p>
                    <strong>Better than scale weight:</strong> The scale doesn't
                    distinguish between fat and muscle. LBM tracking shows if
                    you're building muscle while losing fat.
                  </p>
                  <p>
                    <strong>Metabolism indicator:</strong> More lean mass means
                    a higher metabolic rate. Each kg of muscle burns ~13
                    calories at rest daily.
                  </p>
                  <p>
                    <strong>Progress tracking:</strong> During a diet, some LBM
                    loss is normal (5-10%). Losing more suggests inadequate
                    protein or too aggressive deficit.
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

export default LeanMassCalculator;
