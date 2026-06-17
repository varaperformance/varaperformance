import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpException,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ActiveUser } from '../idm/decorators/active-user.decorator';
import { Permissions } from '../idm/decorators/permissions.decorator';
import { Public } from '../idm/decorators/public.decorator';
import type { JwtPayload } from '../idm/interfaces/jwt.interface';
import { WithingsIntegrationService } from './withings-integration.service';

@ApiTags('integrations')
@Controller({
  path: 'integrations/withings',
  version: '1',
})
export class WithingsIntegrationController {
  constructor(private readonly service: WithingsIntegrationService) {}

  @ApiOperation({ summary: 'Get Withings integration status' })
  @ApiOkResponse({ description: 'Current Withings connection status' })
  @Permissions('integration:read')
  @Get('status')
  async getStatus(@ActiveUser() user: JwtPayload) {
    return { success: true, data: await this.service.getStatus(user.sub) };
  }

  @ApiOperation({ summary: 'Start Withings OAuth flow' })
  @ApiOkResponse({ description: 'Returns Withings authorization URL' })
  @Permissions('integration:update')
  @Post('connect')
  async connect(@ActiveUser() user: JwtPayload) {
    return {
      success: true,
      data: await this.service.createConnectUrl(user.sub),
    };
  }

  @ApiOperation({ summary: 'Sync Withings body measurements' })
  @ApiOkResponse({ description: 'Fetches and stores new weight entries' })
  @Permissions('integration:update')
  @Post('sync')
  sync(@ActiveUser() user: JwtPayload) {
    return this.service.syncMeasurements(user.sub);
  }

  @ApiOperation({ summary: 'Handle Withings OAuth callback' })
  @ApiOkResponse({ description: 'Redirects back to web integrations page' })
  @Public()
  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    if (error) {
      return res.redirect(
        this.service.getCallbackRedirectUrl('error', 'authorization_denied'),
      );
    }
    if (!code || !state) {
      throw new BadRequestException('Missing required OAuth callback params');
    }
    const parsed = this.service.parseOAuthState(state);
    if (!parsed) {
      return res.redirect(
        this.service.getCallbackRedirectUrl('error', 'state_invalid'),
      );
    }
    try {
      await this.service.handleCallback(parsed.userId, code, parsed.nonce);
      return res.redirect(this.service.getCallbackRedirectUrl('connected'));
    } catch (err) {
      const reason =
        err instanceof HttpException
          ? String(err.message || 'exchange_failed')
          : 'exchange_failed';
      return res.redirect(this.service.getCallbackRedirectUrl('error', reason));
    }
  }

  @ApiOperation({ summary: 'Disconnect Withings' })
  @ApiOkResponse({ description: 'Withings disconnected' })
  @Permissions('integration:update')
  @Delete()
  async disconnect(@ActiveUser() user: JwtPayload) {
    await this.service.disconnect(user.sub);
    return { success: true, data: { message: 'Withings disconnected' } };
  }
}
