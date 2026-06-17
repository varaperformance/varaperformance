import { Module } from '@nestjs/common';
import { ReleaseNotesController } from './release-notes.controller';
import { ReleaseNotesService } from './release-notes.service';
import { DatabaseModule } from '@app/database';

@Module({
  imports: [DatabaseModule],
  controllers: [ReleaseNotesController],
  providers: [ReleaseNotesService],
  exports: [ReleaseNotesService],
})
export class ReleaseNotesModule {}
