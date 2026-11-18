import { Module } from "@nestjs/common";

import { PrismaModule } from "@/prisma/prisma.module.js";
import { AdminCustomersController } from "./admin-customers.controller.js";
import { AdminCustomersRepository } from "./admin-customers.repository.js";
import { AdminCustomersService } from "./admin-customers.service.js";

@Module({
  imports: [PrismaModule],
  controllers: [AdminCustomersController],
  providers: [AdminCustomersService, AdminCustomersRepository],
})
export class AdminCustomersModule {}
