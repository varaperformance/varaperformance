import { onCLS, onLCP, onTTFB, onINP, type Metric } from 'web-vitals';
import api from '@/lib/api';
import type {
  CreatePerformanceMetric,
  PerformanceMetricName,
} from '@varaperformance/core';

/**
 * Performance monitoring utility using Web Vitals
 * Tracks Core Web Vitals and sends to backend
 */

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  url: string;
}

// Thresholds for Core Web Vitals
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint (ms)
  CLS: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte (ms)
  INP: { good: 200, poor: 500 }, // Interaction to Next Paint (ms)
};

function getRating(
  name: string,
  value: number,
): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS];
  if (!threshold) return 'good';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

function getDeviceType(): 'mobile' | 'tablet' | 'desktop' | undefined {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function getConnectionType(): string | undefined {
  const connection = (navigator as { connection?: { effectiveType?: string } })
    .connection;
  return connection?.effectiveType || undefined;
}

async function sendToAnalytics(metric: Metric) {
  const performanceMetric: CreatePerformanceMetric = {
    metricName: metric.name as PerformanceMetricName,
    value: metric.value,
    rating: getRating(metric.name, metric.value),
    url: window.location.href,
    userAgent: navigator.userAgent,
    deviceType: getDeviceType(),
    connection: getConnectionType(),
  };

  // Log to console in development
  if (import.meta.env.DEV) {
    console.log('[Performance]', performanceMetric);
  }

  // Send to backend API
  try {
    await api.post('performance-metrics', performanceMetric);
  } catch (error) {
    // Silent fail - don't block user experience if metrics fail to send
    if (import.meta.env.DEV) {
      console.error('[Performance] Failed to send metrics:', error);
    }
  }
}

/**
 * Initialize performance monitoring
 * Call this in your app initialization (e.g., main.tsx)
 */
export function initPerformanceMonitoring() {
  // Largest Contentful Paint (LCP)
  onLCP(sendToAnalytics);

  // Cumulative Layout Shift (CLS)
  onCLS(sendToAnalytics);

  // Time to First Byte (TTFB)
  onTTFB(sendToAnalytics);

  // Interaction to Next Paint (INP)
  onINP(sendToAnalytics);
}

/**
 * Get current performance metrics for debugging
 */
export function getPerformanceMetrics(): Promise<PerformanceMetric[]> {
  return new Promise((resolve) => {
    const metrics: PerformanceMetric[] = [];

    const collectMetric = (metric: Metric) => {
      metrics.push({
        name: metric.name,
        value: metric.value,
        rating: getRating(metric.name, metric.value),
        timestamp: metric.value,
        url: window.location.href,
      });

      if (metrics.length === 4) {
        resolve(metrics);
      }
    };

    onLCP(collectMetric);
    onCLS(collectMetric);
    onTTFB(collectMetric);
    onINP(collectMetric);
  });
}

/**
 * Measure custom performance marks
 */
export function measurePerformanceMark(name: string, startMark?: string) {
  if (startMark) {
    performance.measure(name, startMark);
  } else {
    performance.mark(name);
  }

  const measure = startMark ? performance.getEntriesByName(name)[0] : null;
  if (measure) {
    const duration = measure.duration;
    if (import.meta.env.DEV) {
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    }
    return duration;
  }
  return 0;
}
