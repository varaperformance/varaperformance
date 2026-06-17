import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from 'src/idm/decorators/public.decorator';
import { StorageService } from './storage.service';
import type { Response } from 'express';

@Controller('media')
export class MediaController {
  constructor(private readonly storageService: StorageService) {}

  @ApiOperation({ summary: 'Get a pre-signed download URL for an S3 object' })
  @ApiQuery({ name: 'key', description: 'S3 object key', required: true })
  @ApiOkResponse({ description: 'Pre-signed download URL' })
  @Get('signed-url')
  async getSignedUrl(@Query('key') key: string) {
    if (!key || typeof key !== 'string') {
      throw new BadRequestException('Missing required query parameter: key');
    }

    // Prevent path traversal in the key
    const normalized = key.replace(/\\/g, '/');
    if (normalized.includes('..') || normalized.startsWith('/')) {
      throw new BadRequestException('Invalid object key');
    }

    const url = await this.storageService.getSignedDownloadUrl(normalized);
    return { success: true, data: { url } };
  }

  /**
   * Stream an S3 object through the backend so that browsers can reach
   * media stored behind an internal-only S3 endpoint (SeaweedFS / Garage).
   */
  @Public()
  @SkipThrottle()
  @Get('file/{*key}')
  @ApiOperation({ summary: 'Stream an S3 object (public proxy)' })
  async streamFile(@Param('key') key: string | string[], @Res() res: Response) {
    const raw = Array.isArray(key) ? key.join('/') : key;
    const normalized = raw.replace(/\\/g, '/');
    if (
      !normalized ||
      normalized.includes('..') ||
      normalized.startsWith('/')
    ) {
      throw new BadRequestException('Invalid object key');
    }

    try {
      const { stream, contentType } =
        await this.storageService.getObject(normalized);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      stream.pipe(res);
    } catch {
      throw new NotFoundException('Object not found');
    }
  }
}
