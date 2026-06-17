import {
  Controller,
  Get,
  Header,
  Query,
  Post,
  Patch,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaymentService } from './services/payment.service';
import { ActiveUser } from 'src/idm/decorators/active-user.decorator';
import { Permissions } from 'src/idm/decorators/permissions.decorator';
import { Public } from 'src/idm/decorators/public.decorator';
import { SkipAudit } from '@app/common/audit';
import { PaymentHistoryQueryDto } from './dto/payment.dto';
import {
  CreatePricingPlanDto,
  UpdatePlatformFeeDto,
  PricingPlanIdParamsDto,
  UpdatePricingPlanDto,
} from './dto/payment.dto';

/**
 * Payment controller for Stripe integration.
 */
@ApiTags('payments')
@Controller({
  version: '1',
  path: 'payments',
})
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @ApiOperation({ summary: 'Get payment history' })
  @ApiOkResponse({ description: 'List of payments' })
  @Permissions('payment:read')
  @Get('history')
  async getPaymentHistory(
    @ActiveUser('sub') userId: string,
    @Query() query: PaymentHistoryQueryDto,
  ) {
    return this.paymentService.listPayments(userId, query.limit, query.offset);
  }

  @ApiOperation({ summary: 'Get active pricing plans for public pricing page' })
  @ApiOkResponse({ description: 'Pricing plans' })
  @Public()
  @SkipAudit()
  @Header('Cache-Control', 'public, max-age=60')
  @Get('pricing/plans')
  async getPublicPricingPlans() {
    return this.paymentService.listPublicPricingPlans();
  }

  @ApiOperation({ summary: 'Get current platform fee percent' })
  @ApiOkResponse({ description: 'Platform fee setting' })
  @Public()
  @SkipAudit()
  @Header('Cache-Control', 'public, max-age=60')
  @Get('settings/platform-fee')
  getPlatformFeePublic() {
    return this.paymentService.getPlatformFeeSetting();
  }

  // ==========================================================================
  // Admin Payment Management
  // ==========================================================================

  @ApiOperation({ summary: 'Get all subscriptions (admin)' })
  @ApiOkResponse({ description: 'Subscription list' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiBearerAuth()
  @Permissions('payment:read')
  @Get('admin/subscriptions')
  getSubscriptionsAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.paymentService.getSubscriptionsAdmin(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
    );
  }

  @ApiOperation({ summary: 'Get all payments (admin)' })
  @ApiOkResponse({ description: 'Payment list' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiBearerAuth()
  @Permissions('payment:read')
  @Get('admin/payments')
  getPaymentsAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.paymentService.getPaymentsAdmin(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
    );
  }

  @ApiOperation({ summary: 'Get payment statistics (admin)' })
  @ApiOkResponse({ description: 'Payment stats' })
  @ApiBearerAuth()
  @Permissions('payment:read')
  @Get('admin/stats')
  getPaymentStats() {
    return this.paymentService.getPaymentStats();
  }

  @ApiOperation({ summary: 'List pricing plans (admin)' })
  @ApiOkResponse({ description: 'Pricing plans list' })
  @ApiBearerAuth()
  @Permissions('payment:read')
  @Get('admin/pricing/plans')
  getPricingPlansAdmin() {
    return this.paymentService.listPricingPlansAdmin();
  }

  @ApiOperation({ summary: 'Create pricing plan (admin)' })
  @ApiOkResponse({ description: 'Pricing plan created' })
  @ApiBearerAuth()
  @Permissions('payment:update')
  @Post('admin/pricing/plans')
  createPricingPlanAdmin(@Body() dto: CreatePricingPlanDto) {
    return this.paymentService.createPricingPlan(dto);
  }

  @ApiOperation({ summary: 'Update pricing plan (admin)' })
  @ApiOkResponse({ description: 'Pricing plan updated' })
  @ApiBearerAuth()
  @Permissions('payment:update')
  @Patch('admin/pricing/plans/:pricingPlanId')
  updatePricingPlanAdmin(
    @Param() params: PricingPlanIdParamsDto,
    @Body() dto: UpdatePricingPlanDto,
  ) {
    return this.paymentService.updatePricingPlan(params.pricingPlanId, dto);
  }

  @ApiOperation({ summary: 'Get platform fee percent (admin)' })
  @ApiOkResponse({ description: 'Platform fee setting' })
  @ApiBearerAuth()
  @Permissions('payment:read')
  @Get('admin/settings/platform-fee')
  getPlatformFeeAdmin() {
    return this.paymentService.getPlatformFeeSetting();
  }

  @ApiOperation({ summary: 'Update platform fee percent (admin)' })
  @ApiOkResponse({ description: 'Platform fee setting updated' })
  @ApiBearerAuth()
  @Permissions('payment:update')
  @Patch('admin/settings/platform-fee')
  updatePlatformFeeAdmin(
    @ActiveUser('sub') userId: string,
    @Body() dto: UpdatePlatformFeeDto,
  ) {
    return this.paymentService.updatePlatformFeeSetting(dto.percent, userId);
  }
}
