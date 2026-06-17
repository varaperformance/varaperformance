import { Controller, Get, Post, Put, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { ConsentService } from './consent.service';
import {
  ReconsentDto,
  RevokeConsentDto,
  GetActiveLegalDocsDto,
  EmailPreferencesDto,
  UnsubscribeQueryDto,
} from './dto/consent.dto';
import { Public } from 'src/idm/decorators/public.decorator';
import { AllowRestricted } from 'src/idm/decorators/allow-restricted.decorator';
import { ActiveUser } from 'src/idm/decorators/active-user.decorator';
import type { JwtPayload } from 'src/idm/interfaces/jwt.interface';
import { ClientMeta, type ClientMetadata } from '@app/common/decorators';
import { Throttle } from '@nestjs/throttler';
import type { ConsentType } from '@varaperformance/core';
import { SkipAudit } from '@app/common/audit';

@ApiTags('consent')
@Throttle({ default: { ttl: 10000, limit: 40 } })
@AllowRestricted()
@Controller({
  path: 'consent',
  version: '1',
})
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  /**
   * Get active legal documents (public)
   * Used by registration page to fetch current versions
   */
  @Public()
  @SkipAudit()
  @Get('legal/active')
  @ApiOperation({ summary: 'Get active legal documents' })
  @ApiOkResponse({
    description: 'List of active legal documents with versions',
  })
  getActiveLegalDocuments(@Query() query: GetActiveLegalDocsDto) {
    return this.consentService.getActiveLegalDocuments(query.types);
  }

  /**
   * Get a specific legal document with content
   */
  @Public()
  @SkipAudit()
  @Get('legal/:type')
  @ApiOperation({ summary: 'Get a legal document by type' })
  @ApiOkResponse({ description: 'Legal document with full content' })
  getLegalDocument(
    @Param('type') type: string,
    @Query('version') version?: string,
  ) {
    return this.consentService.getLegalDocument(type as ConsentType, version);
  }

  /**
   * Get all versions of a legal document type
   * SOC2/HIPAA: Provides version history for compliance audit
   */
  @Public()
  @SkipAudit()
  @Get('legal/:type/versions')
  @ApiOperation({ summary: 'Get all versions of a legal document type' })
  @ApiOkResponse({ description: 'List of document versions with hashes' })
  getLegalDocumentVersions(@Param('type') type: string) {
    return this.consentService.getLegalDocumentVersions(type as ConsentType);
  }

  /**
   * Get user's consent history
   */
  @Get('my-consents')
  @ApiOperation({ summary: 'Get current user consent history' })
  @ApiOkResponse({ description: 'List of user consent records' })
  getUserConsents(@ActiveUser() user: JwtPayload) {
    return this.consentService.getUserConsents(user.sub);
  }

  /**
   * Check if user needs to re-consent
   */
  @Get('check')
  @ApiOperation({
    summary: 'Check if user needs to re-consent to updated documents',
  })
  @ApiOkResponse({ description: 'Re-consent check result' })
  checkReconsentNeeded(@ActiveUser() user: JwtPayload) {
    return this.consentService.checkReconsentNeeded(user.sub);
  }

  /**
   * Re-consent to updated legal documents
   * SOC2/HIPAA: Records new consent grants with audit trail
   */
  @Post('reconsent')
  @ApiOperation({ summary: 'Re-consent to updated legal documents' })
  @ApiOkResponse({ description: 'Consent records created' })
  async reconsent(
    @Body() dto: ReconsentDto,
    @ActiveUser() user: JwtPayload,
    @ClientMeta() ctx: ClientMetadata,
  ) {
    // Validate versions are current
    await this.consentService.validateConsents(dto.consents);

    // Record consents
    return this.consentService.recordConsents(user.sub, dto.consents, {
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      surface: 'reconsent',
    });
  }

  /**
   * Revoke a consent
   * SOC2/HIPAA: Tracks consent revocation with audit trail
   */
  @Post('revoke')
  @ApiOperation({ summary: 'Revoke a consent' })
  @ApiOkResponse({ description: 'Consent revoked' })
  revokeConsent(
    @Body() dto: RevokeConsentDto,
    @ActiveUser() user: JwtPayload,
    @ClientMeta() ctx: ClientMetadata,
  ) {
    return this.consentService.revokeConsent(user.sub, dto.type, dto.version, {
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }

  // ─── Email Preferences (GDPR Art. 21) ───────────────────────

  /**
   * Get email preferences (marketing opt-in status)
   */
  @Get('email-preferences')
  @SkipAudit()
  @ApiOperation({ summary: 'Get email marketing preferences' })
  @ApiOkResponse({ description: 'Current email preferences' })
  getEmailPreferences(@ActiveUser() user: JwtPayload) {
    return this.consentService.getEmailPreferences(user.sub);
  }

  /**
   * Update email preferences (opt-in / opt-out)
   */
  @Put('email-preferences')
  @ApiOperation({ summary: 'Update email marketing preferences' })
  @ApiOkResponse({ description: 'Updated email preferences' })
  updateEmailPreferences(
    @Body() dto: EmailPreferencesDto,
    @ActiveUser() user: JwtPayload,
    @ClientMeta() ctx: ClientMetadata,
  ) {
    return this.consentService.updateEmailPreferences(
      user.sub,
      dto.marketingOptIn,
      { ipAddress: ctx.ipAddress, userAgent: ctx.userAgent },
    );
  }

  /**
   * One-click unsubscribe from email (RFC 8058)
   * Public endpoint — authenticates via signed token in URL
   */
  @Public()
  @SkipAudit()
  @Post('unsubscribe')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Unsubscribe from marketing emails via token' })
  @ApiOkResponse({ description: 'Unsubscribed successfully' })
  processUnsubscribe(@Query() query: UnsubscribeQueryDto) {
    return this.consentService.processUnsubscribe(query.token);
  }
}
