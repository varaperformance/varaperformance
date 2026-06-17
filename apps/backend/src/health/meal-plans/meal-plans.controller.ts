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
import { MealPlansService } from './services/meal-plans.service';
import {
  CreateMealPlanDto,
  UpdateMealPlanDto,
  CreateMealPlanItemDto,
  UpdateMealPlanItemDto,
  CopyMealPlanDayDto,
  QuickLogMealPlanDto,
  GenerateFromMacrosDto,
} from './dto/meal-plans.dto';

@ApiTags('meal-plans')
@SkipThrottle()
@Controller({
  path: 'meal-plans',
  version: '1',
})
export class MealPlansController {
  constructor(private readonly mealPlansService: MealPlansService) {}

  // ==================== MEAL PLANS ====================

  @ApiOperation({ summary: 'Create meal plan' })
  @ApiOkResponse({ description: 'Created meal plan' })
  @Permissions('health:create')
  @Post()
  create(@Body() data: CreateMealPlanDto, @ActiveUser() user: JwtPayload) {
    return this.mealPlansService.create(user.sub, data);
  }

  @ApiOperation({ summary: 'List meal plans' })
  @ApiOkResponse({ description: 'User meal plans' })
  @Permissions('health:read')
  @Get()
  findAll(@ActiveUser() user: JwtPayload) {
    return this.mealPlansService.findAll(user.sub);
  }

  @ApiOperation({ summary: 'Get active meal plan' })
  @ApiOkResponse({ description: 'Active meal plan' })
  @Permissions('health:read')
  @Get('active')
  getActive(@ActiveUser() user: JwtPayload) {
    return this.mealPlansService.getActive(user.sub);
  }

  @ApiOperation({ summary: 'Get meal plan' })
  @ApiOkResponse({ description: 'Meal plan details' })
  @Permissions('health:read')
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.mealPlansService.findOne(user.sub, id);
  }

  @ApiOperation({ summary: 'Update meal plan' })
  @ApiOkResponse({ description: 'Updated meal plan' })
  @Permissions('health:update')
  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateMealPlanDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.mealPlansService.update(user.sub, id, data);
  }

  @ApiOperation({ summary: 'Delete meal plan' })
  @ApiOkResponse({ description: 'Meal plan deleted' })
  @Permissions('health:delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.mealPlansService.delete(user.sub, id);
  }

  // ==================== ITEMS ====================

  @ApiOperation({ summary: 'Add item to meal plan' })
  @ApiOkResponse({ description: 'Added item' })
  @Permissions('health:create')
  @Post(':id/items')
  addItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: CreateMealPlanItemDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.mealPlansService.addItem(user.sub, id, data);
  }

  @ApiOperation({ summary: 'Update meal plan item' })
  @ApiOkResponse({ description: 'Updated item' })
  @Permissions('health:update')
  @Put(':id/items/:itemId')
  updateItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() data: UpdateMealPlanItemDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.mealPlansService.updateItem(user.sub, id, itemId, data);
  }

  @ApiOperation({ summary: 'Remove meal plan item' })
  @ApiOkResponse({ description: 'Item removed' })
  @Permissions('health:delete')
  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.mealPlansService.removeItem(user.sub, id, itemId);
  }

  // ==================== COPY DAY ====================

  @ApiOperation({ summary: 'Copy meal plan day to other days' })
  @ApiOkResponse({ description: 'Day copied' })
  @Permissions('health:update')
  @Post(':id/copy-day')
  copyDay(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: CopyMealPlanDayDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.mealPlansService.copyDay(user.sub, id, data);
  }

  // ==================== QUICK LOG ====================

  @ApiOperation({ summary: 'Quick-log meal plan to food diary' })
  @ApiOkResponse({ description: 'Food logs created from meal plan' })
  @Permissions('health:create')
  @Post(':id/quick-log')
  quickLog(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: QuickLogMealPlanDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.mealPlansService.quickLog(user.sub, id, data);
  }

  // ==================== AUTO-GENERATE FROM MACROS ====================

  @ApiOperation({ summary: 'Auto-generate meal plan from macro targets' })
  @ApiOkResponse({ description: 'Generated meal plan' })
  @Permissions('health:create')
  @Post('generate')
  generateFromMacros(
    @Body() data: GenerateFromMacrosDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.mealPlansService.generateFromMacros(user.sub, data);
  }
}
