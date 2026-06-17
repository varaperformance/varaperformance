import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LegalService } from './legal.service';
import { Permissions } from 'src/idm/decorators/permissions.decorator';
import { Public } from 'src/idm/decorators/public.decorator';
import { SkipAudit } from '@app/common/audit';
import {
  LegalDocumentIdParamsDto,
  LegalDocumentTypeParamsDto,
  LegalDocumentQueryDto,
  CreateLegalDocumentDto,
  CreateLegalDocumentVersionDto,
} from './dto/legal.dto';
import { ConsentType } from '@generated/prisma';

/**
 * Legal Document Controller
 * SOC2/HIPAA: WORM (Write Once Read Many) compliant legal document management
 *
 * Public endpoints:
 * - GET /active - Get active legal documents for consent flows
 *
 * Admin endpoints (require permissions):
 * - GET /admin - List all documents with pagination
 * - GET /admin/:id - Get single document details
 * - GET /admin/type/:type/versions - Get version history for a type
 * - POST /admin - Create new document
 * - POST /admin/:id/version - Create new version (WORM compliant)
 * - GET /admin/:id/verify - Verify document integrity
 */
@ApiTags('Legal Documents')
@Throttle({ default: { ttl: 10000, limit: 40 } })
@Controller({
  path: 'legal',
  version: '1',
})
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  // ==========================================================================
  // Public Endpoints (for consent flows)
  // ==========================================================================

  @ApiOperation({ summary: 'Get active legal documents for consent' })
  @ApiOkResponse({ description: 'Active legal documents' })
  @ApiQuery({
    name: 'types',
    required: false,
    type: String,
    description: 'Comma-separated list of document types',
  })
  @Public()
  @SkipAudit()
  @Get('active')
  getActiveLegalDocuments(@Query('types') typesParam?: string) {
    const types = typesParam
      ? (typesParam.split(',').map((t) => t.trim()) as ConsentType[])
      : undefined;
    return this.legalService.getActiveLegalDocuments(types);
  }

  // ==========================================================================
  // Admin Endpoints (require permissions)
  // ==========================================================================

  @ApiOperation({ summary: 'Get all legal documents (admin)' })
  @ApiOkResponse({ description: 'Paginated legal document list' })
  @ApiBearerAuth()
  @Permissions('legal:read')
  @Get('admin')
  findAll(@Query() query: LegalDocumentQueryDto) {
    return this.legalService.findAll(query);
  }

  @ApiOperation({ summary: 'Get version history for a document type' })
  @ApiOkResponse({ description: 'Document version history' })
  @ApiBearerAuth()
  @Permissions('legal:read')
  @Get('admin/type/:type/versions')
  getVersionHistory(@Param() params: LegalDocumentTypeParamsDto) {
    return this.legalService.getVersionHistory(params.type as ConsentType);
  }

  @ApiOperation({ summary: 'Verify document integrity (tamper detection)' })
  @ApiOkResponse({ description: 'Integrity verification result' })
  @ApiBearerAuth()
  @Permissions('legal:read')
  @Get('admin/:id/verify')
  verifyIntegrity(@Param() params: LegalDocumentIdParamsDto) {
    return this.legalService.verifyIntegrity(params.id);
  }

  @ApiOperation({ summary: 'Get single legal document details' })
  @ApiOkResponse({ description: 'Legal document with full content' })
  @ApiBearerAuth()
  @Permissions('legal:read')
  @Get('admin/:id')
  findOne(@Param() params: LegalDocumentIdParamsDto) {
    return this.legalService.findOne(params.id);
  }

  @ApiOperation({ summary: 'Create a new legal document' })
  @ApiOkResponse({ description: 'Legal document created' })
  @ApiBearerAuth()
  @Permissions('legal:create')
  @Post('admin')
  create(@Body() data: CreateLegalDocumentDto) {
    return this.legalService.create(data);
  }

  @ApiOperation({
    summary: 'Create new version of legal document (WORM compliant)',
  })
  @ApiOkResponse({
    description: 'New document version created, previous version preserved',
  })
  @ApiBearerAuth()
  @Permissions('legal:update')
  @Post('admin/:id/version')
  createVersion(
    @Param() params: LegalDocumentIdParamsDto,
    @Body() data: CreateLegalDocumentVersionDto,
  ) {
    return this.legalService.createVersion(params.id, data);
  }
}
