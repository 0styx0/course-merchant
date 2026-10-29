import { Inject, Injectable } from "@nestjs/common";

import { DatabaseClock } from "@/prisma/database-clock.js";
import { PrismaService } from "@/prisma/prisma.service.js";
import { PaymentsRepository } from "./payments.repository.js";
import {
  StripeService,
  type RefundPaymentInput,
} from "./stripe/stripe.service.js";

/**
 * Refunds a payment and records that it was refunded, so the sweeper stops
 * selecting it. Fulfillment and the sweeper both refund through this, so they
 * can't drift apart. Never call it inside a transaction: it calls Stripe.
 */
@Injectable()
export class PaymentRefunds {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(PaymentsRepository)
    private readonly paymentsRepository: PaymentsRepository,
    @Inject(StripeService)
    private readonly stripeService: StripeService,
    @Inject(DatabaseClock)
    private readonly clock: DatabaseClock,
  ) {}

  /**
   * @throws whatever `StripeService.refundPayment` throws; the payment then
   * stays `succeeded` and the sweeper retries
   */
  async refund(input: RefundPaymentInput): Promise<void> {
    await this.stripeService.refundPayment(input);

    await this.paymentsRepository.markPaymentRefunded(
      this.prisma.db,
      input.paymentId,
      await this.clock.now(this.prisma.db),
    );
  }
}
