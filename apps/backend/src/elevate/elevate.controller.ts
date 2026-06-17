import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { ElevateService } from './elevate.service';
import { ElevateGateway } from './elevate.gateway';
import { StorageService } from '@app/common/storage';
import {
  CreateElevatePostDto,
  UpdateElevatePostDto,
  CreateElevateCommentDto,
  UpdateElevateCommentDto,
  ElevateFeedQueryDto,
  CreateElevateReportDto,
  UpdateElevateReportDto,
  AdminElevateReportsQueryDto,
  CreateElevateStoryDto,
  SendGymPartnerRequestDto,
  RespondGymPartnerRequestDto,
  GymPartnersQueryDto,
  ElevateFeedQueryExtendedDto,
  SearchUsersQueryDto,
} from './dto/elevate.dto';
import { ActiveUser } from '../idm/decorators/active-user.decorator';
import { Permissions } from '../idm/decorators/permissions.decorator';
import { Public } from '../idm/decorators/public.decorator';
import type { JwtPayload } from '../idm/interfaces/jwt.interface';

// Multer file type
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@ApiTags('elevate')
@Throttle({ default: { ttl: 10000, limit: 40 } })
@Controller({
  path: 'elevate',
  version: '1',
})
export class ElevateController {
  constructor(
    private readonly elevateService: ElevateService,
    private readonly storageService: StorageService,
    private readonly elevateGateway: ElevateGateway,
  ) {}

  // ============ Posts ============

