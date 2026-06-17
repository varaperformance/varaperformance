import { Module, forwardRef } from '@nestjs/common';
import { CoachingController } from './coaching.controller';
import { CoachingService } from './coaching.service';
import { ContractController } from './contract.controller';
import { ContractService } from './contract.service';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { SecurityModule } from '@app/security';
import { PaymentModule } from '../payment/payment.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    SecurityModule,
    NotificationModule,
    forwardRef(() => PaymentModule),
  ],
  // ContractController must be before CoachingController to prevent
  // CoachingController's :slug route from matching 'contracts/*' paths
  controllers: [AvailabilityController, ContractController, CoachingController],
  providers: [CoachingService, ContractService, AvailabilityService],
  exports: [CoachingService, ContractService, AvailabilityService],
})
export class CoachingModule {}
