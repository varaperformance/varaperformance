import {
  Controller,
  Get,
  Header,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { ReleaseNotesService } from './release-notes.service';
import { Public } from 'src/idm/decorators/public.decorator';
import { Permissions } from 'src/idm/decorators/permissions.decorator';
import { SkipAudit } from '@app/common/audit';
import {
  CreateReleaseNoteDto,
  UpdateReleaseNoteDto,
  ReleaseNoteQueryDto,
} from './dto/release-note.dto';

@ApiTags('release-notes')
@Controller({
  version: '1',
  path: 'release-notes',
})
export class ReleaseNotesController {
  constructor(private readonly releaseNotesService: ReleaseNotesService) {}

  // ==================== Public Endpoints ====================

  @ApiOperation({ summary: 'Get all published release notes' })
  @ApiOkResponse({ description: 'List of published release notes' })
  @Public()
  @SkipAudit()
  @Header('Cache-Control', 'public, max-age=60')
  @Get('public')
  getPublicReleaseNotes() {
    return this.releaseNotesService.getPublicReleaseNotes();
  }

  @ApiOperation({ summary: 'Get the latest published release' })
  @ApiOkResponse({ description: 'Latest release note' })
  @Public()
  @SkipAudit()
  @Header('Cache-Control', 'public, max-age=60')
  @Get('latest')
  getLatestRelease() {
    return this.releaseNotesService.getLatestRelease();
  }

  // ==================== Admin Endpoints ====================

  @ApiOperation({ summary: 'Get release notes (admin)' })
  @ApiOkResponse({ description: 'Paginated release notes' })
  @Permissions('release-note:read')
  @Get()
  getReleaseNotes(@Query() query: ReleaseNoteQueryDto) {
    return this.releaseNotesService.getReleaseNotes(query);
  }

  @ApiOperation({ summary: 'Get a single release note' })
  @ApiOkResponse({ description: 'Release note details' })
  @Permissions('release-note:read')
  @Get(':id')
  getReleaseNote(@Param('id') id: string) {
    return this.releaseNotesService.getReleaseNote(id);
  }

  @ApiOperation({ summary: 'Create release note' })
  @ApiOkResponse({ description: 'Release note created' })
  @Permissions('release-note:create')
  @Post()
  createReleaseNote(@Body() data: CreateReleaseNoteDto) {
    return this.releaseNotesService.createReleaseNote(data);
  }

  @ApiOperation({ summary: 'Update release note' })
  @ApiOkResponse({ description: 'Release note updated' })
  @Permissions('release-note:update')
  @Patch(':id')
  updateReleaseNote(
    @Param('id') id: string,
    @Body() data: UpdateReleaseNoteDto,
  ) {
    return this.releaseNotesService.updateReleaseNote(id, data);
  }

  @ApiOperation({ summary: 'Delete release note' })
  @ApiOkResponse({ description: 'Release note deleted' })
  @Permissions('release-note:delete')
  @Delete(':id')
  deleteReleaseNote(@Param('id') id: string) {
    return this.releaseNotesService.deleteReleaseNote(id);
  }
}
