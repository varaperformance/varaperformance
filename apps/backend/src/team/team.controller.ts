import {
  Controller,
  Get,
  Header,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from 'src/idm/decorators/public.decorator';
import { Permissions } from 'src/idm/decorators/permissions.decorator';
import { ActiveUser } from 'src/idm/decorators/active-user.decorator';
import { SkipAudit } from '@app/common/audit';
import { TeamService } from './team.service';
import {
  ApplyAmbassadorDto,
  CreateTeamMemberDto,
  UpdateTeamMemberDto,
} from './dto/team.dto';

@ApiTags('team')
@Throttle({ default: { ttl: 1000, limit: 10 } })
@Controller({
  path: 'team',
  version: '1',
})
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  // ── Public ──

  @ApiOperation({ summary: 'Get all visible team members and ambassadors' })
  @ApiOkResponse({ description: 'Team members grouped by role' })
  @Public()
  @SkipAudit()
  @Header('Cache-Control', 'public, max-age=60')
  @Get()
  getTeamMembers() {
    return this.teamService.getTeamMembers();
  }

  // ── Ambassador Application (authenticated) ──

  @ApiOperation({ summary: 'Apply to become an ambassador' })
  @ApiOkResponse({ description: 'Application submitted' })
  @Post('ambassadors/apply')
  applyAsAmbassador(
    @ActiveUser('sub') userId: string,
    @Body() dto: ApplyAmbassadorDto,
  ) {
    return this.teamService.applyAsAmbassador(userId, dto);
  }

  // ── Admin: Team Members ──

  @ApiOperation({ summary: 'Get all team members (admin)' })
  @Permissions('team:read')
  @Get('admin/members')
  getAdminTeamMembers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.teamService.getAdminTeamMembers(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @ApiOperation({ summary: 'Add a team member' })
  @Permissions('team:update')
  @Post('admin/members')
  createTeamMember(@Body() dto: CreateTeamMemberDto) {
    return this.teamService.createTeamMember(dto);
  }

  @ApiOperation({ summary: 'Update a team member' })
  @Permissions('team:update')
  @Patch('admin/members/:id')
  updateTeamMember(@Param('id') id: string, @Body() dto: UpdateTeamMemberDto) {
    return this.teamService.updateTeamMember(id, dto);
  }

  @ApiOperation({ summary: 'Remove a team member' })
  @Permissions('team:update')
  @Delete('admin/members/:id')
  deleteTeamMember(@Param('id') id: string) {
    return this.teamService.deleteTeamMember(id);
  }

  // ── Admin: Ambassador Applications ──

  @ApiOperation({ summary: 'Get ambassador applications (admin)' })
  @Permissions('team:read')
  @Get('admin/applications')
  getAdminApplications(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.teamService.getAdminApplications(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
    );
  }

  @ApiOperation({ summary: 'Approve ambassador application' })
  @Permissions('team:update')
  @Post('admin/applications/:id/approve')
  approveApplication(
    @Param('id') id: string,
    @ActiveUser('sub') reviewerId: string,
  ) {
    return this.teamService.approveApplication(id, reviewerId);
  }

  @ApiOperation({ summary: 'Deny ambassador application' })
  @Permissions('team:update')
  @Post('admin/applications/:id/deny')
  denyApplication(
    @Param('id') id: string,
    @ActiveUser('sub') reviewerId: string,
    @Body('reason') reason?: string,
  ) {
    return this.teamService.denyApplication(id, reviewerId, reason);
  }

  @ApiOperation({ summary: 'Delete ambassador application' })
  @Permissions('team:update')
  @Delete('admin/applications/:id')
  deleteApplication(@Param('id') id: string) {
    return this.teamService.deleteApplication(id);
  }
}
