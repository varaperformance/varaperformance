import { Module } from '@nestjs/common';
import { SecurityModule } from '@app/security';
import { GymsModule } from './gyms/gyms.module';
import { SocialsModule } from './socials/socials.module';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';

@Module({
  imports: [SecurityModule, GymsModule, SocialsModule],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService, GymsModule, SocialsModule],
})
export class ProfileModule {}
