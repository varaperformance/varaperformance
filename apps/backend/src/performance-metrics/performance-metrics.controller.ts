import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PerformanceMetricsService } from './performance-metrics.service';
import {
  CreatePerformanceMetricDto,
  PerformanceMetricQueryDto,
} from './dto/performance-metrics.dto';
import { ActiveUser } from 'src/idm/decorators/active-user.decorator';
import { Permissions } from 'src/idm/decorators/permissions.decorator';
import type { JwtPayload } from 'src/idm/interfaces/jwt.interface';
import type { SuccessResponse } from '@varaperformance/core';

@ApiTags('performance-metrics')
@SkipThrottle()
@Controller({
  path: 'performance-metrics',
  version: '1',
})
export class PerformanceMetricsController {
  constructor(
    private readonly performanceMetricsService: PerformanceMetricsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a performance metric (Web Vitals)' })
  @ApiOkResponse({ description: 'Performance metric created' })
  createMetric(
    @Body() dto: CreatePerformanceMetricDto,
    @ActiveUser() user: JwtPayload,
  ): Promise<SuccessResponse> {
    return this.performanceMetricsService.createMetric(user.sub, dto);
  }

  @Get()
  @Permissions('performance-metric:read')
  @ApiOperation({ summary: 'Get performance metrics (admin only)' })
  @ApiOkResponse({ description: 'Performance metrics' })
  getMetrics(
    @Query() query: PerformanceMetricQueryDto,
  ): Promise<SuccessResponse> {
    return this.performanceMetricsService.getMetrics(query);
  }

  @Get('stats')
  @Permissions('performance-metric:read')
  @ApiOperation({ summary: 'Get performance statistics (admin only)' })
  @ApiOkResponse({ description: 'Performance statistics' })
  getStats(
    @Query('metricName') metricName?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<SuccessResponse> {
    return this.performanceMetricsService.getStats(
      metricName,
      startDate,
      endDate,
    );
  }
}
