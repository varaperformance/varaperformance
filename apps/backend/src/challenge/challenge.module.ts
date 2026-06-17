import { Module } from '@nestjs/common';
import { ChallengeService } from './challenge.service';
import { ChallengeController } from './challenge.controller';
import { AdminChallengeController } from './admin-challenge.controller';
import { AchievementsModule } from '../achievements/achievements.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [AchievementsModule, NotificationModule],
  controllers: [ChallengeController, AdminChallengeController],
  providers: [ChallengeService],
  exports: [ChallengeService],
})
export class ChallengeModule {}
