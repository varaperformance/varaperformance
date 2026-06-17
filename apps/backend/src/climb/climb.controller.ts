import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { StorageService } from '@app/common/storage';
import { ActiveUser } from 'src/idm/decorators/active-user.decorator';
import { Permissions } from 'src/idm/decorators/permissions.decorator';
import type { JwtPayload } from 'src/idm/interfaces/jwt.interface';
import { ClimbEntriesQueryDto, CreateClimbEntryDto } from './dto/climb.dto';
import { ClimbService } from './climb.service';

interface MulterFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@ApiTags('climb')
@Controller({
  version: '1',
  path: 'climb',
})
export class ClimbController {
  constructor(
    private readonly climbService: ClimbService,
    private readonly storageService: StorageService,
  ) {}

  @ApiOperation({ summary: 'Get climb entries for current user' })
  @ApiOkResponse({ description: 'Climb entries retrieved' })
  @Permissions('climb:read')
  @Get('entries')
  getEntries(
    @Query() query: ClimbEntriesQueryDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.climbService.getEntries(user, query);
  }

  @ApiOperation({ summary: 'Create or update daily climb entry' })
  @ApiOkResponse({ description: 'Climb entry saved' })
  @Permissions('climb:create')
  @Post('entries')
  upsertEntry(
    @Body() data: CreateClimbEntryDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.climbService.upsertEntry(user, data);
  }

  @ApiOperation({ summary: 'Delete climb entry' })
  @ApiOkResponse({ description: 'Climb entry deleted' })
  @Permissions('climb:delete')
  @Delete('entries/:id')
  deleteEntry(@Param('id') id: string, @ActiveUser() user: JwtPayload) {
    return this.climbService.deleteEntry(user, id);
  }

  @ApiOperation({ summary: 'Upload climb selfie image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiOkResponse({ description: 'Climb image uploaded' })
  @Permissions('climb:create')
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async upload(
    @UploadedFile() file: MulterFile,
    @ActiveUser() user: JwtPayload,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed: JPEG, PNG, WebP',
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('File too large. Maximum 10MB');
    }

    const uploaded = await this.storageService.uploadBuffer({
      folder: `climb/${user.sub}`,
      originalName: file.originalname,
      contentType: file.mimetype,
      body: file.buffer,
      allowedMimeTypes,
    });

    return {
      success: true,
      data: { url: uploaded.url },
      message: 'Climb image uploaded',
    };
  }
}
