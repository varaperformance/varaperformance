import { Module } from '@nestjs/common';
import { GroceryListsController } from './grocery-lists.controller';
import { GroceryListsService } from './services/grocery-lists.service';

@Module({
  controllers: [GroceryListsController],
  providers: [GroceryListsService],
  exports: [GroceryListsService],
})
export class GroceryListsModule {}
