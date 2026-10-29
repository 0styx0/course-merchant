import type { RetrievedCheckout } from "@/payments/stripe/checkout-events.js";
import {
  StripeService,
  type RefundPaymentInput,
} from "@/payments/stripe/stripe.service.js";

// answers from what the test set up, instead of calling Stripe
export class FakeStripeService extends StripeService {
  readonly refunds: RefundPaymentInput[] = [];
  readonly checkouts = new Map<string, RetrievedCheckout>();
  refundFailure?: Error;

  constructor() {
    super(undefined as never, undefined as never);
  }

  override refundPayment(input: RefundPaymentInput): Promise<void> {
    this.refunds.push(input);

    return this.refundFailure
      ? Promise.reject(this.refundFailure)
      : Promise.resolve();
  }

  override retrieveCheckout(
    providerCheckoutId: string,
  ): Promise<RetrievedCheckout> {
    const checkout = this.checkouts.get(providerCheckoutId);

    return checkout
      ? Promise.resolve(checkout)
      : Promise.reject(new Error(`No checkout ${providerCheckoutId}`));
  }
}
