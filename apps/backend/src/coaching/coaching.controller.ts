import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Req,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { Public } from '../idm/decorators/public.decorator';
import { Permissions } from '../idm/decorators/permissions.decorator';
import { ActiveUser } from '../idm/decorators/active-user.decorator';
import { SkipAudit } from '@app/common/audit';
import { CoachingService } from './coaching.service';
import { StorageService } from '@app/common/storage';
import {
  ApplyCoachDto,
  CoachQueryDto,
  CreateCoachReviewDto,
  CreateCoachPackageDto,
  SignContractDto,
  UpdateBookingStatusDto,
  UpdateCoachPackageDto,
} from './dto/coaching.dto';
import type { Request } from 'express';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@ApiTags('coaching')
@Throttle({ default: { ttl: 10000, limit: 40 } })
@Controller({
  path: 'coaches',
  version: '1',
})
export class CoachingController {
  constructor(
    private readonly coachingService: CoachingService,
    private readonly storageService: StorageService,
  ) {}

  // ============================================
  // Coach Dashboard Routes (authenticated coach)
  // ============================================

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user coach profile' })
  @ApiOkResponse({ description: 'Coach profile for logged-in user' })
  @Permissions('coach:read')
  @Get('me')
  getMyProfile(@ActiveUser('sub') userId: string) {
    return this.coachingService.getMyCoachProfile(userId);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get coach dashboard stats' })
  @ApiOkResponse({ description: 'Dashboard statistics' })
  @Permissions('coaching:read')
  @Get('me/dashboard')
  getDashboard(@ActiveUser('sub') userId: string) {
    return this.coachingService.getDashboardStats(userId);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update coach availability status' })
  @ApiOkResponse({ description: 'Coach availability updated' })
  @Permissions('coaching:update')
  @Patch('me/availability')
  updateMyAvailability(
    @ActiveUser('sub') userId: string,
    @Body('isAvailable') isAvailable: boolean,
  ) {
    return this.coachingService.updateMyAvailability(userId, isAvailable);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get coach clients list' })
  @ApiOkResponse({ description: 'List of clients with booking info' })
  @Permissions('coaching:read')
  @Get('me/clients')
  getMyClients(
    @ActiveUser('sub') userId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.coachingService.getMyClients(userId, {
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get coach packages for logged-in coach' })
  @ApiOkResponse({
    description: 'List of coach packages (active and archived)',
  })
  @Permissions('coaching:read')
  @Get('me/packages')
  getMyPackages(@ActiveUser('sub') userId: string) {
    return this.coachingService.getMyPackages(userId);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a new coach package' })
  @ApiOkResponse({ description: 'Created coach package' })
  @Permissions('coaching:update')
  @Post('me/packages')
  createMyPackage(
    @ActiveUser('sub') userId: string,
    @Body() dto: CreateCoachPackageDto,
  ) {
    return this.coachingService.createMyPackage(userId, dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update an existing coach package' })
  @ApiOkResponse({ description: 'Updated coach package' })
  @Permissions('coaching:update')
  @Patch('me/packages/:packageId')
  updateMyPackage(
    @ActiveUser('sub') userId: string,
    @Param('packageId') packageId: string,
    @Body() dto: UpdateCoachPackageDto,
  ) {
    return this.coachingService.updateMyPackage(userId, packageId, dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Archive a coach package' })
  @ApiOkResponse({ description: 'Archived coach package' })
  @Permissions('coaching:update')
  @Patch('me/packages/:packageId/archive')
  archiveMyPackage(
    @ActiveUser('sub') userId: string,
    @Param('packageId') packageId: string,
  ) {
    return this.coachingService.archiveMyPackage(userId, packageId);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Delete a coach package if no active subscriptions',
  })
  @ApiOkResponse({ description: 'Deleted coach package' })
  @Permissions('coaching:update')
  @Delete('me/packages/:packageId')
  deleteMyPackage(
    @ActiveUser('sub') userId: string,
    @Param('packageId') packageId: string,
  ) {
    return this.coachingService.deleteMyPackage(userId, packageId);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Export client list as CSV' })
  @ApiOkResponse({ description: 'CSV export of all clients' })
  @Permissions('coaching:read')
  @Get('me/clients/export')
  exportClientsCsv(@ActiveUser('sub') userId: string) {
    return this.coachingService.exportClientsCsv(userId);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get detailed client info including intake form' })
  @ApiOkResponse({ description: 'Client details with decrypted intake data' })
  @Permissions('coaching:read')
  @Get('me/clients/:bookingId')
  getClientDetails(
    @ActiveUser('sub') userId: string,
    @Param('bookingId') bookingId: string,
  ) {
    return this.coachingService.getClientDetails(userId, bookingId);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Get client metrics (workout, food, weight, water) for active subscriptions',
  })
  @ApiOkResponse({ description: 'Client metrics data for coach dashboard' })
  @Permissions('coaching:read')
  @Get('me/clients/:bookingId/metrics')
  getClientMetrics(
    @ActiveUser('sub') userId: string,
    @Param('bookingId') bookingId: string,
    @Query('days') days?: string,
  ) {
    return this.coachingService.getClientMetrics(userId, bookingId, {
      days: days ? parseInt(days, 10) : undefined,
    });
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get client activity timeline (workouts, meals, PRs, habits)',
  })
  @ApiOkResponse({ description: 'Chronological activity feed for client' })
  @Permissions('coaching:read')
  @Get('me/clients/:bookingId/activity')
  getClientActivity(
    @ActiveUser('sub') userId: string,
    @Param('bookingId') bookingId: string,
    @Query('days') days?: string,
    @Query('limit') limit?: string,
  ) {
    return this.coachingService.getClientActivityTimeline(userId, bookingId, {
      days: days ? parseInt(days, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update booking status (approve, complete, cancel)',
  })
  @ApiOkResponse({ description: 'Updated booking status' })
  @Permissions('coaching:update')
  @Patch('me/clients/:bookingId/status')
  updateBookingStatus(
    @ActiveUser('sub') userId: string,
    @Param('bookingId') bookingId: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.coachingService.updateBookingStatus(
      userId,
      bookingId,
      dto.status,
    );
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get coach revenue history' })
  @ApiOkResponse({ description: 'Monthly revenue data for charts' })
  @Permissions('coaching:read')
  @Get('me/revenue')
  getRevenueHistory(
    @ActiveUser('sub') userId: string,
    @Query('months') months?: string,
  ) {
    return this.coachingService.getRevenueHistory(
      userId,
      months ? parseInt(months, 10) : undefined,
    );
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get aggregate client analytics' })
  @ApiOkResponse({
    description: 'Aggregate analytics across all active clients',
  })
  @Permissions('coaching:read')
  @Get('me/analytics')
  getClientAnalytics(
    @ActiveUser('sub') userId: string,
    @Query('days') days?: string,
  ) {
    return this.coachingService.getClientAnalytics(
      userId,
      days ? parseInt(days, 10) : undefined,
    );
  }

  // ============================================
  // Public Coach Routes
  // ============================================

  @Public()
  @SkipAudit()
  @ApiOperation({ summary: 'Get list of coaches with optional filters' })
  @ApiOkResponse({ description: 'List of coaches with pagination' })
  @Header('Cache-Control', 'public, max-age=60')
  @Get()
  findAll(@Query() query: CoachQueryDto) {
    return this.coachingService.findAll(query);
  }

  @Public()
  @SkipAudit()
  @ApiOperation({ summary: 'Get featured coaches for homepage' })
  @ApiOkResponse({ description: 'List of featured coaches' })
  @Header('Cache-Control', 'public, max-age=60')
  @Get('featured')
  getFeatured(@Query('limit') limit?: string) {
    return this.coachingService.getFeatured(
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Apply as a coach (authenticated users)' })
  @ApiOkResponse({ description: 'Coach application submitted for review' })
  @Post('apply')
  applyAsCoach(@ActiveUser('sub') userId: string, @Body() dto: ApplyCoachDto) {
    return this.coachingService.applyAsCoach(userId, dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Upload coach certification photo' })
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
  @ApiOkResponse({ description: 'Certification photo uploaded successfully' })
  @Post('apply/certification-photo')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadCertificationPhoto(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 })],
      }),
    )
    file: MulterFile,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

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
      folder: 'coach-certifications',
      originalName: file.originalname,
      contentType: file.mimetype,
      body: file.buffer,
      allowedMimeTypes,
    });

    return {
      success: true,
      data: {
        photoUrl: uploaded.url,
      },
    };
  }

  // ==========================================================================
  // Admin Coach Management (MUST be before :slug route)
  // ==========================================================================

  @ApiOperation({ summary: 'Get all coaches for admin management' })
  @ApiOkResponse({ description: 'Coach list with verification status' })
  @ApiBearerAuth()
  @Permissions('coach:read')
  @Get('admin')
  getCoachesAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.coachingService.getCoachesAdmin(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
    );
  }

  @ApiOperation({ summary: 'Get single coach details for admin' })
  @ApiOkResponse({ description: 'Coach details' })
  @ApiBearerAuth()
  @Permissions('coach:read')
  @Get('admin/:id')
  getCoachAdmin(@Param('id') id: string) {
    return this.coachingService.getCoachAdmin(id);
  }

  @ApiOperation({ summary: 'Approve a coach application' })
  @ApiOkResponse({ description: 'Coach approved' })
  @ApiBearerAuth()
  @Permissions('coach:update')
  @Post('admin/:id/approve')
  approveCoach(@Param('id') id: string) {
    return this.coachingService.approveCoach(id);
  }

  @ApiOperation({ summary: 'Reject/revoke a coach application' })
  @ApiOkResponse({ description: 'Coach rejected' })
  @ApiBearerAuth()
  @Permissions('coach:update')
  @Post('admin/:id/reject')
  rejectCoach(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.coachingService.rejectCoach(id, reason);
  }

  @ApiOperation({ summary: 'Toggle coach featured status' })
  @ApiOkResponse({ description: 'Coach featured status toggled' })
  @ApiBearerAuth()
  @Permissions('coach:update')
  @Patch('admin/:id/featured')
  toggleCoachFeatured(@Param('id') id: string) {
    return this.coachingService.toggleCoachFeatured(id);
  }

  @ApiOperation({ summary: 'Delete a coach account' })
  @ApiOkResponse({ description: 'Coach deleted' })
  @ApiBearerAuth()
  @Permissions('coach:update')
  @Delete('admin/:id')
  deleteCoach(@Param('id') id: string) {
    return this.coachingService.deleteCoach(id);
  }

  // ==========================================================================
  // Public Coach Routes with dynamic params (MUST be after static routes)
  // ==========================================================================

  @Public()
  @SkipAudit()
  @ApiOperation({ summary: 'Get coach details by slug (profile displayName)' })
  @ApiParam({
    name: 'slug',
    description: 'Coach profile displayName (URL slug)',
  })
  @ApiOkResponse({ description: 'Full coach details with packages' })
  @Header('Cache-Control', 'public, max-age=60')
  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.coachingService.findOne(slug);
  }

  @Public()
  @SkipAudit()
  @ApiOperation({ summary: 'Get reviews for a coach' })
  @ApiParam({ name: 'id', description: 'Coach UUID' })
  @ApiOkResponse({ description: 'Coach reviews with pagination' })
  @Header('Cache-Control', 'public, max-age=60')
  @Get(':id/reviews')
  getReviews(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.coachingService.getReviews(
      id,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create or update a review for a coach' })
  @ApiParam({ name: 'id', description: 'Coach UUID' })
  @ApiOkResponse({ description: 'Review submitted successfully' })
  @Post(':id/reviews')
  createReview(
    @ActiveUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateCoachReviewDto,
  ) {
    return this.coachingService.createReview(userId, id, dto);
  }

  @Public()
  @SkipAudit()
  @ApiOperation({ summary: 'Get active contract for a coach' })
  @ApiParam({ name: 'id', description: 'Coach UUID' })
  @ApiOkResponse({ description: 'Coach contract' })
  @Header('Cache-Control', 'public, max-age=60')
  @Get(':id/contract')
  getContract(@Param('id') id: string) {
    return this.coachingService.getContract(id);
  }

  @ApiOperation({ summary: 'Sign a contract for a booking' })
  @ApiOkResponse({ description: 'Contract signature created' })
  @Permissions('booking:create')
  @Post('contracts/sign')
  signContract(
    @ActiveUser('sub') userId: string,
    @Body() dto: SignContractDto,
    @Req() req: Request,
  ) {
    return this.coachingService.signContract({
      userId,
      bookingId: dto.bookingId,
      contractId: dto.contractId,
      signature: dto.signature,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
