import { Module } from "@nestjs/common";

import { EnrollmentsModule } from "@/enrollments/enrollments.module.js";
import { PaymentsModule } from "@/payments/payments.module.js";
import { PrismaModule } from "@/prisma/prisma.module.js";
import { AdminEnrollmentsController } from "./admin-enrollments.controller.js";
import { AdminEnrollmentsService } from "./admin-enrollments.service.js";

@Module({
  imports: [PrismaModule, PaymentsModule, EnrollmentsModule],
  controllers: [AdminEnrollmentsController],
  providers: [AdminEnrollmentsService],
})
export class AdminEnrollmentsModule {}
