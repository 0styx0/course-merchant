import { Module } from "@nestjs/common";

import { EmailModule } from "@/email/email.module.js";
import { PaymentsModule } from "@/payments/payments.module.js";
import { PrismaModule } from "@/prisma/prisma.module.js";
import { CheckoutController } from "./checkout.controller.js";
import { CheckoutRepository } from "./checkout.repository.js";
import { CheckoutService } from "./checkout.service.js";

@Module({
  imports: [PrismaModule, PaymentsModule, EmailModule],
  controllers: [CheckoutController],
  providers: [CheckoutService, CheckoutRepository],
})
export class CheckoutModule {}
