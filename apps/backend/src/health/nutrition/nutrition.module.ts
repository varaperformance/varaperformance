import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '@app/database';
import { SecurityModule } from '@app/security';
import { NutritionController } from './nutrition.controller';
import { FoodService } from './services/food.service';
import { FoodLogService } from './services/food-log.service';
import { USDAService } from './services/usda.service';
import { OpenFoodFactsService } from './services/openfoodfacts.service';
import { AchievementsModule } from '../../achievements/achievements.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    SecurityModule,
    AchievementsModule,
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
  ],
  controllers: [NutritionController],
  providers: [FoodService, FoodLogService, USDAService, OpenFoodFactsService],
  exports: [FoodService, FoodLogService],
})
export class NutritionModule {}
