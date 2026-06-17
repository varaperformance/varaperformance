import {
  Controller,
  Post,
  Req,
  Res,
  Headers,
  Logger,
  type RawBodyRequest,
} from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from 'src/idm/decorators/public.decorator';
import { SkipThrottle } from '@nestjs/throttler';
import { StripeWebhookService } from './services/stripe-webhook.service';
import { SkipAudit } from '@app/common/audit';

/**
 * Webhook controller.
 * IMPORTANT: This endpoint must receive raw body for signature verification.
 */

@ApiTags('webhooks')
@Controller({
  version: '1',
  path: 'webhooks',
})
@SkipThrottle()
@SkipAudit()
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly stripeWebhookService: StripeWebhookService) {}

  @ApiExcludeEndpoint()
  @Public()
  @Post('stripe')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!req.rawBody) {
      this.logger.error(
        'No raw body available for Stripe webhook verification',
      );
      return res.status(400).send('Webhook Error: No raw body');
    }

    try {
      const event = this.stripeWebhookService.constructEvent(
        req.rawBody.toString(),
        signature,
      );

      await this.stripeWebhookService.processEvent(event);
      return res.status(200).json({ received: true });
    } catch (error) {
      this.logger.error(`Stripe webhook processing failed: ${error}`);
      return res.status(400).send('Webhook Error');
    }
  }
}
