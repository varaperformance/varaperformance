import {
  Controller,
  Get,
  Header,
  Body,
  Put,
  Post,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { ProfileService } from './profile.service';
import { StorageService } from '@app/common/storage';
import {
  SaveProfileDto,
  CheckDisplayNameDto,
  AssociateGymsDto,
  CreateProfileAddressDto,
  UpdateProfileAddressDto,
  ProfileAddressIdParamDto,
} from './dto/profile.dto';
import { ActiveUser } from '../idm/decorators/active-user.decorator';
import { Permissions } from '../idm/decorators/permissions.decorator';
import { Public } from '../idm/decorators/public.decorator';
import type { JwtPayload } from '../idm/interfaces/jwt.interface';

// Multer file type (matches Express.Multer.File)
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@ApiTags('profile')
@Throttle({ default: { ttl: 10000, limit: 40 } })
@Controller({
  path: 'profile',
  version: '1',
})
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly storageService: StorageService,
  ) {}

  @ApiOperation({ summary: 'Get minimal profile (no PII)' })
  @ApiOkResponse({
    description: 'Minimal profile: userId, displayName, avatarUrl, completedAt',
  })
  @Throttle({ default: { ttl: 60000, limit: 180 } })
  @Permissions('profile:read')
  @Get()
  findOne(@ActiveUser() user: JwtPayload) {
    return this.profileService.findByUserId(user.sub);
  }

  @ApiOperation({ summary: 'Get full profile with PII' })
  @ApiOkResponse({ description: 'Full profile including decrypted PII' })
  @Throttle({ default: { ttl: 60000, limit: 180 } })
  @Permissions('profile:read')
  @Get('details')
  findDetails(@ActiveUser() user: JwtPayload) {
    return this.profileService.findDetailsByUserId(user.sub);
  }

  @ApiOperation({
    summary: 'Get a profile by display name (safe public fields)',
  })
  @ApiOkResponse({ description: 'Public profile payload for profile pages' })
  @Public()
  @Header('Cache-Control', 'public, max-age=60')
  @Get('public/:displayName')
  findPublicByDisplayName(
    @Param('displayName') displayName: string,
    @ActiveUser() user?: JwtPayload,
  ) {
    return this.profileService.findPublicByDisplayName(displayName, user?.sub);
  }

  @ApiOperation({ summary: 'Save current user profile' })
  @ApiOkResponse({ description: 'Profile saved' })
  @Permissions('profile:update')
  @Put()
  save(@Body() data: SaveProfileDto, @ActiveUser() user: JwtPayload) {
    return this.profileService.upsert(user.sub, data);
  }

  @ApiOperation({ summary: 'Mark profile as completed' })
  @ApiOkResponse({ description: 'Profile marked as completed' })
  @Permissions('profile:update')
  @Post('complete')
  complete(@ActiveUser() user: JwtPayload) {
    return this.profileService.complete(user.sub);
  }

  @ApiOperation({ summary: 'Check if display name is available' })
  @ApiOkResponse({ description: 'Display name availability status' })
  @Permissions('profile:read')
  @Get('check-display-name')
  checkDisplayName(
    @Query() query: CheckDisplayNameDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.profileService.checkDisplayNameAvailability(
      query.displayName,
      user.sub,
    );
  }

  @ApiOperation({ summary: 'Associate gyms with profile' })
  @ApiOkResponse({ description: 'Gyms associated with profile' })
  @Permissions('profile:update')
  @Put('gyms')
  associateGyms(
    @Body() data: AssociateGymsDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.profileService.associateGyms(user.sub, data.places);
  }

  @ApiOperation({ summary: 'Get associated gyms for profile' })
  @ApiOkResponse({ description: 'List of associated gyms' })
  @Permissions('profile:read')
  @Get('gyms')
  getGyms(@ActiveUser() user: JwtPayload) {
    return this.profileService.getGyms(user.sub);
  }

  @ApiOperation({ summary: 'List saved profile addresses' })
  @ApiOkResponse({ description: 'List of saved addresses' })
  @Permissions('profile:read')
  @Get('addresses')
  listAddresses(@ActiveUser() user: JwtPayload) {
    return this.profileService.listAddresses(user.sub);
  }

  @ApiOperation({ summary: 'Create profile address' })
  @ApiOkResponse({ description: 'Address created' })
  @Permissions('profile:update')
  @Post('addresses')
  createAddress(
    @Body() dto: CreateProfileAddressDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.profileService.createAddress(user.sub, dto);
  }

  @ApiOperation({ summary: 'Update profile address' })
  @ApiOkResponse({ description: 'Address updated' })
  @Permissions('profile:update')
  @Put('addresses/:addressId')
  updateAddress(
    @Param() params: ProfileAddressIdParamDto,
    @Body() dto: UpdateProfileAddressDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.profileService.updateAddress(user.sub, params.addressId, dto);
  }

  @ApiOperation({ summary: 'Delete profile address' })
  @ApiOkResponse({ description: 'Address deleted' })
  @Permissions('profile:update')
  @Post('addresses/:addressId/delete')
  deleteAddress(
    @Param() params: ProfileAddressIdParamDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.profileService.deleteAddress(user.sub, params.addressId);
  }

  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Avatar uploaded successfully' })
  @Permissions('profile:update')
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadAvatar(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
        ],
      }),
    )
    file: MulterFile,
    @ActiveUser() user: JwtPayload,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type manually
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed: JPEG, PNG, GIF, WebP',
      );
    }

    const uploaded = await this.storageService.uploadBuffer({
      folder: 'avatars',
      originalName: file.originalname,
      contentType: file.mimetype,
      body: file.buffer,
      allowedMimeTypes,
    });

    const avatarUrl = uploaded.url;
    return this.profileService.updateAvatar(user.sub, avatarUrl);
  }

  @ApiOperation({ summary: 'Upload user cover photo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Cover photo uploaded successfully' })
  @Permissions('profile:update')
  @Post('cover')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadCover(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB for cover photos
        ],
      }),
    )
    file: MulterFile,
    @ActiveUser() user: JwtPayload,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type manually
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed: JPEG, PNG, GIF, WebP',
      );
    }

    const uploaded = await this.storageService.uploadBuffer({
      folder: 'covers',
      originalName: file.originalname,
      contentType: file.mimetype,
      body: file.buffer,
      allowedMimeTypes,
    });

    const coverUrl = uploaded.url;
    return this.profileService.updateCover(user.sub, coverUrl);
  }
}
