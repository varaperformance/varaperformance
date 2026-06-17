import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ActiveUser } from '../idm/decorators/active-user.decorator';
import { Permissions } from '../idm/decorators/permissions.decorator';
import { MessagingService } from './messaging.service';
import { MessagingGateway } from './messaging.gateway';
import {
  StartConversationDto,
  SendMessageDto,
  UpdateMessageDto,
  AddReactionDto,
  ConversationQueryDto,
  MessagesQueryDto,
  MessageSearchQueryDto,
  UpdateConversationStatusDto,
  GiphySearchQueryDto,
  GiphyTrendingQueryDto,
} from './dto/messaging.dto';
import { GiphyService } from './giphy.service';

@ApiTags('messaging')
@ApiBearerAuth('access-token')
@Throttle({ default: { ttl: 10000, limit: 40 } })
@Controller({
  path: 'messaging',
  version: '1',
})
export class MessagingController {
  constructor(
    private readonly messagingService: MessagingService,
    private readonly messagingGateway: MessagingGateway,
    private readonly giphyService: GiphyService,
  ) {}

  // ============================================
  // Conversation Routes
  // ============================================

  @ApiOperation({ summary: 'Get all conversations for current user' })
  @ApiOkResponse({ description: 'List of conversations' })
  @Throttle({ default: { ttl: 10000, limit: 60 } })
  @Permissions('messaging:read')
  @Get('conversations')
  getConversations(
    @ActiveUser('sub') userId: string,
    @Query() query: ConversationQueryDto,
  ) {
    return this.messagingService.getConversations(userId, query);
  }

  @ApiOperation({ summary: 'Start or get an existing conversation' })
  @ApiOkResponse({ description: 'Conversation details' })
  @Permissions('messaging:create')
  @Post('conversations')
  startConversation(
    @ActiveUser('sub') userId: string,
    @Body() data: StartConversationDto,
  ) {
    return this.messagingService.startConversation(userId, data);
  }

  @ApiOperation({ summary: 'Get a specific conversation' })
  @ApiParam({ name: 'conversationId', description: 'Conversation UUID' })
  @ApiOkResponse({ description: 'Conversation details' })
  @Throttle({ default: { ttl: 10000, limit: 60 } })
  @Permissions('messaging:read')
  @Get('conversations/:conversationId')
  getConversation(
    @ActiveUser('sub') userId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.messagingService.getConversation(userId, conversationId);
  }

  @ApiOperation({ summary: 'Update conversation status (archive/block)' })
  @ApiParam({ name: 'conversationId', description: 'Conversation UUID' })
  @ApiOkResponse({ description: 'Updated conversation status' })
  @Permissions('messaging:update')
  @Patch('conversations/:conversationId/status')
  updateConversationStatus(
    @ActiveUser('sub') userId: string,
    @Param('conversationId') conversationId: string,
    @Body() data: UpdateConversationStatusDto,
  ) {
    return this.messagingService.updateConversationStatus(
      userId,
      conversationId,
      data.status,
    );
  }

  // ============================================
  // Message Routes
  // ============================================

  @ApiOperation({ summary: 'Get messages for a conversation' })
  @ApiParam({ name: 'conversationId', description: 'Conversation UUID' })
  @ApiOkResponse({ description: 'List of messages with cursor pagination' })
  @Throttle({ default: { ttl: 10000, limit: 60 } })
  @Permissions('messaging:read')
  @Get('conversations/:conversationId/messages')
  getMessages(
    @ActiveUser('sub') userId: string,
    @Param('conversationId') conversationId: string,
    @Query() query: MessagesQueryDto,
  ) {
    return this.messagingService.getMessages(userId, conversationId, query);
  }

  @ApiOperation({ summary: 'Search messages within a conversation' })
  @ApiParam({ name: 'conversationId', description: 'Conversation UUID' })
  @ApiOkResponse({ description: 'Matched messages ordered by recency' })
  @Throttle({ default: { ttl: 10000, limit: 60 } })
  @Permissions('messaging:read')
  @Get('conversations/:conversationId/search')
  searchMessages(
    @ActiveUser('sub') userId: string,
    @Param('conversationId') conversationId: string,
    @Query() query: MessageSearchQueryDto,
  ) {
    return this.messagingService.searchMessages(userId, conversationId, query);
  }

