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

interface Vo2MaxResult {
  vo2Max: number;
  fitnessLevel: string;
}

export default function Vo2MaxCalculator() {
  const prefilledRef = useRef(false);
  const prefill = useCalculatorPrefill();
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [formData, setFormData] = useState({
    ageYears: '',
    restingHeartRate: '',
  });
  const [result, setResult] = useState<Vo2MaxResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (prefilledRef.current || !prefill.hasPrefill) return;

    setFormData((current) =>
      mergeStringPrefill(current, {
        ageYears: prefill.age,
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
      const payload = {
        gender,
        ageYears: parseInt(formData.ageYears),
        restingHeartRate: parseInt(formData.restingHeartRate),
      };

      const response = await api.post<{ success: boolean; data: Vo2MaxResult }>(
        '/calculators/vo2-max',
        payload,
      );
      setResult(response.data.data);
    } catch (err) {
      console.error('VO2 Max calculation error:', err);
      setError('Failed to calculate. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const getFitnessColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'excellent':
        return 'text-green-500';
      case 'good':
        return 'text-blue-500';
      case 'average':
        return 'text-yellow-500';
      case 'below average':
        return 'text-orange-500';
      case 'poor':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
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
            <span>VO2 Max Estimator</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            VO2 Max Estimator
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Estimate your maximal oxygen uptake using the
            Uth-Sørensen-Overgaard-Pedersen method. VO2 Max is a key indicator
            of cardiovascular fitness and aerobic endurance.
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
                  Provide your gender, age, and resting heart rate for an
                  estimate.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select
                      value={gender}
                      onValueChange={(v) => setGender(v as 'male' | 'female')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ageYears">Age (years)</Label>
                    <Input
                      id="ageYears"
                      type="number"
                      value={formData.ageYears}
                      onChange={(e) =>
                        setFormData({ ...formData, ageYears: e.target.value })
                      }
                      placeholder="30"
                      required
                      min={10}
                      max={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="restingHeartRate">
                      Resting Heart Rate (bpm)
                    </Label>
                    <Input
                      id="restingHeartRate"
                      type="number"
                      value={formData.restingHeartRate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          restingHeartRate: e.target.value,
                        })
                      }
                      placeholder="60"
                      required
                      min={30}
                      max={120}
                    />
                    <p className="text-sm text-muted-foreground">
                      Measure in the morning before getting out of bed
                    </p>
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Calculating...' : 'Estimate VO2 Max'}
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
                        VO2 Max
                      </p>
                      <p className="text-6xl font-bold">
                        {result.vo2Max.toFixed(1)}
                      </p>
                      <p className="text-muted-foreground">mL/kg/min</p>
                      <p
                        className={`text-lg font-medium mt-2 ${getFitnessColor(result.fitnessLevel)}`}
                      >
                        {result.fitnessLevel}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        Fitness Level Categories
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between py-1">
                          <span className="text-green-500">Excellent</span>
                          <span className="text-muted-foreground">&gt; 50</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-blue-500">Good</span>
                          <span className="text-muted-foreground">40 - 50</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-yellow-500">Average</span>
                          <span className="text-muted-foreground">35 - 40</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-red-500">Poor</span>
                          <span className="text-muted-foreground">&lt; 35</span>
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
                        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
                      />
                    </svg>
                    <p>Enter your details to estimate your VO2 Max</p>
                  </div>
                </Card>
              )}

              {/* Info Card */}
              <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">About VO2 Max</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-3">
                  <p>
                    VO2 Max represents the maximum amount of oxygen your body
                    can utilize during intense exercise. It's measured in
                    milliliters of oxygen per kilogram of body weight per minute
                    (mL/kg/min).
                  </p>
                  <p>
                    This estimation uses resting heart rate and age. For
                    accurate VO2 Max measurement, consult a sports medicine
                    professional for a graded exercise test.
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
