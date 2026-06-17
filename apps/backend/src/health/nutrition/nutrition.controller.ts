import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { ActiveUser } from '../../idm/decorators/active-user.decorator';
import { Permissions } from '../../idm/decorators/permissions.decorator';
import type { JwtPayload } from '../../idm/interfaces/jwt.interface';
import { FoodService } from './services/food.service';
import { FoodLogService } from './services/food-log.service';
import {
  CreateFoodDto,
  UpdateFoodDto,
  SearchFoodsDto,
  CreateFoodLogDto,
  UpdateFoodLogDto,
  FoodLogQueryDto,
  UpdateNutritionGoalDto,
  AddFavoriteFoodDto,
} from './dto/nutrition.dto';

@ApiTags('nutrition')
@SkipThrottle()
@Controller({
  path: 'nutrition',
  version: '1',
})
export class NutritionController {
  constructor(
    private readonly foodService: FoodService,
    private readonly foodLogService: FoodLogService,
  ) {}

  // ==================== Food Search & Database ====================

  /**
   * Search foods - searches local DB and external APIs
   */
  @ApiOperation({ summary: 'Search foods' })
  @ApiOkResponse({ description: 'List of matching foods' })
  @Permissions('health:read')
  @Get('foods/search')
  searchFoods(@Query() query: SearchFoodsDto, @ActiveUser() user: JwtPayload) {
    return this.foodService.search(query, user.sub);
  }

  /**
   * Admin food search - includes private foods across users
   */
  @ApiOperation({ summary: 'Admin search foods' })
  @ApiOkResponse({ description: 'Admin list of matching foods' })
  @Permissions('nutrition:read')
  @Get('admin/foods')
  searchFoodsAdmin(
    @Query() query: SearchFoodsDto,
    @Query('verified') verified?: string,
  ) {
    const parsedVerified =
      verified === undefined ? undefined : verified !== 'false';
    return this.foodService.searchAdmin(query, parsedVerified);
  }

  /**
   * Search food by barcode - checks local first, then external APIs
   */
  @ApiOperation({ summary: 'Search food by barcode' })
  @ApiOkResponse({ description: 'Food matching barcode' })
  @Permissions('health:read')
  @Get('foods/barcode/:barcode')
  searchByBarcode(
    @Param('barcode') barcode: string,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.foodService.searchByBarcode(barcode, user.sub);
  }

  /**
   * Get single food detail
   */
  @ApiOperation({ summary: 'Get food details' })
  @ApiOkResponse({ description: 'Food details' })
  @Permissions('health:read')
  @Get('foods/:id')
  getFood(@Param('id', ParseUUIDPipe) id: string) {
    return this.foodService.getById(id);
  }

  /**
   * Create custom food
   */
  @ApiOperation({ summary: 'Create custom food' })
  @ApiOkResponse({ description: 'Created food' })
  @Permissions('health:create')
  @Post('foods')
  createFood(@Body() data: CreateFoodDto, @ActiveUser() user: JwtPayload) {
    return this.foodService.create(user.sub, data);
  }

  /**
   * Create food as admin
   */
  @ApiOperation({ summary: 'Create food (admin)' })
  @ApiOkResponse({ description: 'Created food' })
  @Permissions('nutrition:create')
  @Post('admin/foods')
  createFoodAdmin(@Body() data: CreateFoodDto, @ActiveUser() user: JwtPayload) {
    return this.foodService.create(user.sub, data, true);
  }

  /**
   * Update food (owner or admin only)
   */
  @ApiOperation({ summary: 'Update food' })
  @ApiOkResponse({ description: 'Updated food' })
  @Permissions('health:update')
  @Put('foods/:id')
  updateFood(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateFoodDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.foodService.update(id, user.sub, data);
  }

