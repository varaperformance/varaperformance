import { Module } from "@nestjs/common";
import { StackTipsService } from "./stack-tips.service";

@Module({
  providers: [StackTipsService],
})
export class StackTipsModule {}
