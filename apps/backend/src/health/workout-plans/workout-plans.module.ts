import { Module, forwardRef } from '@nestjs/common';
import { SecurityModule } from '@app/security';
import { NotificationModule } from '../../notification/notification.module';
import { WorkoutPlansService } from './workout-plans.service';
import {
  WorkoutPlansController,
  CoachWorkoutPlansController,
} from './workout-plans.controller';

@Module({
  imports: [SecurityModule, forwardRef(() => NotificationModule)],
  controllers: [WorkoutPlansController, CoachWorkoutPlansController],
  providers: [WorkoutPlansService],
  exports: [WorkoutPlansService],
})
export class WorkoutPlansModule {}
