import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { SecurityModule } from '@app/security';
import { StorageModule } from '@app/common/storage';
import { ClimbController } from './climb.controller';
import { ClimbService } from './climb.service';
import { HabitsModule } from '../health/habits/habits.module';

@Module({
  imports: [DatabaseModule, StorageModule, SecurityModule, HabitsModule],
  controllers: [ClimbController],
  providers: [ClimbService],
  exports: [ClimbService],
})
export class ClimbModule {}
