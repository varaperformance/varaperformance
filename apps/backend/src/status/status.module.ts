import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StatusService } from './status.service';
import { StatusController } from './status.controller';

@Module({
  imports: [ConfigModule],
  controllers: [StatusController],
  providers: [StatusService],
})
export class StatusModule {}
