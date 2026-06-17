import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { SecurityModule } from '@app/security';
import { LegalController } from './legal.controller';
import { LegalService } from './legal.service';

/**
 * Legal Document Module
 * SOC2/HIPAA: WORM (Write Once Read Many) compliant legal document management
 *
 * Provides:
 * - Public endpoints for consent flows (get active documents)
 * - Admin endpoints for document management with RBAC
 * - Content hashing for tamper detection
 * - Semantic versioning with full audit trail
 */
@Module({
  imports: [DatabaseModule, SecurityModule],
  controllers: [LegalController],
  providers: [LegalService],
  exports: [LegalService],
})
export class LegalModule {}