  @ApiOperation({ summary: 'Upload images for a post' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Images uploaded successfully' })
  @Permissions('elevate:create')
  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 10, { storage: memoryStorage() }))
  async uploadImages(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB per file
        ],
      }),
    )
    files: MulterFile[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @ActiveUser() _user: JwtPayload,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    const urls: string[] = [];

    for (const file of files) {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `Invalid file type for ${file.originalname}. Allowed: JPEG, PNG, GIF, WebP`,
        );
      }
      const uploaded = await this.storageService.uploadBuffer({
        folder: 'posts',
        originalName: file.originalname,
        contentType: file.mimetype,
        body: file.buffer,
        allowedMimeTypes,
      });
      urls.push(uploaded.url);
    }

    return { success: true, data: { urls } };
  }

  @ApiOperation({ summary: 'Get feed of posts' })
  @ApiOkResponse({ description: 'Paginated feed of posts' })
  @Public()
  @Get()
  getFeed(
    @Query() query: ElevateFeedQueryDto,
    @ActiveUser() user?: JwtPayload,
  ) {
    return this.elevateService.getFeed(user?.sub, query);
  }

  // ============ Stories ============
  // Note: Stories routes must come BEFORE :id routes to avoid route conflicts

  @ApiOperation({ summary: 'Get stories feed (grouped by user)' })
  @ApiOkResponse({ description: 'Stories grouped by user' })
  @Permissions('elevate:read')
  @Get('stories')
  getStories(@ActiveUser() user: JwtPayload) {
    return this.elevateService.getStories(user.sub);
  }

  @ApiOperation({ summary: 'Create a new story' })
  @ApiOkResponse({ description: 'Story created' })
  @Permissions('elevate:create')
  @Post('stories')
  createStory(
    @Body() data: CreateElevateStoryDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.elevateService.createStory(user.sub, data);
  }

  @ApiOperation({ summary: 'Mark story as viewed' })
  @ApiOkResponse({ description: 'Story marked as viewed' })
  @Permissions('elevate:create')
  @Post('stories/:storyId/view')
  viewStory(@Param('storyId') storyId: string, @ActiveUser() user: JwtPayload) {
    return this.elevateService.viewStory(user.sub, storyId);
  }

  @ApiOperation({ summary: 'Delete own story' })
  @ApiOkResponse({ description: 'Story deleted' })
  @Permissions('elevate:delete')
  @Delete('stories/:storyId')
  deleteStory(
    @Param('storyId') storyId: string,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.elevateService.deleteStory(user.sub, storyId);
  }

  @ApiOperation({ summary: 'Upload story media' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Story media uploaded' })
  @Permissions('elevate:create')
  @Post('stories/upload')
  @UseInterceptors(
    FilesInterceptor('files', 1, {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for videos
    }),
  )
  async uploadStoryMedia(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
        ],
        fileIsRequired: true,
      }),
    )
    files: MulterFile[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @ActiveUser() _user: JwtPayload,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime',
    ];

    const file = files[0];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: JPEG, PNG, GIF, WebP, MP4, WebM, QuickTime`,
      );
    }

    const uploaded = await this.storageService.uploadBuffer({
      folder: 'stories',
      originalName: file.originalname,
      contentType: file.mimetype,
      body: file.buffer,
      allowedMimeTypes,
    });

    const isVideo = file.mimetype.startsWith('video/');
    return {
      success: true,
      data: {
        url: uploaded.url,
        mediaType: isVideo ? 'VIDEO' : 'IMAGE',
      },
    };
  }

  // ============ Gym Partners ============

  @ApiOperation({ summary: 'Get gym partners list' })
  @ApiOkResponse({ description: 'List of gym partners' })
  @Permissions('elevate:read')
  @Get('partners')
  getGymPartners(
    @Query() query: GymPartnersQueryDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.elevateService.getGymPartners(user.sub, query);
  }

  @ApiOperation({ summary: 'Get pending gym partner requests' })
  @ApiOkResponse({ description: 'Pending incoming requests' })
  @Permissions('elevate:read')
  @Get('partners/pending')
  getPendingRequests(@ActiveUser() user: JwtPayload) {
    return this.elevateService.getPendingRequests(user.sub);
  }

  @ApiOperation({ summary: 'Get gym partner suggestions' })
  @ApiOkResponse({ description: 'Suggested gym partners' })
  @Permissions('elevate:read')
  @Get('partners/suggestions')
  getGymPartnerSuggestions(@ActiveUser() user: JwtPayload) {
    return this.elevateService.getGymPartnerSuggestions(user.sub);
  }

  @ApiOperation({ summary: 'Search users to add as partners' })
  @ApiOkResponse({ description: 'Search results' })
  @Permissions('elevate:read')
  @Get('partners/search')
  searchUsers(
    @Query() query: SearchUsersQueryDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.elevateService.searchUsers(user.sub, query);
  }

  @ApiOperation({ summary: 'Send gym partner request' })
  @ApiOkResponse({ description: 'Request sent' })
  @Permissions('elevate:create')
  @Post('partners/request')
  sendGymPartnerRequest(
    @Body() data: SendGymPartnerRequestDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.elevateService.sendGymPartnerRequest(user.sub, data);
  }

  @ApiOperation({ summary: 'Respond to gym partner request' })
  @ApiOkResponse({ description: 'Response recorded' })
  @Permissions('elevate:create')
  @Post('partners/request/:requestId/respond')
  respondToGymPartnerRequest(
    @Param('requestId') requestId: string,
    @Body() data: RespondGymPartnerRequestDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.elevateService.respondToGymPartnerRequest(
      user.sub,
      requestId,
      data,
    );
  }

  @ApiOperation({ summary: 'Remove gym partner' })
  @ApiOkResponse({ description: 'Partner removed' })
  @Permissions('elevate:delete')
  @Delete('partners/:partnerId')
  removeGymPartner(
    @Param('partnerId') partnerId: string,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.elevateService.removeGymPartner(user.sub, partnerId);
  }

  @ApiOperation({ summary: 'Get profile stats for social page' })
  @ApiOkResponse({ description: 'Profile stats returned' })
  @Permissions('elevate:read')
  @Get('profile-stats')
  getProfileStats(@ActiveUser() user: JwtPayload) {
    return this.elevateService.getProfileStats(user.sub);
  }

  @ApiOperation({
    summary: 'Get gym stats (who is training, peak hours, trending exercises)',
  })
  @ApiOkResponse({ description: 'Gym stats returned' })
  @Permissions('elevate:read')
  @Get('gym-stats')
  getGymStats(@ActiveUser() user: JwtPayload) {
    return this.elevateService.getGymStats(user.sub);
  }

  @ApiOperation({ summary: 'Get feed with mode (partners/public/momentum)' })
  @ApiOkResponse({ description: 'Feed with mode filter' })
  @Permissions('elevate:read')
  @Get('feed')
  getFeedWithMode(
    @Query() query: ElevateFeedQueryExtendedDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.elevateService.getFeedWithMode(user.sub, query);
  }

  // ============ Posts ============

  @ApiOperation({ summary: 'Get a single post' })
  @ApiOkResponse({ description: 'Post details' })
  @Permissions('elevate:read')
  @Get(':id')
  getPost(@Param('id') id: string, @ActiveUser() user: JwtPayload) {
    return this.elevateService.getPost(user.sub, id);
  }

  @ApiOperation({ summary: 'Create a new post' })
  @ApiOkResponse({ description: 'Post created' })
  @Permissions('elevate:create')
  @Throttle({ default: { ttl: 1000, limit: 10 } })
  @Post()
  async createPost(
    @Body() data: CreateElevatePostDto,
    @ActiveUser() user: JwtPayload,
  ) {
    const result = await this.elevateService.createPost(user.sub, data);

    if (result.success) {
      this.elevateGateway.emitFeedRefresh({
        reason: 'post_created',
        postId: result.data.id,
        actorUserId: user.sub,
      });
    }

    return result;
  }

  @ApiOperation({ summary: 'Update a post' })
  @ApiOkResponse({ description: 'Post updated' })
  @Permissions('elevate:update')
  @Patch(':id')
  async updatePost(
    @Param('id') id: string,
    @Body() data: UpdateElevatePostDto,
    @ActiveUser() user: JwtPayload,
  ) {
    const result = await this.elevateService.updatePost(user.sub, id, data);

    if (result.success) {
      this.elevateGateway.emitFeedRefresh({
        reason: 'post_updated',
        postId: id,
        actorUserId: user.sub,
      });
    }

    return result;
  }

  @ApiOperation({ summary: 'Delete a post' })
  @ApiOkResponse({ description: 'Post deleted' })
  @Permissions('elevate:delete')
  @Delete(':id')
  async deletePost(@Param('id') id: string, @ActiveUser() user: JwtPayload) {
    const result = await this.elevateService.deletePost(user.sub, id);

    if (result.success) {
      this.elevateGateway.emitFeedRefresh({
        reason: 'post_deleted',
        postId: id,
        actorUserId: user.sub,
      });
    }

    return result;
  }

  // ============ High Fives (Reactions) ============

  @ApiOperation({ summary: 'Toggle high five on a post' })
  @ApiOkResponse({ description: 'High five toggled' })
  @Permissions('elevate:create')
  @Post(':id/high-five')
  async toggleHighFive(
    @Param('id') id: string,
    @ActiveUser() user: JwtPayload,
  ) {
    const result = await this.elevateService.toggleHighFive(user.sub, id);

    if (result.success) {
      this.elevateGateway.emitFeedRefresh({
        reason: 'post_reacted',
        postId: id,
        actorUserId: user.sub,
      });
    }

    return result;
  }

  // ============ Saved Posts ============

  @ApiOperation({ summary: 'Toggle save/bookmark on a post' })
  @ApiOkResponse({ description: 'Save toggled' })
  @Permissions('elevate:create')
  @Post(':id/save')
  toggleSave(@Param('id') id: string, @ActiveUser() user: JwtPayload) {
    return this.elevateService.toggleSave(user.sub, id);
  }

  // ============ Comments ============

  @ApiOperation({ summary: 'Get comments for a post' })
  @ApiOkResponse({ description: 'List of comments' })
  @Permissions('elevate:read')
  @Get(':id/comments')
  getComments(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.elevateService.getComments(id, page, limit);
  }

  @ApiOperation({ summary: 'Create a comment on a post' })
  @ApiOkResponse({ description: 'Comment created' })
  @Permissions('elevate:create')
  @Throttle({ default: { ttl: 1000, limit: 10 } })
  @Post(':id/comments')
  async createComment(
    @Param('id') id: string,
    @Body() data: CreateElevateCommentDto,
    @ActiveUser() user: JwtPayload,
  ) {
    const result = await this.elevateService.createComment(user.sub, id, data);

    if (result.success) {
      this.elevateGateway.emitFeedRefresh({
        reason: 'comment_created',
        postId: id,
        commentId: result.data.id,
        actorUserId: user.sub,
      });
    }

    return result;
  }

  @ApiOperation({ summary: 'Update a comment' })
  @ApiOkResponse({ description: 'Comment updated' })
  @Permissions('elevate:update')
  @Patch('comments/:commentId')
  async updateComment(
    @Param('commentId') commentId: string,
    @Body() data: UpdateElevateCommentDto,
    @ActiveUser() user: JwtPayload,
  ) {
    const result = await this.elevateService.updateComment(
      user.sub,
      commentId,
      data,
    );

    if (result.success) {
      this.elevateGateway.emitFeedRefresh({
        reason: 'comment_updated',
        commentId,
        actorUserId: user.sub,
      });
    }

    return result;
  }

  @ApiOperation({ summary: 'Delete a comment' })
  @ApiOkResponse({ description: 'Comment deleted' })
  @Permissions('elevate:delete')
  @Delete('comments/:commentId')
  async deleteComment(
    @Param('commentId') commentId: string,
    @ActiveUser() user: JwtPayload,
  ) {
    const result = await this.elevateService.deleteComment(user.sub, commentId);

    if (result.success) {
      this.elevateGateway.emitFeedRefresh({
        reason: 'comment_deleted',
        commentId,
        actorUserId: user.sub,
      });
    }

    return result;
  }

  // ============ Reports ============

  @ApiOperation({ summary: 'Report a post' })
  @ApiOkResponse({ description: 'Post reported' })
  @Permissions('elevate:create')
  @Throttle({ default: { ttl: 1000, limit: 10 } })
  @Post(':id/report')
  async reportPost(
    @Param('id') id: string,
    @Body() data: CreateElevateReportDto,
    @ActiveUser() user: JwtPayload,
  ) {
    const result = await this.elevateService.reportPost(user.sub, id, data);

    if (result.success) {
      this.elevateGateway.emitFeedRefresh({
        reason: 'moderation_action',
        postId: id,
        actorUserId: user.sub,
      });
    }

    return result;
  }

  // ============ Admin Reports ============

  @ApiOperation({ summary: 'Get all reported posts (admin)' })
  @ApiOkResponse({ description: 'List of reported posts' })
  @Permissions('elevate:moderate')
  @Get('admin/reports')
  getReports(@Query() query: AdminElevateReportsQueryDto) {
    return this.elevateService.getReports(query);
  }

  @ApiOperation({ summary: 'Update report status (admin)' })
  @ApiOkResponse({ description: 'Report status updated' })
  @Permissions('elevate:moderate')
  @Patch('admin/reports/:reportId')
  async updateReportStatus(
    @Param('reportId') reportId: string,
    @Body() data: UpdateElevateReportDto,
    @ActiveUser() user: JwtPayload,
  ) {
    const result = await this.elevateService.updateReportStatus(
      user.sub,
      reportId,
      data,
    );

    if (result.success) {
      this.elevateGateway.emitFeedRefresh({
        reason: 'moderation_action',
        actorUserId: user.sub,
      });
    }

    return result;
  }

  @ApiOperation({ summary: 'Delete a reported post (admin)' })
  @ApiOkResponse({ description: 'Post deleted by moderator' })
  @Permissions('elevate:moderate')
  @Delete('admin/posts/:postId')
  async adminDeletePost(
    @Param('postId') postId: string,
    @ActiveUser() user: JwtPayload,
  ) {
    const result = await this.elevateService.adminDeletePost(user.sub, postId);

    if (result.success) {
      this.elevateGateway.emitFeedRefresh({
        reason: 'moderation_action',
        postId,
        actorUserId: user.sub,
      });
    }

    return result;
  }
}
