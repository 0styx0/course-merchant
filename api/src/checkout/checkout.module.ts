import { Module } from "@nestjs/common";

import { EmailModule } from "@/email/email.module.js";
import { EnrollmentsModule } from "@/enrollments/enrollments.module.js";
import { PaymentsModule } from "@/payments/payments.module.js";
import { PrismaModule } from "@/prisma/prisma.module.js";
import { CheckoutDecisionService } from "./checkout-decision.service.js";
import { CheckoutEmailQueue } from "./checkout-email-queue.js";
import { CheckoutController } from "./checkout.controller.js";
import { CheckoutRepository } from "./checkout.repository.js";
import { CheckoutService } from "./checkout.service.js";
import { StripeRedirectService } from "./stripe-redirect.service.js";

@Module({
  imports: [PrismaModule, PaymentsModule, EmailModule, EnrollmentsModule],
  controllers: [CheckoutController],
  providers: [
    CheckoutService,
    CheckoutDecisionService,
    StripeRedirectService,
    CheckoutEmailQueue,
    CheckoutRepository,
  ],
})
export class CheckoutModule {}
