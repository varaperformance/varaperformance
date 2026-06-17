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
import { StravaIntegrationService } from './strava-integration.service';

@ApiTags('integrations')
@Controller({
  path: 'integrations/strava',
  version: '1',
})
export class StravaIntegrationController {
  constructor(private readonly service: StravaIntegrationService) {}

  @ApiOperation({ summary: 'Get Strava integration status' })
  @ApiOkResponse({ description: 'Current Strava connection status' })
  @Permissions('integration:read')
  @Get('status')
  async getStatus(@ActiveUser() user: JwtPayload) {
    return { success: true, data: await this.service.getStatus(user.sub) };
  }

  @ApiOperation({ summary: 'Start Strava OAuth flow' })
  @ApiOkResponse({ description: 'Returns Strava authorization URL' })
  @Permissions('integration:update')
  @Post('connect')
  async connect(@ActiveUser() user: JwtPayload) {
    return {
      success: true,
      data: await this.service.createConnectUrl(user.sub),
    };
  }

  @ApiOperation({ summary: 'Sync latest Strava activities' })
  @ApiOkResponse({ description: 'Fetches and stores latest Strava activities' })
  @Permissions('integration:update')
  @Post('sync')
  sync(
    @ActiveUser() user: JwtPayload,
    @Query('limit') limit: string | undefined,
  ) {
    const parsedLimit = Number(limit ?? '30');
    return this.service.syncActivities(user.sub, parsedLimit);
  }

  @ApiOperation({ summary: 'Handle Strava OAuth callback' })
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

    const parsedState = this.service.parseOAuthState(state);
    if (!parsedState) {
      return res.redirect(
        this.service.getCallbackRedirectUrl('error', 'state_invalid'),
      );
    }

    try {
      await this.service.handleCallback(
        parsedState.userId,
        code,
        parsedState.nonce,
      );
      return res.redirect(this.service.getCallbackRedirectUrl('connected'));
    } catch (error) {
      const reason =
        error instanceof HttpException
          ? String(error.message || 'exchange_failed')
          : 'exchange_failed';

      return res.redirect(this.service.getCallbackRedirectUrl('error', reason));
    }
  }

  @ApiOperation({ summary: 'Disconnect Strava integration' })
  @ApiOkResponse({ description: 'Strava disconnected' })
  @Permissions('integration:update')
  @Delete()
  async disconnect(@ActiveUser() user: JwtPayload) {
    await this.service.disconnect(user.sub);
    return { success: true, data: { message: 'Strava disconnected' } };
  }
}
