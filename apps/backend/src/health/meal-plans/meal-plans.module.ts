import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { MealPlansController } from './meal-plans.controller';
import { MealPlansService } from './services/meal-plans.service';

@Module({
  imports: [DatabaseModule],
  controllers: [MealPlansController],
  providers: [MealPlansService],
  exports: [MealPlansService],
})
export class MealPlansModule {}
