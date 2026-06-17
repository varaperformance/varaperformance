import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SecurityModule } from '@app/security';
import { ElevateService } from './elevate.service';
import { ElevateController } from './elevate.controller';
import { NotificationModule } from '../notification/notification.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { ElevateGateway } from './elevate.gateway';

@Module({
  imports: [
    SecurityModule,
    NotificationModule,
    AchievementsModule,
    JwtModule.register({}),
  ],
  controllers: [ElevateController],
  providers: [ElevateService, ElevateGateway],
  exports: [ElevateService, ElevateGateway],
})
export class ElevateModule {}
