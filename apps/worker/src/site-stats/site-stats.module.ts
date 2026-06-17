import { Module } from "@nestjs/common";
import { SiteStatsService } from "./site-stats.service";

@Module({
  providers: [SiteStatsService],
})
export class SiteStatsModule {}
