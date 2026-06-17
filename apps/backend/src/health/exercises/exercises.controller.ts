import {
  Controller,
  Get,
  Header,
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
  ApiQuery,
} from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { ExerciseService } from './exercises.service';
import {
  ExerciseQueryDto,
  ExerciseParamsDto,
  ExerciseIdParamsDto,
  CreateExerciseDto,
  UpdateExerciseDto,
} from './dto/exercises.dto';
import { Public } from '../../idm/decorators/public.decorator';
import { ActiveUser } from '../../idm/decorators/active-user.decorator';
import { Permissions } from '../../idm/decorators/permissions.decorator';
import { SkipAudit } from '@app/common/audit';
import type { JwtPayload } from '../../idm/interfaces/jwt.interface';

@ApiTags('exercises')
@Throttle({ default: { ttl: 10000, limit: 40 } })
@Controller({
  path: 'exercises',
  version: '1',
})
export class ExerciseController {
  constructor(private readonly exerciseService: ExerciseService) {}

  // ==================== Public Endpoints ====================

  @Public()
  @SkipAudit()
  @ApiOperation({ summary: 'Get all exercises with optional filters (public)' })
  @ApiOkResponse({ description: 'List of active exercises' })
  @Header('Cache-Control', 'public, max-age=60')
  @SkipThrottle()
  @Get()
  getExercises(
    @Query() query: ExerciseQueryDto,
    @ActiveUser() user?: JwtPayload,
  ) {
    return this.exerciseService.getExercises(query, user?.sub);
  }

  @Public()
  @SkipAudit()
  @ApiOperation({ summary: 'Get a single exercise by slug (public)' })
  @ApiOkResponse({ description: 'Single exercise details' })
  @Header('Cache-Control', 'public, max-age=60')
  @Throttle({ default: { ttl: 60000, limit: 240 } })
  @Get('slug/:slug')
  getExerciseBySlug(@Param() params: ExerciseParamsDto) {
    return this.exerciseService.getExerciseBySlug(params.slug);
  }

  // ==================== Admin Endpoints ====================

  @ApiOperation({ summary: 'Get all exercises for admin (includes inactive)' })
  @ApiOkResponse({ description: 'Paginated list of all exercises' })
  @Permissions('exercise:read')
  @Get('admin')
  getExercisesAdmin(@Query() query: ExerciseQueryDto) {
    return this.exerciseService.getExercisesAdmin(query);
  }

  @ApiOperation({ summary: 'Get a single exercise by ID (admin)' })
  @ApiOkResponse({ description: 'Exercise details' })
  @Permissions('exercise:read')
  @Get(':id')
  getExerciseById(@Param() params: ExerciseIdParamsDto) {
    return this.exerciseService.getExerciseById(params.id);
  }

  @ApiOperation({ summary: 'Create a new exercise' })
  @ApiOkResponse({ description: 'Created exercise' })
  @Permissions('exercise:create')
  @Post()
  createExercise(@Body() data: CreateExerciseDto) {
    return this.exerciseService.createExercise(data);
  }

  @ApiOperation({ summary: 'Update an exercise' })
  @ApiOkResponse({ description: 'Updated exercise' })
  @Permissions('exercise:update')
  @Patch(':id')
  updateExercise(
    @Param() params: ExerciseIdParamsDto,
    @Body() data: UpdateExerciseDto,
  ) {
    return this.exerciseService.updateExercise(params.id, data);
  }

  @ApiOperation({ summary: 'Toggle exercise active status' })
  @ApiOkResponse({ description: 'Updated exercise status' })
  @Permissions('exercise:update')
  @Patch(':id/toggle')
  toggleExercise(@Param() params: ExerciseIdParamsDto) {
    return this.exerciseService.toggleExercise(params.id);
  }

  @ApiOperation({ summary: 'Delete an exercise' })
  @ApiOkResponse({ description: 'Deleted exercise ID' })
  @Permissions('exercise:delete')
  @Delete(':id')
  deleteExercise(@Param() params: ExerciseIdParamsDto) {
    return this.exerciseService.deleteExercise(params.id);
  }

  @ApiOperation({ summary: 'Check if a slug is available' })
  @ApiOkResponse({ description: 'Slug availability' })
  @ApiQuery({ name: 'excludeId', required: false })
  @Permissions('exercise:read')
  @Get('slug/:slug/check')
  checkSlug(
    @Param('slug') slug: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.exerciseService.checkSlug(slug, excludeId);
  }
}
