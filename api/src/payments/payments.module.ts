import { Module } from "@nestjs/common";

import {
  loadPaymentsConfig,
  PAYMENTS_CONFIG,
} from "@/config/payments-config.js";
import { EmailModule } from "@/email/email.module.js";
import { EnrollmentsModule } from "@/enrollments/enrollments.module.js";
import { PrismaModule } from "@/prisma/prisma.module.js";
import { FulfillmentService } from "./fulfillment.service.js";
import { PaymentsRepository } from "./payments.repository.js";
import { StripeService, stripeClientProvider } from "./stripe.service.js";

@Module({
  imports: [PrismaModule, EnrollmentsModule, EmailModule],
  providers: [
    // read once at startup, so a missing setting stops the app immediately
    { provide: PAYMENTS_CONFIG, useFactory: () => loadPaymentsConfig() },
    stripeClientProvider,
    StripeService,
    PaymentsRepository,
    FulfillmentService,
  ],
  exports: [
    PAYMENTS_CONFIG,
    StripeService,
    PaymentsRepository,
    FulfillmentService,
  ],
})
export class PaymentsModule {}
