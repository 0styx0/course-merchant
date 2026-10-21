import { Module } from "@nestjs/common";

import { loadPaymentsConfig, PAYMENTS_CONFIG } from "@/config/payments-config.js";
import { StripeService, stripeClientProvider } from "./stripe.service.js";

@Module({
  providers: [
    // read once at startup, so a missing setting stops the app immediately
    { provide: PAYMENTS_CONFIG, useFactory: () => loadPaymentsConfig() },
    stripeClientProvider,
    StripeService,
  ],
  exports: [PAYMENTS_CONFIG, StripeService],
})
export class PaymentsModule {}
