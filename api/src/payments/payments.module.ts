import { Module } from "@nestjs/common";

import {
  loadPaymentsConfig,
  PAYMENTS_CONFIG,
} from "@/payments/payments-config.js";
import { EmailModule } from "@/email/email.module.js";
import { EnrollmentsModule } from "@/enrollments/enrollments.module.js";
import { PrismaModule } from "@/prisma/prisma.module.js";
import { ExpiryService } from "./fulfillment/expiry.service.js";
import { FulfillmentService } from "./fulfillment/fulfillment.service.js";
import { PaymentRefunds } from "./payment-refunds.js";
import { PaymentSweeper } from "./sweeper/payment-sweeper.js";
import { PaymentsRepository } from "./payments.repository.js";
import {
  StripeService,
  stripeClientProvider,
} from "./stripe/stripe.service.js";

@Module({
  imports: [PrismaModule, EnrollmentsModule, EmailModule],
  providers: [
    // read once at startup, so a missing setting stops the app immediately
    { provide: PAYMENTS_CONFIG, useFactory: () => loadPaymentsConfig() },
    stripeClientProvider,
    StripeService,
    PaymentsRepository,
    PaymentRefunds,
    FulfillmentService,
    ExpiryService,
    PaymentSweeper,
  ],
  exports: [
    PAYMENTS_CONFIG,
    StripeService,
    PaymentsRepository,
    FulfillmentService,
    ExpiryService,
  ],
})
export class PaymentsModule {}
