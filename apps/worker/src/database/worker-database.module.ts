import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseService } from "@app/database";

/**
 * Worker-specific database module that only provides DatabaseService
 * without Redis dependencies.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class WorkerDatabaseModule {}
