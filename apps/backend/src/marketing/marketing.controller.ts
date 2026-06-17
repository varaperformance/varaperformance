import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { MarketingService } from './marketing.service';
import {
  CreateNewsletterDto,
  UpdateNewsletterDto,
  NewsletterQueryDto,
  SubscriberQueryDto,
} from './dto/marketing.dto';
import { Permissions } from 'src/idm/decorators/permissions.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('marketing')
@Throttle({ default: { ttl: 1000, limit: 10 } })
@Controller({
  path: 'marketing',
  version: '1',
})
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  // ─── Subscribers ───────────────────────────────────────────

  @ApiOperation({ summary: 'Get marketing email subscribers' })
  @ApiOkResponse({ description: 'Paginated subscriber list' })
  @Permissions('marketing:read')
  @Get('subscribers')
  getSubscribers(@Query() query: SubscriberQueryDto) {
    return this.marketingService.getSubscribers(query);
  }

  @ApiOperation({ summary: 'Get subscriber stats' })
  @ApiOkResponse({ description: 'Subscriber and unsubscribed counts' })
  @Permissions('marketing:read')
  @Get('subscribers/stats')
  getSubscriberStats() {
    return this.marketingService.getSubscriberStats();
  }

  // ─── Newsletters ───────────────────────────────────────────

  @ApiOperation({ summary: 'List newsletters' })
  @ApiOkResponse({ description: 'Paginated newsletter list' })
  @Permissions('marketing:read')
  @Get('newsletters')
  getNewsletters(@Query() query: NewsletterQueryDto) {
    return this.marketingService.getNewsletters(query);
  }

  @ApiOperation({ summary: 'Get a newsletter by ID' })
  @ApiOkResponse({ description: 'Newsletter details' })
  @Permissions('marketing:read')
  @Get('newsletters/:id')
  getNewsletter(@Param('id') id: string) {
    return this.marketingService.getNewsletter(id);
  }

  @ApiOperation({ summary: 'Create a newsletter' })
  @ApiOkResponse({ description: 'Created newsletter' })
  @Permissions('marketing:create')
  @Post('newsletters')
  createNewsletter(@Body() dto: CreateNewsletterDto) {
    return this.marketingService.createNewsletter(dto);
  }

  @ApiOperation({ summary: 'Update a newsletter' })
  @ApiOkResponse({ description: 'Updated newsletter' })
  @Permissions('marketing:update')
  @Put('newsletters/:id')
  updateNewsletter(@Param('id') id: string, @Body() dto: UpdateNewsletterDto) {
    return this.marketingService.updateNewsletter(id, dto);
  }

  @ApiOperation({ summary: 'Delete a newsletter' })
  @ApiOkResponse({ description: 'Deleted' })
  @Permissions('marketing:delete')
  @Delete('newsletters/:id')
  deleteNewsletter(@Param('id') id: string) {
    return this.marketingService.deleteNewsletter(id);
  }

  @ApiOperation({ summary: 'Send a newsletter to all subscribers' })
  @ApiOkResponse({ description: 'Send result' })
  @Permissions('marketing:create')
  @Post('newsletters/:id/send')
  sendNewsletter(@Param('id') id: string) {
    return this.marketingService.sendNewsletter(id);
  }
}
