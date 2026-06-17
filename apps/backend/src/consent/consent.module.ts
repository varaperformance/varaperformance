import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SecurityModule } from '@app/security';
import { ConsentController } from './consent.controller';
import { ConsentService } from './consent.service';
import { LegalModule } from './legal/legal.module';

@Module({
  imports: [LegalModule, SecurityModule, ConfigModule],
  controllers: [ConsentController],
  providers: [ConsentService],
  exports: [ConsentService, LegalModule],
})
export class ConsentModule {}
