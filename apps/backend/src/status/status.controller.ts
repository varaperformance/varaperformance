import {
  Controller,
  Post,
  Body,
  Patch,
  Get,
  Header,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { StatusService } from './status.service';
import {
  CreateIncidentDto,
  AddIncidentNoteDto,
  CreateServiceDto,
  UpdateIncidentDto,
  PaginationDto,
} from './dto/status.dto';
import { Public } from 'src/idm/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';
import { Permissions } from 'src/idm/decorators/permissions.decorator';
import { SkipAudit } from '@app/common/audit';

@ApiTags('status')
@Throttle({ default: { ttl: 1000, limit: 10 } })
@Controller({
  path: 'status',
  version: '1',
})
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @ApiOperation({ summary: 'Create a status service entry' })
  @ApiOkResponse({ description: 'Service created' })
  @Permissions('status:create')
  @Post('create-service')
  createService(@Body() createServiceDto: CreateServiceDto) {
    return this.statusService.createService(createServiceDto);
  }

  @ApiOperation({ summary: 'Create an incident' })
  @ApiOkResponse({ description: 'Incident created' })
  @Permissions('incident:create')
  @Post('create-incident')
  createIncident(@Body() createIncidentDto: CreateIncidentDto) {
    return this.statusService.createIncident(createIncidentDto);
  }

  @ApiOperation({ summary: 'Update an incident' })
  @ApiOkResponse({ description: 'Incident updated' })
  @Permissions('incident:update')
  @Patch('update-incident')
  updateIncident(@Body() updateIncidentDto: UpdateIncidentDto) {
    return this.statusService.updateIncident(updateIncidentDto);
  }

  @ApiOperation({ summary: 'Add a note to an incident' })
  @ApiOkResponse({ description: 'Incident note added' })
  @Permissions('incident:add-note')
  @Post('add-incident-note')
  addIncidentNote(@Body() addIncidentNoteDto: AddIncidentNoteDto) {
    return this.statusService.addIncidentNote(addIncidentNoteDto);
  }

  @ApiOperation({ summary: 'Get service statuses' })
  @ApiOkResponse({ description: 'Service status list' })
  @Public()
  @SkipAudit()
  @Header('Cache-Control', 'public, max-age=60')
  @Get('services')
  getAllServices() {
    return this.statusService.getServiceStatus();
  }

  @ApiOperation({ summary: 'List incidents' })
  @ApiOkResponse({ description: 'Incident list' })
  @Public()
  @SkipAudit()
  @Header('Cache-Control', 'public, max-age=60')
  @Get('incidents')
  getAllIncidents(@Query() paginationDto: PaginationDto) {
    return this.statusService.getAllIncidents(paginationDto);
  }

  @ApiOperation({ summary: 'Get GitHub status' })
  @ApiOkResponse({ description: 'GitHub status' })
  @Public()
  @SkipAudit()
  @Header('Cache-Control', 'public, max-age=60')
  @Get('github')
  getGithubStatus() {
    return this.statusService.getGithubStatus();
  }

  @ApiOperation({ summary: 'Get site stats' })
  @ApiOkResponse({ description: 'Site stats' })
  @Public()
  @SkipAudit()
  @Header('Cache-Control', 'public, max-age=60')
  @Get('stats')
  getSiteStats() {
    return this.statusService.getSiteStats();
  }
}
