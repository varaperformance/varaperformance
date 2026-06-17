import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { StacksService } from './stacks.service';
import { ActiveUser } from '../../idm/decorators/active-user.decorator';
import { Permissions } from '../../idm/decorators/permissions.decorator';
import type { JwtPayload } from '../../idm/interfaces/jwt.interface';
import {
  CreateStackDto,
  UpdateStackDto,
  AddStackItemDto,
  UpdateStackItemDto,
  BatchUpdateItemsDto,
  LogIntakeDto,
  StackParamsDto,
  DateQueryDto,
} from './dto/stacks.dto';

@ApiTags('stacks')
@Controller({
  path: 'stacks',
  version: '1',
})
export class StacksController {
  constructor(private readonly stacksService: StacksService) {}

  // ========== Stacks ==========

  @ApiOperation({ summary: 'Create a new stack' })
  @ApiOkResponse({ description: 'Stack created' })
  @Permissions('health:create')
  @Post()
  create(@Body() data: CreateStackDto, @ActiveUser() user: JwtPayload) {
    return this.stacksService.create(user.sub, data);
  }

  @ApiOperation({ summary: 'List all stacks for the user' })
  @ApiOkResponse({ description: 'List of stacks' })
  @Permissions('health:read')
  @Get()
  findAll(@ActiveUser() user: JwtPayload) {
    return this.stacksService.findAll(user.sub);
  }

  @ApiOperation({ summary: 'Get the active stack' })
  @ApiOkResponse({ description: 'Active stack with items' })
  @Permissions('health:read')
  @Get('active')
  findActive(@ActiveUser() user: JwtPayload) {
    return this.stacksService.findActive(user.sub);
  }

  @ApiOperation({ summary: 'Get a stack by ID' })
  @ApiOkResponse({ description: 'Stack with items' })
  @Permissions('health:read')
  @Get(':id')
  findOne(@Param() params: StackParamsDto, @ActiveUser() user: JwtPayload) {
    return this.stacksService.findOne(user.sub, params.id);
  }

  @ApiOperation({ summary: 'Update a stack' })
  @ApiOkResponse({ description: 'Updated stack' })
  @Permissions('health:update')
  @Patch(':id')
  update(
    @Param() params: StackParamsDto,
    @Body() data: UpdateStackDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.stacksService.update(user.sub, params.id, data);
  }

  @ApiOperation({ summary: 'Delete a stack' })
  @ApiOkResponse({ description: 'Stack deleted' })
  @Permissions('health:delete')
  @Delete(':id')
  remove(@Param() params: StackParamsDto, @ActiveUser() user: JwtPayload) {
    return this.stacksService.remove(user.sub, params.id);
  }

  @ApiOperation({ summary: 'Set a stack as active' })
  @ApiOkResponse({ description: 'Stack activated' })
  @Permissions('health:update')
  @Post(':id/activate')
  setActive(@Param() params: StackParamsDto, @ActiveUser() user: JwtPayload) {
    return this.stacksService.setActive(user.sub, params.id);
  }

  // ========== Stack Items ==========

  @ApiOperation({ summary: 'Add an item to a stack' })
  @ApiOkResponse({ description: 'Item added' })
  @Permissions('health:create')
  @Post(':id/items')
  addItem(
    @Param() params: StackParamsDto,
    @Body() data: AddStackItemDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.stacksService.addItem(user.sub, params.id, data);
  }

  @ApiOperation({ summary: 'Update an item in a stack' })
  @ApiOkResponse({ description: 'Item updated' })
  @Permissions('health:update')
  @Patch(':id/items/:itemId')
  updateItem(
    @Param('id') stackId: string,
    @Param('itemId') itemId: string,
    @Body() data: UpdateStackItemDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.stacksService.updateItem(user.sub, stackId, itemId, data);
  }

  @ApiOperation({ summary: 'Delete an item from a stack' })
  @ApiOkResponse({ description: 'Item deleted' })
  @Permissions('health:delete')
  @Delete(':id/items/:itemId')
  removeItem(
    @Param('id') stackId: string,
    @Param('itemId') itemId: string,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.stacksService.removeItem(user.sub, stackId, itemId);
  }

  @ApiOperation({ summary: 'Batch update items (scheduling)' })
  @ApiOkResponse({ description: 'Items updated' })
  @Permissions('health:update')
  @Put(':id/items/batch')
  batchUpdateItems(
    @Param() params: StackParamsDto,
    @Body() data: BatchUpdateItemsDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.stacksService.batchUpdateItems(user.sub, params.id, data);
  }

  // ========== Logging ==========

  @ApiOperation({ summary: 'Log supplement intake' })
  @ApiOkResponse({ description: 'Intake logged' })
  @Permissions('health:create')
  @Post(':id/items/:itemId/log')
  logIntake(
    @Param('id') stackId: string,
    @Param('itemId') itemId: string,
    @Body() data: LogIntakeDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.stacksService.logIntake(
      user.sub,
      stackId,
      itemId,
      data.date,
      data.taken,
    );
  }

  @ApiOperation({ summary: 'Get logs for a specific date' })
  @ApiOkResponse({ description: 'Daily logs' })
  @Permissions('health:read')
  @Get(':id/logs')
  getLogsForDate(
    @Param() params: StackParamsDto,
    @Query() query: DateQueryDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.stacksService.getLogsForDate(user.sub, params.id, query.date);
  }

  @ApiOperation({ summary: 'Reset logs for a specific date' })
  @ApiOkResponse({ description: 'Logs reset' })
  @Permissions('health:delete')
  @Delete(':id/logs')
  resetLogsForDate(
    @Param() params: StackParamsDto,
    @Query() query: DateQueryDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.stacksService.resetLogsForDate(user.sub, params.id, query.date);
  }
}
