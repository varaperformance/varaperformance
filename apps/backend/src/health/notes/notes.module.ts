import { Module } from '@nestjs/common';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';
import { SecurityModule } from '@app/security';

@Module({
  imports: [SecurityModule],
  controllers: [NotesController],
  providers: [NotesService],
})
export class NotesModule {}
