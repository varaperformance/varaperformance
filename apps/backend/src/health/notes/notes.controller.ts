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
import { NotesService } from './notes.service';
import { ActiveUser } from '../../idm/decorators/active-user.decorator';
import { Permissions } from '../../idm/decorators/permissions.decorator';
import type { JwtPayload } from '../../idm/interfaces/jwt.interface';
import {
  CreateNoteDto,
  UpdateNoteDto,
  NoteParamsDto,
  NoteQueryDto,
} from './dto/notes.dto';

@ApiTags('notes')
@Controller({
  path: 'notes',
  version: '1',
})
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @ApiOperation({ summary: 'Create a note' })
  @ApiOkResponse({ description: 'Note created' })
  @Permissions('health:create')
  @Post()
  create(@Body() data: CreateNoteDto, @ActiveUser() user: JwtPayload) {
    return this.notesService.create(user.sub, data);
  }

  @ApiOperation({ summary: 'List notes for the active user' })
  @ApiOkResponse({ description: 'Paginated list of notes' })
  @Permissions('health:read')
  @Get()
  findAll(@Query() query: NoteQueryDto, @ActiveUser() user: JwtPayload) {
    return this.notesService.findAll(user.sub, query);
  }

  @ApiOperation({ summary: 'Get a note by ID' })
  @ApiOkResponse({ description: 'Note detail' })
  @Permissions('health:read')
  @Get(':id')
  findOne(@Param() params: NoteParamsDto, @ActiveUser() user: JwtPayload) {
    return this.notesService.findOne(user.sub, params.id);
  }

  @ApiOperation({ summary: 'Update a note' })
  @ApiOkResponse({ description: 'Updated note' })
  @Permissions('health:update')
  @Patch(':id')
  update(
    @Param() params: NoteParamsDto,
    @Body() data: UpdateNoteDto,
    @ActiveUser() user: JwtPayload,
  ) {
    return this.notesService.update(user.sub, params.id, data);
  }

  @ApiOperation({ summary: 'Delete a note' })
  @ApiOkResponse({ description: 'Note deleted' })
  @Permissions('health:delete')
  @Delete(':id')
  remove(@Param() params: NoteParamsDto, @ActiveUser() user: JwtPayload) {
    return this.notesService.remove(user.sub, params.id);
  }
}
