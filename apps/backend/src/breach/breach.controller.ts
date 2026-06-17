import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { BreachService } from './breach.service';
import { RecordBreachDto, UpdateBreachDto } from './dto/breach.dto';
import { Permissions } from 'src/idm/decorators/permissions.decorator';
import { ActiveUser } from 'src/idm/decorators/active-user.decorator';
import type { JwtPayload } from 'src/idm/interfaces/jwt.interface';
import { BreachSeverity, BreachStatus } from '@generated/prisma';
import { IsArray, IsEmail } from 'class-validator';

class NotifyUsersDto {
  @IsArray()
  @IsEmail({}, { each: true })
  emails: string[];
}

@ApiTags('breach')
@Throttle({ default: { ttl: 1000, limit: 20 } })
@Controller({ path: 'admin/breach', version: '1' })
export class BreachController {
  constructor(private readonly breachService: BreachService) {}

  @Post()
  @Permissions('admin:write')
  @ApiOperation({ summary: 'Record a new data breach (GDPR Art. 33)' })
  @ApiOkResponse({ description: 'Breach recorded and admin team alerted' })
  record(@ActiveUser() user: JwtPayload, @Body() dto: RecordBreachDto) {
    return this.breachService.recordBreach(user.sub, dto);
  }

  @Get()
  @Permissions('admin:read')
  @ApiOperation({ summary: 'List all breach records' })
  list(
    @Query('status') status?: BreachStatus,
    @Query('severity') severity?: BreachSeverity,
    @Query('limit') limit?: string,
  ) {
    return this.breachService.listBreaches({
      status,
      severity,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @Permissions('admin:read')
  @ApiOperation({ summary: 'Get breach record by ID' })
  getOne(@Param('id') id: string) {
    return this.breachService.getBreachById(id);
  }

  @Patch(':id')
  @Permissions('admin:write')
  @ApiOperation({ summary: 'Update breach status / notes / DPA reference' })
  update(@Param('id') id: string, @Body() dto: UpdateBreachDto) {
    return this.breachService.updateBreach(id, dto);
  }

  @Post(':id/notify-dpa')
  @Permissions('admin:write')
  @ApiOperation({
    summary: 'Mark supervisory authority (DPA) as notified (GDPR Art. 33)',
  })
  notifyDpa(@Param('id') id: string) {
    return this.breachService.markDpaNotified(id);
  }

  @Post(':id/notify-users')
  @Permissions('admin:write')
  @ApiOperation({
    summary: 'Send breach notification emails to affected users (GDPR Art. 34)',
  })
  notifyUsers(@Param('id') id: string, @Body() dto: NotifyUsersDto) {
    return this.breachService.notifyAffectedUsers(id, dto.emails);
  }
}
