import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { ActiveUser } from '../../idm/decorators/active-user.decorator';
import { Permissions } from '../../idm/decorators/permissions.decorator';
import type { JwtPayload } from '../../idm/interfaces/jwt.interface';
import { GroceryListsService } from './services/grocery-lists.service';
import {
  CreateGroceryListDto,
  UpdateGroceryListDto,
  CreateGroceryListItemDto,
  UpdateGroceryListItemDto,
  BatchCheckItemsDto,
  SeedFromMealPlanDto,
  SeedFromRecipeDto,
} from './dto/grocery-lists.dto';

@ApiTags('grocery-lists')
@SkipThrottle()
@Controller({
  path: 'grocery-lists',
  version: '1',
})
export class GroceryListsController {
  constructor(private readonly groceryListsService: GroceryListsService) {}

  // ==================== LISTS ====================

  @ApiOperation({ summary: 'Create grocery list' })
  @ApiOkResponse({ description: 'Created grocery list' })
  @Permissions('health:create')
  @Post()
  create(@Body() data: CreateGroceryListDto, @ActiveUser() user: JwtPayload) {
    return this.groceryListsService.create(user.sub, data);
  }

  @ApiOperation({ summary: 'List grocery lists' })
  @ApiOkResponse({ description: 'User grocery lists' })
  @Permissions('health:read')
  @Get()
  findAll(@ActiveUser() user: JwtPayload) {
    return this.groceryListsService.findAll(user.sub);
  }

  // ==================== SEED (static paths before :id) ====================

  @ApiOperation({ summary: 'Create grocery list from meal plan' })
  @ApiOkResponse({ description: 'Grocery list seeded from meal plan' })
  @Permissions('health:create')
  @Post('seed-from-plan')
  seedFromMealPlan(
    @Body() data: SeedFromMealPlanDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.groceryListsService.seedFromMealPlan(user.sub, data);
  }

  @ApiOperation({ summary: 'Create grocery list from recipe' })
  @ApiOkResponse({ description: 'Grocery list seeded from recipe' })
  @Permissions('health:create')
  @Post('seed-from-recipe')
  seedFromRecipe(
    @Body() data: SeedFromRecipeDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.groceryListsService.seedFromRecipe(user.sub, data);
  }

  // ==================== SINGLE LIST ====================

  @ApiOperation({ summary: 'Get grocery list' })
  @ApiOkResponse({ description: 'Grocery list details' })
  @Permissions('health:read')
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.groceryListsService.findOne(user.sub, id);
  }

  @ApiOperation({ summary: 'Update grocery list' })
  @ApiOkResponse({ description: 'Updated grocery list' })
  @Permissions('health:update')
  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateGroceryListDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.groceryListsService.update(user.sub, id, data);
  }

  @ApiOperation({ summary: 'Delete grocery list' })
  @ApiOkResponse({ description: 'Grocery list deleted' })
  @Permissions('health:delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.groceryListsService.delete(user.sub, id);
  }

  // ==================== ITEMS ====================

  @ApiOperation({ summary: 'Add item to grocery list' })
  @ApiOkResponse({ description: 'Added item' })
  @Permissions('health:create')
  @Post(':id/items')
  addItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: CreateGroceryListItemDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.groceryListsService.addItem(user.sub, id, data);
  }

  @ApiOperation({ summary: 'Update grocery list item' })
  @ApiOkResponse({ description: 'Updated item' })
  @Permissions('health:update')
  @Put(':id/items/:itemId')
  updateItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() data: UpdateGroceryListItemDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.groceryListsService.updateItem(user.sub, id, itemId, data);
  }

  @ApiOperation({ summary: 'Remove grocery list item' })
  @ApiOkResponse({ description: 'Item removed' })
  @Permissions('health:delete')
  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.groceryListsService.removeItem(user.sub, id, itemId);
  }

  // ==================== BATCH ====================

  @ApiOperation({ summary: 'Batch check/uncheck items' })
  @ApiOkResponse({ description: 'Items updated' })
  @Permissions('health:update')
  @Post(':id/batch-check')
  batchCheck(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: BatchCheckItemsDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.groceryListsService.batchCheckItems(user.sub, id, data);
  }
}
