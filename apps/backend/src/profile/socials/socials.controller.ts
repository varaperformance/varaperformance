import { Controller, Get, Body, Delete, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { SocialsService } from './socials.service';
import { CreateSocialsDto } from './dto/socials.dto';
import { ActiveUser } from '../../idm/decorators/active-user.decorator';
import { Permissions } from '../../idm/decorators/permissions.decorator';
import type { JwtPayload } from '../../idm/interfaces/jwt.interface';

@ApiTags('socials')
@Controller({
  path: 'socials',
  version: '1',
})
export class SocialsController {
  constructor(private readonly socialsService: SocialsService) {}

  @ApiOperation({ summary: 'Get current user socials' })
  @ApiOkResponse({ description: 'User socials' })
  @Permissions('profile:read')
  @Get()
  findOne(@ActiveUser() user: JwtPayload) {
    return this.socialsService.findByUserId(user.sub);
  }

  @ApiOperation({ summary: 'Save current user socials' })
  @ApiOkResponse({ description: 'Socials saved' })
  @Permissions('profile:update')
  @Put()
  save(@Body() data: CreateSocialsDto, @ActiveUser() user: JwtPayload) {
    return this.socialsService.upsert(user.sub, data);
  }

  @ApiOperation({ summary: 'Delete current user socials' })
  @ApiOkResponse({ description: 'Socials deleted' })
  @Permissions('profile:delete')
  @Delete()
  remove(@ActiveUser() user: JwtPayload) {
    return this.socialsService.remove(user.sub);
  }
}
