import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { SecurityModule } from '@app/security';
import { PaymentModule } from '../payment/payment.module';
import { NotificationModule } from '../notification/notification.module';
import { CommerceController } from './commerce.controller';
import { CommerceService } from './commerce.service';

@Module({
  imports: [DatabaseModule, SecurityModule, PaymentModule, NotificationModule],
  controllers: [CommerceController],
  providers: [CommerceService],
  exports: [CommerceService],
})
export class CommerceModule {}
