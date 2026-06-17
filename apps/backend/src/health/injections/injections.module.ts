import { Module } from '@nestjs/common';
import { SecurityModule } from '@app/security';
import { InjectionsController } from './injections.controller';
import { InjectionsService } from './injections.service';
import { HabitsModule } from '../habits/habits.module';

@Module({
  imports: [SecurityModule, HabitsModule],
  controllers: [InjectionsController],
  providers: [InjectionsService],
  exports: [InjectionsService],
})
export class InjectionsModule {}
