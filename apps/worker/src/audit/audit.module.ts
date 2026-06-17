import { Module } from "@nestjs/common";
import { SecurityModule } from "@app/security";
import { AuditConsumer } from "./audit.consumer";

@Module({
  imports: [SecurityModule],
  controllers: [AuditConsumer],
})
export class AuditModule {}
