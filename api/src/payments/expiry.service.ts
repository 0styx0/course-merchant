import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "@/prisma/prisma.service.js";
import { isOurPaymentId } from "./payment-id.js";
import {
  PaymentsRepository,
  type ProviderEvent,
} from "./payments.repository.js";

/**
 * A checkout the provider reports as expired, in our terms: the buyer left
 * without paying.
 */
export type ExpiredCheckout = {
  event: ProviderEvent;
  // our Payment id, echoed back by the provider. Null when the checkout
  // wasn't started by us
  paymentId: string | null;
};

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
