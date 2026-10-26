import { Module } from "@nestjs/common";

import { PrismaModule } from "@/prisma/prisma.module.js";
import { AdminAuthGuard } from "./admin-auth.guard.js";
import { AdminLoginAttemptsRepository } from "./admin-login-attempts.repository.js";
import { AdminSessionsController } from "./admin-sessions.controller.js";
import { AdminSessionsRepository } from "./admin-sessions.repository.js";
import { AdminSessionsService } from "./admin-sessions.service.js";
import { AdminsRepository } from "./admins.repository.js";
import { HashingSlots } from "./hashing-slots.js";

// password hashes one server runs at once; more logins are refused
const MAX_PARALLEL_HASHES = 2;

@Module({
  imports: [PrismaModule],
  controllers: [AdminSessionsController],
  providers: [
    AdminSessionsService,
    AdminAuthGuard,
    AdminsRepository,
    AdminSessionsRepository,
    AdminLoginAttemptsRepository,
    { provide: HashingSlots, useValue: new HashingSlots(MAX_PARALLEL_HASHES) },
  ],
})
export class AuthModule {}
