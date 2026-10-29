import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "@/prisma/prisma.service.js";
import { isOurPaymentId } from "../payment-id.js";
import type { ExpiredCheckout } from "../stripe/checkout-events.js";
import { PaymentsRepository } from "../payments.repository.js";

/**
 * Marks the payment of an abandoned checkout as expired. There's nothing to
 * grant, email or refund. A late `completed` event for it is ignored because
 * only pending payments can succeed.
 */
@Injectable()
export class ExpiryService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(PaymentsRepository)
    private readonly paymentsRepository: PaymentsRepository,
  ) {}

  async expireCheckout(checkout: ExpiredCheckout): Promise<void> {
    await this.prisma.db.transaction(async (tx) => {
      const isNewEvent = await this.paymentsRepository.recordProcessedEvent(
        tx,
        checkout.event,
      );

      if (isNewEvent && isOurPaymentId(checkout.paymentId)) {
        await this.paymentsRepository.markPaymentExpired(
          tx,
          checkout.paymentId,
        );
      }
    });
  }
}
