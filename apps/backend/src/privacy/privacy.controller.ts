import { Controller, Delete, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { PrivacyService } from './privacy.service';
import { ActiveUser } from 'src/idm/decorators/active-user.decorator';
import type { JwtPayload } from 'src/idm/interfaces/jwt.interface';
import { Throttle } from '@nestjs/throttler';
import { Audit } from '@app/common/audit';
import { AuditAction } from '@app/common/audit';
import { DeleteAccountDto } from './dto/privacy.dto.js';
import { AllowRestricted } from 'src/idm/decorators/allow-restricted.decorator';

@ApiTags('privacy')
@Throttle({ default: { ttl: 1000, limit: 10 } })
@AllowRestricted()
@Controller({
  path: 'privacy',
  version: '1',
})
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  /**
   * GDPR Art. 15 & 20: Data Export — Right of Access / Data Portability
   * Returns all personal data as JSON.
   */
  @Get('export')
  @Audit({
    action: AuditAction.EXPORT,
    resource: 'User',
  })
  @ApiOperation({ summary: 'Export all personal data (GDPR Art. 15, 20)' })
  @ApiOkResponse({ description: 'User data export in JSON format' })
  exportData(@ActiveUser() user: JwtPayload) {
    return this.privacyService.exportUserData(user.sub);
  }

  /**
   * Check if the user's account is eligible for deletion.
   * Returns any blocking conditions that must be resolved first.
   */
  @Get('deletion-eligibility')
  @ApiOperation({
    summary: 'Check account deletion eligibility',
  })
  @ApiOkResponse({ description: 'Eligibility check result with any blockers' })
  checkDeletionEligibility(@ActiveUser() user: JwtPayload) {
    return this.privacyService.checkDeletionEligibility(user.sub);
  }

  /**
   * GDPR Art. 17: Right to Erasure — Self-Service Account Deletion
   * Permanently deletes the user's account and all associated data.
   */
  @Delete('account')
  @Audit({
    action: AuditAction.DELETE,
    resource: 'User',
  })
  @ApiOperation({
    summary: 'Delete account and all personal data (GDPR Art. 17)',
  })
  @ApiOkResponse({ description: 'Account deletion confirmed' })
  deleteAccount(@Body() dto: DeleteAccountDto, @ActiveUser() user: JwtPayload) {
    return this.privacyService.deleteAccount(user.sub);
  }

  /**
   * GDPR Art. 18: Right to Restriction of Processing
   * Pauses all data processing while retaining the account.
   */
  @Post('restrict')
  @ApiOperation({
    summary: 'Restrict processing of personal data (GDPR Art. 18)',
  })
  @ApiOkResponse({ description: 'Processing restricted' })
  restrictProcessing(@ActiveUser() user: JwtPayload) {
    return this.privacyService.setRestriction(user.sub, true);
  }

  /**
   * GDPR Art. 18: Lift restriction on processing.
   */
  @Post('unrestrict')
  @ApiOperation({
    summary: 'Lift restriction on processing (GDPR Art. 18)',
  })
  @ApiOkResponse({ description: 'Processing unrestricted' })
  unrestrictProcessing(@ActiveUser() user: JwtPayload) {
    return this.privacyService.setRestriction(user.sub, false);
  }
}
