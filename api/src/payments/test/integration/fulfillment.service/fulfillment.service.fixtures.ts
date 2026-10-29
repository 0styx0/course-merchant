import type { DbScope } from "types.js";
import {
  EmailOutboxRepository,
  type QueuedEmail,
} from "@/email/email-outbox.repository.js";
import {
  StripeService,
  type RefundPaymentInput,
} from "@/payments/stripe/stripe.service.js";

export class FailingEmailOutbox extends EmailOutboxRepository {
  override enqueue(_scope: DbScope, _email: QueuedEmail): Promise<void> {
    return Promise.reject(new Error("outbox unavailable"));
  }
}

// records the refunds it is asked for, or fails them, instead of calling Stripe
export class FakeStripeService extends StripeService {
  readonly refunds: RefundPaymentInput[] = [];

  constructor(private readonly failure?: Error) {
    super(undefined as never, undefined as never);
  }

  override refundPayment(input: RefundPaymentInput): Promise<void> {
    this.refunds.push(input);

    return this.failure ? Promise.reject(this.failure) : Promise.resolve();
  }
}
