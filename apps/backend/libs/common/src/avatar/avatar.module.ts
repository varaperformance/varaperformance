import { Module, Global } from '@nestjs/common';
import { AvatarService } from './avatar.service.js';
import { StorageModule } from '../storage/storage.module';

@Global()
@Module({
  imports: [StorageModule],
  providers: [AvatarService],
  exports: [AvatarService],
})
export class AvatarModule {}
