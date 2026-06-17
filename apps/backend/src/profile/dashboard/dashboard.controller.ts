import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { DashboardService } from './dashboard.service';
import { UpdateDashboardPreferenceDto } from './dto/dashboard.dto';
import { ActiveUser } from 'src/idm/decorators/active-user.decorator';
import type { JwtPayload } from 'src/idm/interfaces/jwt.interface';

@ApiTags('dashboard')
@SkipThrottle()
@Controller({
  path: 'dashboard/preferences',
  version: '1',
})
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get dashboard card preferences' })
  @ApiOkResponse({ description: 'Dashboard preferences' })
  getPreferences(@ActiveUser() user: JwtPayload) {
    return this.dashboardService.getPreferences(user.sub);
  }

  @Put()
  @ApiOperation({ summary: 'Update dashboard card preferences' })
  @ApiOkResponse({ description: 'Updated dashboard preferences' })
  updatePreferences(
    @Body() dto: UpdateDashboardPreferenceDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.dashboardService.updatePreferences(user.sub, dto);
  }
}
