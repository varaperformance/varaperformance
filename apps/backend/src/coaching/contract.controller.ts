import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ContractService } from './contract.service';
import { Permissions } from '../idm/decorators/permissions.decorator';
import { Public } from '../idm/decorators/public.decorator';
import { ActiveUser } from '../idm/decorators/active-user.decorator';
import { SkipAudit } from '@app/common/audit';
import {
  CoachContractParamsDto,
  CoachContractQueryDto,
  CreateCoachContractDto,
  CreateCoachContractVersionDto,
} from './dto/contract.dto';

/**
 * Coach Contract Controller
 * WORM (Write Once Read Many) compliant contract management
 *
 * Public endpoints:
 * - GET /coaches/:coachId/contract/active - Get active contract for a coach (for clients)
 *
 * Coach endpoints (require coach role):
 * - GET /coaches/me/contracts - List my contracts
 * - GET /coaches/me/contracts/:id - Get single contract details
 * - GET /coaches/me/contracts/versions - Get version history
 * - POST /coaches/me/contracts - Create new contract
 * - POST /coaches/me/contracts/:id/version - Create new version (WORM compliant)
 * - GET /coaches/me/contracts/:id/verify - Verify contract integrity
 *
 * Admin endpoints (require permissions):
 * - GET /coaches/contracts/admin - List all contracts across all coaches
 * - GET /coaches/contracts/admin/:id - Get single contract details
 * - GET /coaches/contracts/admin/:id/verify - Verify contract integrity
 */
@ApiTags('Coach Contracts')
@Throttle({ default: { ttl: 10000, limit: 40 } })
@Controller({
  path: 'coaches',
  version: '1',
})
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  // ==========================================================================
  // Public Endpoints (for clients viewing contracts)
  // ==========================================================================

  @ApiOperation({ summary: 'Get active contract for a coach (public)' })
  @ApiOkResponse({ description: 'Active contract for the coach' })
  @Public()
  @SkipAudit()
  @Get(':coachId/contract/active')
  getActiveContract(@Param() params: CoachContractParamsDto) {
    return this.contractService.getActiveContract(params.coachId);
  }

  // ==========================================================================
  // Coach Endpoints (for coaches managing their own contracts)
  // ==========================================================================

  @ApiOperation({ summary: 'Get my contracts' })
  @ApiOkResponse({ description: 'Paginated list of my contracts' })
  @ApiBearerAuth()
  @Permissions('coaching:read')
  @Get('me/contracts')
  async findMyContracts(
    @ActiveUser('sub') userId: string,
    @Query() query: CoachContractQueryDto,
  ) {
    const coachId = await this.getCoachIdFromUser(userId);
    return this.contractService.findAllForCoach(coachId, query);
  }

  @ApiOperation({ summary: 'Get my contract version history' })
  @ApiOkResponse({ description: 'Version history of my contracts' })
  @ApiBearerAuth()
  @Permissions('coaching:read')
  @Get('me/contracts/versions')
  async getMyVersionHistory(@ActiveUser('sub') userId: string) {
    const coachId = await this.getCoachIdFromUser(userId);
    return this.contractService.getVersionHistory(coachId);
  }

  @ApiOperation({ summary: 'Verify my contract integrity' })
  @ApiOkResponse({ description: 'Integrity verification result' })
  @ApiBearerAuth()
  @Permissions('coaching:read')
  @Get('me/contracts/:id/verify')
  async verifyMyContractIntegrity(
    @ActiveUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    // First verify the coach owns this contract
    const coachId = await this.getCoachIdFromUser(userId);
    await this.contractService.findOne(id, coachId);
    return this.contractService.verifyIntegrity(id);
  }

  @ApiOperation({ summary: 'Get single contract details' })
  @ApiOkResponse({ description: 'Contract with full content' })
  @ApiBearerAuth()
  @Permissions('coaching:read')
  @Get('me/contracts/:id')
  async findMyContract(
    @ActiveUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    const coachId = await this.getCoachIdFromUser(userId);
    return this.contractService.findOne(id, coachId);
  }

  @ApiOperation({ summary: 'Create a new contract' })
  @ApiOkResponse({ description: 'Contract created' })
  @ApiBearerAuth()
  @Permissions('coaching:update')
  @Post('me/contracts')
  async create(
    @ActiveUser('sub') userId: string,
    @Body() data: CreateCoachContractDto,
  ) {
    const coachId = await this.getCoachIdFromUser(userId);
    return this.contractService.create(coachId, data);
  }

  @ApiOperation({
    summary: 'Create new version of contract (WORM compliant)',
  })
  @ApiOkResponse({
    description: 'New contract version created, previous version preserved',
  })
  @ApiBearerAuth()
  @Permissions('coaching:update')
  @Post('me/contracts/:id/version')
  async createVersion(
    @ActiveUser('sub') userId: string,
    @Param('id') id: string,
    @Body() data: CreateCoachContractVersionDto,
  ) {
    const coachId = await this.getCoachIdFromUser(userId);
    return this.contractService.createVersion(id, coachId, data);
  }

  // ==========================================================================
  // Admin Endpoints (for platform admins)
  // ==========================================================================

  @ApiOperation({ summary: 'Get all contracts (admin)' })
  @ApiOkResponse({ description: 'Paginated contract list' })
  @ApiBearerAuth()
  @Permissions('contract:read')
  @Get('contracts/admin')
  findAll(@Query() query: CoachContractQueryDto) {
    return this.contractService.findAll(query);
  }

  @ApiOperation({ summary: 'Get single contract details (admin)' })
  @ApiOkResponse({ description: 'Contract with full content' })
  @ApiBearerAuth()
  @Permissions('contract:read')
  @Get('contracts/admin/:id')
  findOne(@Param('id') id: string) {
    return this.contractService.findOne(id);
  }

  @ApiOperation({ summary: 'Verify contract integrity (admin)' })
  @ApiOkResponse({ description: 'Integrity verification result' })
  @ApiBearerAuth()
  @Permissions('contract:read')
  @Get('contracts/admin/:id/verify')
  verifyIntegrity(@Param('id') id: string) {
    return this.contractService.verifyIntegrity(id);
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Get coach ID from user ID
   * Throws if user is not a coach
   */
  private coachIdCache = new Map<string, string>();

  private async getCoachIdFromUser(userId: string): Promise<string> {
    // Check cache first
    if (this.coachIdCache.has(userId)) {
      return this.coachIdCache.get(userId)!;
    }

    // Import DatabaseService through ContractService's dependency
    const coach = await (this.contractService as any).db.coach.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!coach) {
      throw new Error('User is not a coach');
    }

    this.coachIdCache.set(userId, coach.id);
    return coach.id;
  }
}
