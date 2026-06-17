import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { PersonalRecordsService } from './personal-records.service';
import { ActiveUser } from '../../idm/decorators/active-user.decorator';
import { Permissions } from '../../idm/decorators/permissions.decorator';
import type { JwtPayload } from '../../idm/interfaces/jwt.interface';
import {
  CreatePersonalRecordDto,
  UpdatePersonalRecordDto,
  PersonalRecordQueryDto,
  PersonalRecordParamsDto,
} from './dto/personal-record.dto';

@ApiTags('personal-records')
@Controller({
  path: 'personal-records',
  version: '1',
})
export class PersonalRecordsController {
  constructor(private readonly prService: PersonalRecordsService) {}

  @ApiOperation({ summary: 'Get all personal records' })
  @ApiOkResponse({ description: 'List of personal records' })
  @Permissions('health:read')
  @Get()
  findAll(
    @ActiveUser() user: JwtPayload,
    @Query() query: PersonalRecordQueryDto,
  ) {
    return this.prService.findAll(user.sub, query);
  }

  @ApiOperation({ summary: 'Get PRs for a specific exercise' })
  @ApiOkResponse({ description: 'List of PRs for the exercise' })
  @Permissions('health:read')
  @Get('exercise/:exerciseId')
  findByExercise(
    @ActiveUser() user: JwtPayload,
    @Param('exerciseId') exerciseId: string,
  ) {
    return this.prService.findByExercise(user.sub, exerciseId);
  }

  @ApiOperation({ summary: 'Get a specific personal record' })
  @ApiOkResponse({ description: 'Personal record details' })
  @Permissions('health:read')
  @Get(':prId')
  findOne(
    @ActiveUser() user: JwtPayload,
    @Param() params: PersonalRecordParamsDto,
  ) {
    return this.prService.findOne(user.sub, params.prId);
  }

  @ApiOperation({ summary: 'Create or update a personal record' })
  @ApiOkResponse({ description: 'Personal record created/updated' })
  @Permissions('health:create')
  @Post()
  create(
    @ActiveUser() user: JwtPayload,
    @Body() data: CreatePersonalRecordDto,
  ) {
    return this.prService.create(user.sub, data);
  }

  @ApiOperation({ summary: 'Update a personal record' })
  @ApiOkResponse({ description: 'Personal record updated' })
  @Permissions('health:update')
  @Patch(':prId')
  update(
    @ActiveUser() user: JwtPayload,
    @Param() params: PersonalRecordParamsDto,
    @Body() data: UpdatePersonalRecordDto,
  ) {
    return this.prService.update(user.sub, params.prId, data);
  }

  @ApiOperation({ summary: 'Delete a personal record' })
  @ApiOkResponse({ description: 'Personal record deleted' })
  @Permissions('health:delete')
  @Delete(':prId')
  delete(
    @ActiveUser() user: JwtPayload,
    @Param() params: PersonalRecordParamsDto,
  ) {
    return this.prService.delete(user.sub, params.prId);
  }
}
