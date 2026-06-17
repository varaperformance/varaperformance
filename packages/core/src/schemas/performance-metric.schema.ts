import { z } from 'zod';

// Performance metric rating
export const PerformanceRatingSchema = z.enum([
  'good',
  'needs-improvement',
  'poor',
]);

// Performance metric names (Web Vitals)
export const PerformanceMetricNameSchema = z.enum([
  'LCP',
  'CLS',
  'TTFB',
  'INP',
]);

// Create performance metric schema (from frontend)
export const CreatePerformanceMetricSchema = z.object({
  metricName: PerformanceMetricNameSchema,
  value: z.number().positive(),
  rating: PerformanceRatingSchema,
  url: z.string().url(),
  userAgent: z.string().optional(),
  deviceType: z.enum(['mobile', 'tablet', 'desktop']).optional(),
  connection: z.string().optional(),
});

// Performance metric response schema
export const PerformanceMetricResponseSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().uuid(),
  metricName: PerformanceMetricNameSchema,
  value: z.number(),
  rating: PerformanceRatingSchema,
  url: z.string(),
  userAgent: z.string().nullable(),
  deviceType: z.string().nullable(),
  connection: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Query filters for performance metrics
export const PerformanceMetricQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  metricName: PerformanceMetricNameSchema.optional(),
  rating: PerformanceRatingSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

// Aggregated performance stats schema
export const PerformanceStatsSchema = z.object({
  metricName: PerformanceMetricNameSchema,
  avgValue: z.number(),
  medianValue: z.number(),
  p95Value: z.number(),
  p99Value: z.number(),
  count: z.number(),
  goodCount: z.number(),
  needsImprovementCount: z.number(),
  poorCount: z.number(),
});

// Inferred types
export type PerformanceRating = z.infer<typeof PerformanceRatingSchema>;
export type PerformanceMetricName = z.infer<typeof PerformanceMetricNameSchema>;
export type CreatePerformanceMetric = z.infer<
  typeof CreatePerformanceMetricSchema
>;
export type PerformanceMetricResponse = z.infer<
  typeof PerformanceMetricResponseSchema
>;
export type PerformanceMetricQuery = z.infer<
  typeof PerformanceMetricQuerySchema
>;
export type PerformanceStats = z.infer<typeof PerformanceStatsSchema>;
