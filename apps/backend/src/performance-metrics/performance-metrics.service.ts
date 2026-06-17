import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import type {
  CreatePerformanceMetric,
  PerformanceMetricQuery,
  PerformanceMetricResponse,
  SuccessResponse,
} from '@varaperformance/core';

@Injectable()
export class PerformanceMetricsService {
  constructor(private readonly db: DatabaseService) {}

  async createMetric(
    userId: string,
    dto: CreatePerformanceMetric,
  ): Promise<SuccessResponse<PerformanceMetricResponse>> {
    const metric = await this.db.performanceMetric.create({
      data: {
        userId,
        metricName: dto.metricName,
        value: dto.value,
        rating: dto.rating,
        url: dto.url,
        userAgent: dto.userAgent,
        deviceType: dto.deviceType,
        connection: dto.connection,
      },
    });

    const response = {
      ...metric,
      createdAt: metric.createdAt.toISOString(),
      updatedAt: metric.updatedAt.toISOString(),
    } as unknown as PerformanceMetricResponse;

    return {
      success: true,
      data: response,
    };
  }

  async getMetrics(
    query: PerformanceMetricQuery,
  ): Promise<SuccessResponse<PerformanceMetricResponse[]>> {
    const {
      userId,
      metricName,
      rating,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = query;

    const where: any = {};
    if (userId) where.userId = userId;
    if (metricName) where.metricName = metricName;
    if (rating) where.rating = rating;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const metrics = await this.db.performanceMetric.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const response = metrics.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    })) as unknown as PerformanceMetricResponse[];

    return {
      success: true,
      data: response,
    };
  }

  async getStats(
    metricName?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<SuccessResponse> {
    const where: any = {};
    if (metricName) where.metricName = metricName;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const metrics = await this.db.performanceMetric.findMany({
      where,
      select: { value: true, rating: true },
    });

    if (metrics.length === 0) {
      return {
        success: true,
        data: null,
      };
    }

    const values = metrics.map((m) => m.value).sort((a, b) => a - b);
    const count = values.length;
    const avgValue = values.reduce((sum, v) => sum + v, 0) / count;
    const medianValue =
      count % 2 === 0
        ? (values[count / 2 - 1] + values[count / 2]) / 2
        : values[Math.floor(count / 2)];
    const p95Value = values[Math.floor(count * 0.95)];
    const p99Value = values[Math.floor(count * 0.99)];

    const goodCount = metrics.filter((m) => m.rating === 'good').length;
    const needsImprovementCount = metrics.filter(
      (m) => m.rating === 'needs-improvement',
    ).length;
    const poorCount = metrics.filter((m) => m.rating === 'poor').length;

    return {
      success: true,
      data: {
        metricName: metricName || 'all',
        avgValue,
        medianValue,
        p95Value,
        p99Value,
        count,
        goodCount,
        needsImprovementCount,
        poorCount,
      },
    };
  }
}
