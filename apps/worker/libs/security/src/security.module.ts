import { Module } from "@nestjs/common";
import { SecretsModule } from "@app/common/secrets";
import { EncryptionService } from "./encryption.service";

@Module({
  imports: [SecretsModule],
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class SecurityModule {}
