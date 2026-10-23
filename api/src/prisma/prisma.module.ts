import { Module } from "@nestjs/common";
import { DatabaseClock } from "./database-clock.js";
import { PrismaService } from "./prisma.service.js";

@Module({
  providers: [PrismaService, DatabaseClock],
  exports: [PrismaService, DatabaseClock],
})
export class PrismaModule {}
