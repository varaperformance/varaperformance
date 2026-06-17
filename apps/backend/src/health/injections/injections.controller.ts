import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActiveUser } from '../../idm/decorators/active-user.decorator';
import { Permissions } from '../../idm/decorators/permissions.decorator';
import type { JwtPayload } from '../../idm/interfaces/jwt.interface';
import {
  CreateInjectionLogDto,
  CreateInjectionProtocolDto,
  InjectionLogsQueryDto,
  InjectionParamsDto,
  UpdateInjectionProtocolDto,
} from './dto/injection.dto';
import { InjectionsService } from './injections.service';

@ApiTags('injections')
@Controller({
  path: 'injections',
  version: '1',
})
export class InjectionsController {
  constructor(private readonly injectionsService: InjectionsService) {}

  @ApiOperation({ summary: 'Create injection protocol template' })
  @ApiOkResponse({ description: 'Injection protocol created' })
  @Permissions('health:create')
  @Post('protocols')
  createProtocol(
    @Body() data: CreateInjectionProtocolDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.injectionsService.createProtocol(user.sub, data);
  }

  @ApiOperation({ summary: 'List injection protocol templates' })
  @ApiOkResponse({ description: 'Injection protocols list' })
  @Permissions('health:read')
  @Get('protocols')
  findProtocols(@ActiveUser() user: JwtPayload) {
    return this.injectionsService.findProtocols(user.sub);
  }

  @ApiOperation({ summary: 'Update injection protocol template' })
  @ApiOkResponse({ description: 'Injection protocol updated' })
  @Permissions('health:update')
  @Patch('protocols/:id')
  updateProtocol(
    @Param() params: InjectionParamsDto,
    @Body() data: UpdateInjectionProtocolDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.injectionsService.updateProtocol(user.sub, params.id, data);
  }

  @ApiOperation({ summary: 'Delete injection protocol template' })
  @ApiOkResponse({ description: 'Injection protocol deleted' })
  @Permissions('health:delete')
  @Delete('protocols/:id')
  removeProtocol(
    @Param() params: InjectionParamsDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.injectionsService.removeProtocol(user.sub, params.id);
  }

  @ApiOperation({ summary: 'Create injection log entry' })
  @ApiOkResponse({ description: 'Injection log created' })
  @Permissions('health:create')
  @Post('logs')
  createLog(
    @Body() data: CreateInjectionLogDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.injectionsService.createLog(user.sub, data);
  }

  @ApiOperation({ summary: 'List injection log entries' })
  @ApiOkResponse({ description: 'Injection logs list' })
  @Permissions('health:read')
  @Get('logs')
  findLogs(
    @Query() query: InjectionLogsQueryDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.injectionsService.findLogs(user.sub, query);
  }

  @ApiOperation({ summary: 'Delete injection log entry' })
  @ApiOkResponse({ description: 'Injection log deleted' })
  @Permissions('health:delete')
  @Delete('logs/:id')
  removeLog(
    @Param() params: InjectionParamsDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.injectionsService.removeLog(user.sub, params.id);
  }
}
