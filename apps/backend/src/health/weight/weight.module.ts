import { Module } from '@nestjs/common';
import { WeightService } from './weight.service';
import { WeightController } from './weight.controller';
import { SecurityModule } from '@app/security';

@Module({
  imports: [SecurityModule],
  controllers: [WeightController],
  providers: [WeightService],
  exports: [WeightService],
})
export class WeightModule {}
