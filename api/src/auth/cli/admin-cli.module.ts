import { Module } from "@nestjs/common";

import { PrismaModule } from "@/prisma/prisma.module.js";
import { AdminsRepository } from "../admins.repository.js";

/**
 * What the admin commands need, and nothing else: `AppModule` would start the
 * email worker and sweeper and demand the Stripe and email settings.
 */
@Module({
  imports: [PrismaModule],
  providers: [AdminsRepository],
})
export class AdminCliModule {}
