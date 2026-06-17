import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { SecurityModule } from '@app/security';
import { NotificationQueueModule } from '@app/common/notification';
import { NotificationModule } from '../notification/notification.module';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { MessagingGateway } from './messaging.gateway';
import { GiphyService } from './giphy.service';

@Module({
  imports: [
    ConfigModule,
    SecurityModule,
    NotificationQueueModule,
    NotificationModule,
    JwtModule.register({}), // JWT for WebSocket auth
  ],
  controllers: [MessagingController],
  providers: [MessagingService, MessagingGateway, GiphyService],
  exports: [MessagingService, MessagingGateway, GiphyService],
})
export class MessagingModule {}
