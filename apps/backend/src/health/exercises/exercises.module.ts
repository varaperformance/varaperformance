import { Module } from '@nestjs/common';
import { ExerciseService } from './exercises.service';
import { ExerciseController } from './exercises.controller';
import { ExerciseDbService } from './exercisedb.service';

@Module({
  controllers: [ExerciseController],
  providers: [ExerciseService, ExerciseDbService],
})
export class ExercisesModule {}