  @ApiOperation({ summary: 'Send a message' })
  @ApiOkResponse({ description: 'Created message' })
  @Permissions('messaging:create')
  @Post('messages')
  sendMessage(@ActiveUser('sub') userId: string, @Body() data: SendMessageDto) {
    return this.messagingService.sendMessage(userId, data);
  }

  @ApiOperation({ summary: 'Edit a message' })
  @ApiParam({ name: 'conversationId', description: 'Conversation UUID' })
  @ApiParam({ name: 'messageId', description: 'Message UUID' })
  @ApiOkResponse({ description: 'Updated message' })
  @Permissions('messaging:update')
  @Patch('conversations/:conversationId/messages/:messageId')
  async editMessage(
    @ActiveUser('sub') userId: string,
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @Body() data: UpdateMessageDto,
  ) {
    const result = await this.messagingService.editMessage(
      userId,
      conversationId,
      messageId,
      data,
    );

    // Emit WebSocket event for real-time sync
    if (result.success && result.data) {
      this.messagingGateway.emitMessageUpdated(conversationId, result.data);
    }

    return result;
  }

  @ApiOperation({ summary: 'Delete a message' })
  @ApiParam({ name: 'conversationId', description: 'Conversation UUID' })
  @ApiParam({ name: 'messageId', description: 'Message UUID' })
  @ApiOkResponse({ description: 'Deleted message ID' })
  @Permissions('messaging:delete')
  @Delete('conversations/:conversationId/messages/:messageId')
  deleteMessage(
    @ActiveUser('sub') userId: string,
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.messagingService.deleteMessage(
      userId,
      conversationId,
      messageId,
    );
  }

  @ApiOperation({ summary: 'Mark a message as read' })
  @ApiParam({ name: 'conversationId', description: 'Conversation UUID' })
  @ApiParam({ name: 'messageId', description: 'Message UUID' })
  @ApiOkResponse({ description: 'Updated message status' })
  @Permissions('messaging:update')
  @Post('conversations/:conversationId/messages/:messageId/read')
  markAsRead(
    @ActiveUser('sub') userId: string,
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.messagingService.markAsRead(userId, conversationId, messageId);
  }

  // ============================================
  // Reaction Routes
  // ============================================

  @ApiOperation({ summary: 'Add reaction to a message' })
  @ApiParam({ name: 'messageId', description: 'Message UUID' })
  @ApiOkResponse({ description: 'Created reaction' })
  @Permissions('messaging:update')
  @Post('messages/:messageId/reactions')
  addReaction(
    @ActiveUser('sub') userId: string,
    @Param('messageId') messageId: string,
    @Body() data: AddReactionDto,
  ) {
    return this.messagingService.addReaction(userId, messageId, data.emoji);
  }

  @ApiOperation({ summary: 'Remove reaction from a message' })
  @ApiParam({ name: 'messageId', description: 'Message UUID' })
  @ApiParam({ name: 'emoji', description: 'Emoji to remove' })
  @ApiOkResponse({ description: 'Removed reaction ID' })
  @Permissions('messaging:update')
  @Delete('messages/:messageId/reactions/:emoji')
  removeReaction(
    @ActiveUser('sub') userId: string,
    @Param('messageId') messageId: string,
    @Param('emoji') emoji: string,
  ) {
    return this.messagingService.removeReaction(userId, messageId, emoji);
  }

  // ============================================
  // Giphy Routes
  // ============================================

  @ApiOperation({ summary: 'Search GIFs from Giphy' })
  @ApiOkResponse({ description: 'List of GIFs matching the search query' })
  @Permissions('messaging:read')
  @Get('giphy/search')
  searchGifs(@Query() query: GiphySearchQueryDto) {
    return this.giphyService.search(
      query.q,
      query.limit,
      query.offset,
      query.rating,
    );
  }

  @ApiOperation({ summary: 'Get trending GIFs from Giphy' })
  @ApiOkResponse({ description: 'List of trending GIFs' })
  @Permissions('messaging:read')
  @Get('giphy/trending')
  getTrendingGifs(@Query() query: GiphyTrendingQueryDto) {
    return this.giphyService.trending(query.limit, query.offset, query.rating);
  }
}
