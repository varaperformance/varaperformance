import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { BreachController } from './breach.controller';
import { BreachService } from './breach.service';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [BreachController],
  providers: [BreachService],
})
export class BreachModule {}
