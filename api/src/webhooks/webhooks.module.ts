import { Module } from "@nestjs/common";

import { PaymentsModule } from "@/payments/payments.module.js";
import { StripeWebhookController } from "./stripe-webhook.controller.js";

@Module({
  imports: [PaymentsModule],
  controllers: [StripeWebhookController],
})
export class WebhooksModule {}
