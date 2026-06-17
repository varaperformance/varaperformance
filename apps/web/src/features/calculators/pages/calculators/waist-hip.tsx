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

type UnitSystem = 'metric' | 'imperial';

interface WaistHipResult {
  ratio: number;
  risk: string;
}

const riskColors: Record<string, string> = {
  low: 'text-green-500',
  moderate: 'text-yellow-500',
  high: 'text-red-500',
};

const WaistHipCalculator = () => {
  const prefilledRef = useRef(false);
  const prefill = useCalculatorPrefill();
  const [units, setUnits] = useState<UnitSystem>('metric');
  const [formData, setFormData] = useState({
    waistCm: '',
    waistIn: '',
    hipCm: '',
    hipIn: '',
  });
  const [result, setResult] = useState<WaistHipResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    const payload =
      units === 'metric'
        ? {
            waistCm: parseFloat(formData.waistCm),
            hipCm: parseFloat(formData.hipCm),
          }
        : {
            waistIn: parseFloat(formData.waistIn),
            hipIn: parseFloat(formData.hipIn),
          };

    try {
      const response = await api.post<{
        success: boolean;
        data: WaistHipResult;
      }>('/calculators/waist-to-hip', payload);
      setResult(response.data.data);
    } catch {
      setError('Failed to calculate. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const getRiskDescription = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'Your WHR indicates a lower risk of obesity-related health conditions.';
      case 'moderate':
        return 'Your WHR suggests a moderate risk. Consider focusing on core exercises and diet.';
      case 'high':
        return 'Your WHR indicates a higher risk for cardiovascular disease and type 2 diabetes.';
      default:
        return '';
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
            <span>Waist-to-Hip Ratio Calculator</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Waist-to-Hip Ratio Calculator
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Calculate your waist-to-hip ratio (WHR) - a simple measurement that
            helps assess health risks related to body fat distribution.
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
                <CardTitle>Enter Your Measurements</CardTitle>
                <CardDescription>
                  Measure your waist at the narrowest point and hips at the
                  widest point.
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
                      Metric (cm)
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
                      Imperial (in)
                    </button>
                  </div>

                  {/* Measurements */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="waist">
                        Waist ({units === 'metric' ? 'cm' : 'in'})
                      </Label>
                      <Input
                        id="waist"
                        type="number"
                        step="0.1"
                        placeholder={units === 'metric' ? '85' : '33'}
                        value={
                          units === 'metric'
                            ? formData.waistCm
                            : formData.waistIn
                        }
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            [units === 'metric' ? 'waistCm' : 'waistIn']:
                              e.target.value,
                          })
                        }
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        At the narrowest point, usually at navel level
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hip">
                        Hips ({units === 'metric' ? 'cm' : 'in'})
                      </Label>
                      <Input
                        id="hip"
                        type="number"
                        step="0.1"
                        placeholder={units === 'metric' ? '100' : '39'}
                        value={
                          units === 'metric' ? formData.hipCm : formData.hipIn
                        }
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            [units === 'metric' ? 'hipCm' : 'hipIn']:
                              e.target.value,
                          })
                        }
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        At the widest point around your buttocks
                      </p>
                    </div>
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Calculating...' : 'Calculate WHR'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Results */}
            <div className="space-y-6">
              {result ? (
                <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                  <CardHeader>
                    <CardTitle>Your Waist-to-Hip Ratio</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Main Result */}
                    <div className="text-center py-8 border-b border-border">
                      <p className="text-sm text-muted-foreground mb-2">WHR</p>
                      <p className="text-6xl font-bold text-primary">
                        {result.ratio.toFixed(2)}
                      </p>
                      <p
                        className={`text-lg font-medium mt-2 capitalize ${riskColors[result.risk] || ''}`}
                      >
                        {result.risk} Risk
                      </p>
                    </div>

                    {/* Risk Explanation */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm">
                        {getRiskDescription(result.risk)}
                      </p>
                    </div>

                    {/* Reference Table */}
                    <div className="space-y-3">
                      <p className="font-medium text-sm">
                        Health Risk Categories
                      </p>
                      <div className="text-sm space-y-2">
                        <div className="flex justify-between p-2 rounded bg-green-500/10">
                          <span>Low Risk</span>
                          <span>Men: &lt;0.90 | Women: &lt;0.80</span>
                        </div>
                        <div className="flex justify-between p-2 rounded bg-yellow-500/10">
                          <span>Moderate Risk</span>
                          <span>Men: 0.90-0.99 | Women: 0.80-0.84</span>
                        </div>
                        <div className="flex justify-between p-2 rounded bg-red-500/10">
                          <span>High Risk</span>
                          <span>Men: ≥1.0 | Women: ≥0.85</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="flex items-center justify-center min-h-100">
                  <div className="text-center text-muted-foreground">
                    <p className="text-lg">Enter your measurements</p>
                    <p className="text-sm">Your WHR will appear here</p>
                  </div>
                </Card>
              )}

              {/* Info Card */}
              <Card className="border-muted/70 transition-all duration-200 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Why WHR Matters</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-3">
                  <p>
                    <strong>Better than BMI alone:</strong> WHR indicates where
                    you carry fat. Visceral fat (around organs) is more
                    dangerous than subcutaneous fat.
                  </p>
                  <p>
                    <strong>"Apple" vs "Pear":</strong> Apple-shaped bodies
                    (high WHR) have higher cardiovascular risk than pear-shaped
                    bodies (low WHR).
                  </p>
                  <p>
                    <strong>Actionable:</strong> Even without weight loss,
                    shifting from visceral to subcutaneous fat through exercise
                    improves WHR.
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

export default WaistHipCalculator;
