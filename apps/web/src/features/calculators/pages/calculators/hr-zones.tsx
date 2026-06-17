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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';

interface HeartRateZone {
  name: string;
  minBpm: number;
  maxBpm: number;
  percentRange: string;
}

interface HeartRateZonesResult {
  maxHr: number;
  zones: HeartRateZone[];
}

const zoneColors = [
  'bg-gray-500/10 border-gray-500/30',
  'bg-blue-500/10 border-blue-500/30',
  'bg-green-500/10 border-green-500/30',
  'bg-yellow-500/10 border-yellow-500/30',
  'bg-red-500/10 border-red-500/30',
];

const HrZonesCalculator = () => {
  const [maxHr, setMaxHr] = useState('');
  const [result, setResult] = useState<HeartRateZonesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post<{
        success: boolean;
        data: HeartRateZonesResult;
      }>('/calculators/heart-rate-zones', {
        maxHeartRate: parseInt(maxHr),
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
            <span>Heart Rate Zones</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Heart Rate Zones Calculator
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Calculate your heart rate training zones for optimal cardio workouts
            based on your max HR.
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
                <CardTitle>Enter Your Max Heart Rate</CardTitle>
                <CardDescription>
                  Don't know your max HR?{' '}
                  <Link
                    to="/calculators/max-hr"
                    className="text-primary hover:underline"
                  >
                    Calculate it first
                  </Link>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="maxHr">Max Heart Rate (bpm)</Label>
                    <Input
                      id="maxHr"
                      type="number"
                      placeholder="190"
                      value={maxHr}
                      onChange={(e) => setMaxHr(e.target.value)}
                      required
                    />
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Calculating...' : 'Calculate Zones'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Results */}
            <div className="space-y-6">
              {result ? (
                <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                  <CardHeader>
                    <CardTitle>Your Training Zones</CardTitle>
                    <CardDescription>
                      Based on max HR of {result.maxHr} bpm
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {result.zones.map((zone, index) => (
                      <div
                        key={zone.name}
                        className={`p-4 rounded-lg border ${zoneColors[index] || zoneColors[0]}`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium">{zone.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {zone.percentRange}
                          </span>
                        </div>
                        <div className="text-2xl font-bold">
                          {zone.minBpm} - {zone.maxBpm}{' '}
                          <span className="text-sm font-normal">bpm</span>
                        </div>
                      </div>
                    ))}
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
                        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                      />
                    </svg>
                    <p>Enter your max HR to see training zones</p>
                  </div>
                </Card>
              )}

              {/* Info Card */}
              <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">
                    About Training Zones
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-3">
                  <p>
                    <strong>Zone 1 (50-60%):</strong> Recovery, warm-up,
                    cool-down
                  </p>
                  <p>
                    <strong>Zone 2 (60-70%):</strong> Endurance base, fat
                    burning
                  </p>
                  <p>
                    <strong>Zone 3 (70-80%):</strong> Aerobic fitness, moderate
                    intensity
                  </p>
                  <p>
                    <strong>Zone 4 (80-90%):</strong> Threshold training,
                    performance
                  </p>
                  <p>
                    <strong>Zone 5 (90-100%):</strong> Maximum effort, short
                    intervals
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

export default HrZonesCalculator;
