import { Module } from '@nestjs/common';
import { SecretsModule } from '@app/common/secrets';
import { HashingService } from './hashing.service';
import { EncryptionService } from './encryption.service';
import { SignatureService } from './signature.service';

@Module({
  imports: [SecretsModule],
  controllers: [],
  providers: [HashingService, EncryptionService, SignatureService],
  exports: [HashingService, EncryptionService, SignatureService],
})
export class SecurityModule {}
