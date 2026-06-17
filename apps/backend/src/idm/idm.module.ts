import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { IdmService } from './idm.service';
import { IdmController } from './idm.controller';
import { SecurityModule } from '@app/security';
import jwtConfig from './config/jwt.config';
import oauthConfig from './config/oauth.config';
import { OAuthService } from './oauth.service';
import { AuthorizationService } from './authorization.service';
import { TokenStorageClass } from './token-storage.class';
import { ConsentModule } from '../consent/consent.module';
import { TotpService } from './totp.service';

@Module({
  imports: [
    SecurityModule,
    ConfigModule.forFeature(jwtConfig),
    ConfigModule.forFeature(oauthConfig),
    JwtModule.registerAsync(jwtConfig.asProvider()),
    ConsentModule,
  ],
  controllers: [IdmController],
  providers: [
    IdmService,
    OAuthService,
    AuthorizationService,
    TokenStorageClass,
    TotpService,
  ],
  exports: [JwtModule, ConfigModule, TotpService],
})
export class IdmModule {}
