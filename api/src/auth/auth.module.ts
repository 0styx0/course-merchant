import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import { PrismaModule } from "@/prisma/prisma.module.js";
import { AdminAuthGuard } from "./admin-auth.guard.js";
import { AdminLoginAttemptsRepository } from "./admin-login-attempts.repository.js";
import { AdminSessionCleanup } from "./admin-session-cleanup.js";
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
    AdminSessionCleanup,
    // deny by default: every route needs a login unless it is marked @Public()
    { provide: APP_GUARD, useClass: AdminAuthGuard },
    AdminsRepository,
    AdminSessionsRepository,
    AdminLoginAttemptsRepository,
    { provide: HashingSlots, useValue: new HashingSlots(MAX_PARALLEL_HASHES) },
  ],
})
export class AuthModule {}
