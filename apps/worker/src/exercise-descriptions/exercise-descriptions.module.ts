import { Module } from "@nestjs/common";
import { ExerciseDescriptionsService } from "./exercise-descriptions.service";

@Module({
  providers: [ExerciseDescriptionsService],
})
export class ExerciseDescriptionsModule {}
