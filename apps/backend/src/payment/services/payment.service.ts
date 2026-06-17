import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { StripeService } from './stripe.service';
import type { ErrorResponse, SuccessResponse } from '@varaperformance/core';
import {
  paymentAdminListSelect,
  paymentSelect,
  pricingPlanSelect,
  refundSelect,
  subscriptionAdminListSelect,
} from '../selectors/payment.selector';

const PLATFORM_FEE_KEY = 'payments.platform_fee_percent';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: DatabaseService,
    private readonly stripeService: StripeService,
  ) {}

  async listPayments(
    userId: string,
    limit = 20,
    offset = 0,
  ): Promise<SuccessResponse<{ payments: unknown[] }> | ErrorResponse> {
    const customer = await this.prisma.stripeCustomer.findUnique({
      where: { userId },
    });

    if (!customer) {
      return { success: true, data: { payments: [] } };
    }

    const payments = await this.prisma.payment.findMany({
      where: { customerId: customer.id },
      select: paymentSelect,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return { success: true, data: { payments } };
  }

  async refundPayment(
    paymentId: string,
    reason: string,
  ): Promise<SuccessResponse<{ refund: unknown }> | ErrorResponse> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: paymentSelect,
    });

    if (!payment) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Payment not found' },
      };
    }

    if (!payment.stripePaymentIntentId) {
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Payment is not linked to Stripe Payment Intent',
        },
      };
    }

    if (!this.stripeService.isConfigured()) {
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Stripe is not configured',
        },
      };
    }

    try {
      const stripeRefund = await this.stripeService.getClient().refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        reason: 'requested_by_customer',
        metadata: {
          internalPaymentId: payment.id,
          reason,
        },
      });

      const refund = await this.prisma.refund.create({
        data: {
          paymentId,
          stripeRefundId: stripeRefund.id,
          amountInCents: payment.amountInCents,
          reason: 'REQUESTED_BY_CUSTOMER',
          notes: reason,
          status: 'SUCCEEDED',
        },
        select: refundSelect,
      });

      await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'REFUNDED',
          refundedAt: new Date(),
        },
      });

      return { success: true, data: { refund } };
    } catch (error) {
      this.logger.error(
        `Failed to refund Stripe payment ${paymentId}: ${error}`,
      );
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Failed to process refund',
        },
      };
    }
  }

  async getSubscriptionsAdmin(
    page = 1,
    limit = 20,
    status?: string,
  ): Promise<SuccessResponse> {
    const skip = (page - 1) * limit;

    const where: NonNullable<
      Parameters<typeof this.prisma.subscription.findMany>[0]
    >['where'] = {};

    if (status) {
      where.status = status as any;
    }

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: subscriptionAdminListSelect,
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: subscriptions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + subscriptions.length < total,
      },
    };
  }

  async getPaymentsAdmin(
    page = 1,
    limit = 20,
    status?: string,
  ): Promise<SuccessResponse> {
    const skip = (page - 1) * limit;

    const where: NonNullable<
      Parameters<typeof this.prisma.payment.findMany>[0]
    >['where'] = {};

    if (status) {
      where.status = status as any;
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: paymentAdminListSelect,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: payments,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + payments.length < total,
      },
    };
  }

  async getPaymentStats(): Promise<SuccessResponse> {
    const [
      totalPayments,
      successfulPayments,
      totalRevenue,
      activeSubscriptions,
      cancelledSubscriptions,
      pastDueSubscriptions,
    ] = await Promise.all([
      this.prisma.payment.count(),
      this.prisma.payment.count({ where: { status: 'SUCCEEDED' } }),
      this.prisma.payment.aggregate({
        where: { status: 'SUCCEEDED' },
        _sum: { amountInCents: true },
      }),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.subscription.count({ where: { status: 'CANCELLED' } }),
      this.prisma.subscription.count({ where: { status: 'PAST_DUE' } }),
    ]);

    return {
      success: true,
      data: {
        totalPayments,
        successfulPayments,
        totalRevenueInCents: totalRevenue._sum.amountInCents ?? 0,
        activeSubscriptions,
        cancelledSubscriptions,
        pastDueSubscriptions,
      },
    };
  }

  async listPublicPricingPlans(): Promise<SuccessResponse> {
    const plans = await this.prisma.pricingPlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: pricingPlanSelect,
    });

    return {
      success: true,
      data: { plans },
    };
  }

  async listPricingPlansAdmin(): Promise<SuccessResponse> {
    const plans = await this.prisma.pricingPlan.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: pricingPlanSelect,
    });

    return {
      success: true,
      data: { plans },
    };
  }

  async createPricingPlan(data: {
    slug: string;
    name: string;
    description?: string;
    audience: 'FREE' | 'COACH' | 'GYM';
    priceInCents: number;
    periodLabel?: string;
    cta: string;
    ctaLink: string;
    highlighted?: boolean;
    isActive?: boolean;
    sortOrder?: number;
    features: string[];
  }): Promise<SuccessResponse | ErrorResponse> {
    const existing = await this.prisma.pricingPlan.findUnique({
      where: { slug: data.slug },
      select: { id: true },
    });

    if (existing) {
      return {
        success: false,
        error: { code: 'CONFLICT', message: 'Plan slug already exists' },
      };
    }

    const plan = await this.prisma.pricingPlan.create({
      data: {
        slug: data.slug,
        name: data.name,
        description: data.description,
        audience: data.audience,
        priceInCents: data.priceInCents,
        periodLabel: data.periodLabel,
        cta: data.cta,
        ctaLink: data.ctaLink,
        highlighted: data.highlighted ?? false,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
        features: {
          create: data.features.map((text, index) => ({
            text,
            sortOrder: index,
          })),
        },
      },
      select: pricingPlanSelect,
    });

    return { success: true, data: { plan } };
  }

  async updatePricingPlan(
    id: string,
    data: {
      name?: string;
      description?: string;
      audience?: 'FREE' | 'COACH' | 'GYM';
      priceInCents?: number;
      periodLabel?: string;
      cta?: string;
      ctaLink?: string;
      highlighted?: boolean;
      isActive?: boolean;
      sortOrder?: number;
      features?: string[];
    },
  ): Promise<SuccessResponse | ErrorResponse> {
    const existing = await this.prisma.pricingPlan.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Pricing plan not found' },
      };
    }

    await this.prisma.pricingPlan.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        audience: data.audience,
        priceInCents: data.priceInCents,
        periodLabel: data.periodLabel,
        cta: data.cta,
        ctaLink: data.ctaLink,
        highlighted: data.highlighted,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    });

    if (data.features) {
      await this.prisma.pricingPlanFeature.deleteMany({
        where: { planId: id },
      });
      await this.prisma.pricingPlanFeature.createMany({
        data: data.features.map((text, index) => ({
          planId: id,
          text,
          sortOrder: index,
        })),
      });
    }

    const plan = await this.prisma.pricingPlan.findUnique({
      where: { id },
      select: pricingPlanSelect,
    });

    return { success: true, data: { plan } };
  }

  async getPlatformFeeSetting(): Promise<SuccessResponse<{ percent: number }>> {
    const percent = await this.getPlatformFeePercent();
    return {
      success: true,
      data: { percent },
    };
  }

  async updatePlatformFeeSetting(
    percent: number,
    updatedBy?: string,
  ): Promise<SuccessResponse<{ percent: number }>> {
    await this.prisma.platformSetting.upsert({
      where: { key: PLATFORM_FEE_KEY },
      update: {
        value: String(percent),
        updatedBy,
      },
      create: {
        key: PLATFORM_FEE_KEY,
        value: String(percent),
        updatedBy,
      },
    });

    return {
      success: true,
      data: { percent },
    };
  }

  async getPlatformFeePercent(): Promise<number> {
    const setting = await this.prisma.platformSetting.findUnique({
      where: { key: PLATFORM_FEE_KEY },
      select: { value: true },
    });

    if (!setting) {
      return 15;
    }

    const parsed = Number(setting.value);
    if (!Number.isFinite(parsed)) {
      return 15;
    }

    return parsed;
  }
}
