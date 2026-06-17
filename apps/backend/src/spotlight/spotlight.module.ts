import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { SpotlightController } from './spotlight.controller';
import { SpotlightService } from './spotlight.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SpotlightController],
  providers: [SpotlightService],
  exports: [SpotlightService],
})
export class SpotlightModule {}