  /**
   * Update food as admin
   */
  @ApiOperation({ summary: 'Update food (admin)' })
  @ApiOkResponse({ description: 'Updated food' })
  @Permissions('nutrition:update')
  @Put('admin/foods/:id')
  updateFoodAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateFoodDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.foodService.update(id, user.sub, data, true);
  }

  /**
   * Delete food (owner or admin only)
   */
  @ApiOperation({ summary: 'Delete food' })
  @ApiOkResponse({ description: 'Food deleted' })
  @Permissions('health:delete')
  @Delete('foods/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteFood(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.foodService.delete(id, user.sub);
  }

  /**
   * Delete food as admin
   */
  @ApiOperation({ summary: 'Delete food (admin)' })
  @ApiOkResponse({ description: 'Food deleted' })
  @Permissions('nutrition:delete')
  @Delete('admin/foods/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteFoodAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.foodService.delete(id, user.sub, true);
  }

  // ==================== Food Logging (Diary) ====================

  /**
   * Get daily nutrition summary
   */
  @ApiOperation({ summary: 'Get daily nutrition summary' })
  @ApiOkResponse({
    description: 'Daily nutrition summary with meals and progress',
  })
  @Permissions('health:read')
  @Get('diary')
  getDailySummary(
    @Query() query: FoodLogQueryDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.foodLogService.getDailySummary(user.sub, query);
  }

  /**
   * Get daily nutrition totals over a date range
   */
  @ApiOperation({ summary: 'Get nutrition history for trend charts' })
  @ApiOkResponse({ description: 'Daily nutrition totals over date range' })
  @Permissions('health:read')
  @Get('diary/history')
  getHistory(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.foodLogService.getHistory(user.sub, startDate, endDate);
  }

  /**
   * Log food entry
   */
  @ApiOperation({ summary: 'Log food entry' })
  @ApiOkResponse({ description: 'Created food log' })
  @Permissions('health:create')
  @Post('diary')
  logFood(@Body() data: CreateFoodLogDto, @ActiveUser() user: JwtPayload) {
    return this.foodLogService.logFood(user.sub, data);
  }

  /**
   * Update food log entry
   */
  @ApiOperation({ summary: 'Update food log entry' })
  @ApiOkResponse({ description: 'Updated food log' })
  @Permissions('health:update')
  @Put('diary/:id')
  updateLog(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateFoodLogDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.foodLogService.updateLog(user.sub, id, data);
  }

  /**
   * Delete food log entry
   */
  @ApiOperation({ summary: 'Delete food log entry' })
  @ApiOkResponse({ description: 'Food log deleted' })
  @Permissions('health:delete')
  @Delete('diary/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteLog(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.foodLogService.deleteLog(user.sub, id);
  }

  // ==================== Nutrition Goals ====================

  /**
   * Get nutrition goal
   */
  @ApiOperation({ summary: 'Get nutrition goal' })
  @ApiOkResponse({ description: 'User nutrition goal' })
  @Permissions('health:read')
  @Get('goal')
  getGoal(@ActiveUser() user: JwtPayload) {
    return this.foodLogService.getGoal(user.sub);
  }

  /**
   * Update nutrition goal
   */
  @ApiOperation({ summary: 'Update nutrition goal' })
  @ApiOkResponse({ description: 'Updated nutrition goal' })
  @Permissions('health:update')
  @Put('goal')
  updateGoal(
    @Body() data: UpdateNutritionGoalDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.foodLogService.updateGoal(user.sub, data);
  }

  // ==================== Favorites & Recent ====================

  /**
   * Get favorite foods
   */
  @ApiOperation({ summary: 'Get favorite foods' })
  @ApiOkResponse({ description: 'User favorite foods' })
  @Permissions('health:read')
  @Get('favorites')
  getFavorites(@ActiveUser() user: JwtPayload) {
    return this.foodLogService.getFavorites(user.sub);
  }

  /**
   * Add favorite food
   */
  @ApiOperation({ summary: 'Add favorite food' })
  @ApiOkResponse({ description: 'Added favorite' })
  @Permissions('health:create')
  @Post('favorites')
  addFavorite(
    @Body() data: AddFavoriteFoodDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.foodLogService.addFavorite(user.sub, data);
  }

  /**
   * Remove favorite food
   */
  @ApiOperation({ summary: 'Remove favorite food' })
  @ApiOkResponse({ description: 'Favorite removed' })
  @Permissions('health:delete')
  @Delete('favorites/:foodId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeFavorite(
    @Param('foodId', ParseUUIDPipe) foodId: string,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.foodLogService.removeFavorite(user.sub, foodId);
  }

  /**
   * Get recent foods
   */
  @ApiOperation({ summary: 'Get recent foods' })
  @ApiOkResponse({ description: 'Recently logged foods' })
  @Permissions('health:read')
  @Get('recent')
  getRecentFoods(
    @Query('limit') limit: string,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.foodLogService.getRecentFoods(user.sub, parseInt(limit) || 10);
  }

  // ==================== Admin - Food Verification ====================

  /**
   * Verify/unverify a food (admin only)
   */
  @ApiOperation({ summary: 'Verify food (admin)' })
  @ApiOkResponse({ description: 'Food verification updated' })
  @Permissions('nutrition:update')
  @Put('admin/foods/:id/verify')
  verifyFood(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('verified') verified: string,
  ) {
    return this.foodService.verify(id, verified !== 'false');
  }
}
