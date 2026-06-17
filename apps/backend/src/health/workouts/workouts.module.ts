import { Module } from '@nestjs/common';
import { SecurityModule } from '@app/security';
import { WorkoutSessionsService } from './workout-sessions.service';
import { WorkoutSessionsController } from './workout-sessions.controller';
import { PersonalRecordsService } from './personal-records.service';
import { PersonalRecordsController } from './personal-records.controller';
import { WorkoutGoalService } from './workout-goal.service';
import { WorkoutGoalController } from './workout-goal.controller';
import { AchievementsModule } from '../../achievements/achievements.module';

@Module({
  imports: [SecurityModule, AchievementsModule],
  controllers: [
    WorkoutSessionsController,
    PersonalRecordsController,
    WorkoutGoalController,
  ],
  providers: [
    WorkoutSessionsService,
    PersonalRecordsService,
    WorkoutGoalService,
  ],
  exports: [WorkoutSessionsService, PersonalRecordsService, WorkoutGoalService],
})
export class WorkoutsModule {}
