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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  mergeStringPrefill,
  useCalculatorPrefill,
} from '@/features/calculators';
import api from '@/lib/api';

type UnitSystem = 'metric' | 'imperial';

interface MetResult {
  caloriesBurned: number;
  met: number;
}

const COMMON_ACTIVITIES = [
  { name: 'Walking (3 mph)', met: 3.5 },
  { name: 'Walking (4 mph, brisk)', met: 5.0 },
  { name: 'Running (5 mph)', met: 8.0 },
  { name: 'Running (6 mph)', met: 10.0 },
  { name: 'Running (8 mph)', met: 13.5 },
  { name: 'Cycling (leisure)', met: 4.0 },
  { name: 'Cycling (moderate)', met: 8.0 },
  { name: 'Cycling (vigorous)', met: 12.0 },
  { name: 'Swimming (leisure)', met: 6.0 },
  { name: 'Swimming (laps)', met: 8.0 },
  { name: 'Weight Training (light)', met: 3.0 },
  { name: 'Weight Training (vigorous)', met: 6.0 },
  { name: 'Yoga', met: 2.5 },
  { name: 'HIIT', met: 8.0 },
  { name: 'Jump Rope', met: 11.0 },
  { name: 'Rowing Machine', met: 7.0 },
  { name: 'Elliptical', met: 5.0 },
  { name: 'Stair Climbing', met: 9.0 },
];

export default function MetCalculator() {
  const [units, setUnits] = useState<UnitSystem>('imperial');
  const prefilledRef = useRef(false);
  const prefill = useCalculatorPrefill();
  const [formData, setFormData] = useState({
    weightKg: '',
    weightLb: '',
    activityMet: '',
    durationMinutes: '',
  });
  const [result, setResult] = useState<MetResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMet, setSelectedMet] = useState<string>('');
  const [customMet, setCustomMet] = useState(false);

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
        activityMet: parseFloat(formData.activityMet),
        durationMinutes: parseInt(formData.durationMinutes),
      };

      if (units === 'metric') {
        payload.weightKg = parseFloat(formData.weightKg);
      } else {
        payload.weightLb = parseFloat(formData.weightLb);
      }

      const response = await api.post<{ success: boolean; data: MetResult }>(
        '/calculators/met',
        payload,
      );
      setResult(response.data.data);
    } catch (err) {
      console.error('MET calculation error:', err);
      setError('Failed to calculate. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const handleActivitySelect = (value: string) => {
    if (value === 'custom') {
      setCustomMet(true);
      setSelectedMet('');
      setFormData({ ...formData, activityMet: '' });
    } else {
      setCustomMet(false);
      setSelectedMet(value);
      setFormData({ ...formData, activityMet: value });
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
            <span>MET Calculator</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            MET Calorie Calculator
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Calculate calories burned using Metabolic Equivalent of Task (MET)
            values. MET represents the energy cost of physical activities
            relative to rest.
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
                <CardTitle>Enter Your Activity</CardTitle>
                <CardDescription>
                  Select an activity and enter duration to calculate calories
                  burned.
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

                  {units === 'metric' ? (
                    <div className="space-y-2">
                      <Label htmlFor="weightKg">Body Weight (kg)</Label>
                      <Input
                        id="weightKg"
                        type="number"
                        step="0.1"
                        value={formData.weightKg}
                        onChange={(e) =>
                          setFormData({ ...formData, weightKg: e.target.value })
                        }
                        placeholder="70"
                        required
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="weightLb">Body Weight (lb)</Label>
                      <Input
                        id="weightLb"
                        type="number"
                        step="0.1"
                        value={formData.weightLb}
                        onChange={(e) =>
                          setFormData({ ...formData, weightLb: e.target.value })
                        }
                        placeholder="154"
                        required
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Activity</Label>
                    <Select
                      value={customMet ? 'custom' : selectedMet}
                      onValueChange={handleActivitySelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an activity" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_ACTIVITIES.map((activity) => (
                          <SelectItem
                            key={activity.name}
                            value={activity.met.toString()}
                          >
                            {activity.name} (MET: {activity.met})
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">
                          Custom MET value...
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {customMet && (
                    <div className="space-y-2">
                      <Label htmlFor="activityMet">Custom MET Value</Label>
                      <Input
                        id="activityMet"
                        type="number"
                        step="0.1"
                        value={formData.activityMet}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            activityMet: e.target.value,
                          })
                        }
                        placeholder="6"
                        required
                        min={1}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="durationMinutes">Duration (minutes)</Label>
                    <Input
                      id="durationMinutes"
                      type="number"
                      value={formData.durationMinutes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          durationMinutes: e.target.value,
                        })
                      }
                      placeholder="30"
                      required
                      min={1}
                    />
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || (!customMet && !selectedMet)}
                  >
                    {loading ? 'Calculating...' : 'Calculate Calories Burned'}
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
                        Calories Burned
                      </p>
                      <p className="text-6xl font-bold text-primary">
                        {result.caloriesBurned}
                      </p>
                      <p className="text-muted-foreground">kcal</p>
                    </div>

                    <div className="p-4 rounded-lg border">
                      <p className="text-sm font-medium mb-2">Formula</p>
                      <p className="text-muted-foreground font-mono text-sm">
                        Calories = MET × Weight (kg) × Duration (hours)
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
                        d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z"
                      />
                    </svg>
                    <p>Select an activity to calculate calories burned</p>
                  </div>
                </Card>
              )}

              {/* Info Card */}
              <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">About MET Values</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-3">
                  <p>
                    MET (Metabolic Equivalent of Task) represents the energy
                    cost of physical activities. 1 MET equals the energy
                    expended at rest (~3.5 mL O₂/kg/min).
                  </p>
                  <p>
                    Higher MET values indicate more intense activities. For
                    example, sitting quietly is 1 MET, while running at 8 mph is
                    about 13.5 METs.
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
