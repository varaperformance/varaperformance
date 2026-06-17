import { Module } from '@nestjs/common';
import { SecurityModule } from '@app/security';
import { StacksService } from './stacks.service';
import { StacksController } from './stacks.controller';
import { HabitsModule } from '../habits/habits.module';

@Module({
  imports: [SecurityModule, HabitsModule],
  controllers: [StacksController],
  providers: [StacksService],
  exports: [StacksService],
})
export class StacksModule {}
