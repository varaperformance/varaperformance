import { Module } from "@nestjs/common";
import { WorkoutQuoteService } from "./workout-quote.service";

@Module({
  providers: [WorkoutQuoteService],
})
export class WorkoutQuoteModule {}
