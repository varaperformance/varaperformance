import { Global, Module } from '@nestjs/common';
import { FoodSearchService } from './food-search.service';

@Global()
@Module({
  providers: [FoodSearchService],
  exports: [FoodSearchService],
})
export class FoodSearchModule {}
