import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  InternalApiGuard,
  InternalEndpoint,
} from '../../idm/guards/internal/internal-api.guard';
import { Public } from '../../idm/decorators/public.decorator';
import { HealthSyncService } from './health-sync.service';

@ApiTags('integrations')
@Controller({
  path: 'integrations/health',
  version: '1',
})
export class HealthInternalController {
  constructor(private readonly syncService: HealthSyncService) {}

  @ApiOperation({
    summary: 'Internal: sync all connected users for a provider',
  })
  @ApiOkResponse({ description: 'Bulk sync results' })
  @Public()
  @InternalEndpoint()
  @UseGuards(InternalApiGuard)
  @Post('internal/sync-all')
  async internalSyncAll(@Body() body: { provider: string; maxUsers?: number }) {
    const result = await this.syncService.syncAllUsers(body.provider, {
      maxUsers: body.maxUsers,
    });
    return { success: true, data: result };
  }
}
