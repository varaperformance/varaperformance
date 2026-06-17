import { Module } from "@nestjs/common";
import { MomentumService } from "./momentum.service";

@Module({
  providers: [MomentumService],
  exports: [MomentumService],
})
export class MomentumModule {}
