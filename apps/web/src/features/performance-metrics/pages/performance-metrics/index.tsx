import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PerformanceStats, SuccessResponse } from '@varaperformance/core';
import {
  getDaysAgoInTimezone,
  getTodayInTimezone,
} from '@varaperformance/core';
import { useTimezone } from '@/features/profile/hooks/use-profile';

interface MetricCardProps {
  metricName: string;
  stats: PerformanceStats;
  rating: 'good' | 'needs-improvement' | 'poor';
}

function MetricCard({ metricName, stats, rating }: MetricCardProps) {
  const ratingColors = {
    good: 'bg-green-500',
    'needs-improvement': 'bg-yellow-500',
    poor: 'bg-red-500',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {metricName}
          <Badge className={ratingColors[rating]}>{rating}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Average:</span>
            <span className="font-medium">{stats.avgValue?.toFixed(2)}ms</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Median:</span>
            <span className="font-medium">
              {stats.medianValue?.toFixed(2)}ms
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">P95:</span>
            <span className="font-medium">{stats.p95Value?.toFixed(2)}ms</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">P99:</span>
            <span className="font-medium">{stats.p99Value?.toFixed(2)}ms</span>
          </div>
          <div className="pt-2 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-green-600">Good: {stats.goodCount}</span>
              <span className="text-yellow-600">
                Needs: {stats.needsImprovementCount}
              </span>
              <span className="text-red-600">Poor: {stats.poorCount}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function computeDateRange(range: string, timezone: string) {
  const endDate = getTodayInTimezone(timezone);

  let days = 7;
  switch (range) {
    case '1d':
      days = 1;
      break;
    case '7d':
      days = 7;
      break;
    case '30d':
      days = 30;
      break;
    default:
      days = 7;
  }

  const startDate = getDaysAgoInTimezone(days, timezone);

  return {
    start: startDate,
    end: endDate,
  };
}

export default function PerformanceMetricsPage() {
  const [selectedMetric, setSelectedMetric] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7d');
  const timezone = useTimezone();
  const [dateRangeValues, setDateRangeValues] = useState(() =>
    computeDateRange('7d', timezone),
  );

  function handleDateRangeChange(value: string) {
    setDateRange(value);
    setDateRangeValues(computeDateRange(value, timezone));
  }

  const [stats, setStats] = useState<SuccessResponse<PerformanceStats> | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const fetchedParams = useRef<string | null>(null);

  useEffect(() => {
    const currentParams = `${selectedMetric}-${dateRangeValues.start}-${dateRangeValues.end}`;
    if (fetchedParams.current === currentParams) {
      setIsLoading(false);
      return;
    }

    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedMetric !== 'all') params.set('metricName', selectedMetric);
        params.set('startDate', dateRangeValues.start);
        params.set('endDate', dateRangeValues.end);

        const response = await api.get<SuccessResponse<PerformanceStats>>(
          `performance-metrics/stats?${params.toString()}`,
        );
        setStats(response.data);
        fetchedParams.current = currentParams;
      } catch (error) {
        console.error('Failed to fetch performance stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [selectedMetric, dateRangeValues]);

  const allStats = stats?.data;

  const refetch = () => {
    fetchedParams.current = null;
    setIsLoading(true);
    const fetchStats = async () => {
      try {
        const params = new URLSearchParams();
        if (selectedMetric !== 'all') params.set('metricName', selectedMetric);
        params.set('startDate', dateRangeValues.start);
        params.set('endDate', dateRangeValues.end);

        const response = await api.get<SuccessResponse<PerformanceStats>>(
          `performance-metrics/stats?${params.toString()}`,
        );
        setStats(response.data);
        fetchedParams.current = `${selectedMetric}-${dateRangeValues.start}-${dateRangeValues.end}`;
      } catch (error) {
        console.error('Failed to fetch performance stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  };
  const metricNames = ['LCP', 'CLS', 'TTFB', 'INP'];

  function getOverallRating(
    stats: PerformanceStats,
  ): 'good' | 'needs-improvement' | 'poor' {
    if (!stats) return 'good';
    const total =
      stats.goodCount + stats.needsImprovementCount + stats.poorCount;
    const goodRatio = stats.goodCount / total;

    if (goodRatio > 0.9) return 'good';
    if (goodRatio > 0.75) return 'needs-improvement';
    return 'poor';
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Performance Metrics</h1>
        <Button onClick={() => refetch()}>Refresh</Button>
      </div>

      <div className="flex gap-4">
        <Select value={selectedMetric} onValueChange={setSelectedMetric}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select metric" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Metrics</SelectItem>
            {metricNames.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={handleDateRangeChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1d">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500">Loading metrics...</p>
          </CardContent>
        </Card>
      ) : allStats ? (
        <MetricCard
          metricName={selectedMetric === 'all' ? 'All Metrics' : selectedMetric}
          stats={allStats}
          rating={getOverallRating(allStats)}
        />
      ) : (
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500">
              No metrics data available for the selected period.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
