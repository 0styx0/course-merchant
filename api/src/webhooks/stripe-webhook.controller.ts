import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  type RawBodyRequest,
} from "@nestjs/common";
import type { Request } from "express";
import type Stripe from "stripe";

import { ApiException } from "@/common/errors/api.exception.js";
import { ErrorCode } from "@/common/errors/error-codes.js";
import { ExpiryService } from "@/payments/expiry.service.js";
import { FulfillmentService } from "@/payments/fulfillment.service.js";
import {
  completedCheckoutFromEvent,
  expiredCheckoutFromEvent,
} from "@/payments/stripe-events.js";
import {
  InvalidWebhookSignatureError,
  StripeService,
} from "@/payments/stripe.service.js";

@Controller({
  path: "webhooks/stripe",
  version: "1",
})
export class StripeWebhookController {
  constructor(
    @Inject(StripeService)
    private readonly stripeService: StripeService,
    @Inject(FulfillmentService)
    private readonly fulfillmentService: FulfillmentService,
    @Inject(ExpiryService)
    private readonly expiryService: ExpiryService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async receiveStripeEvent(
    @Req() request: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string | undefined,
  ): Promise<void> {
    const event = this.verify(request.rawBody, signature);

    await this.dispatch(event);
  }

  private verify(
    rawBody: Buffer | undefined,
    signature: string | undefined,
  ): Stripe.Event {
    try {
      return this.stripeService.verifyWebhookEvent(
        rawBody ?? Buffer.alloc(0),
        signature,
      );
    } catch (error) {
      if (error instanceof InvalidWebhookSignatureError) {
        throw new ApiException(ErrorCode.INVALID_WEBHOOK_SIGNATURE, {
          detail: error.message,
        });
      }

      throw error;
    }
  }

  // event types we don't subscribe to are acknowledged, so Stripe stops retrying
  private async dispatch(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case "checkout.session.completed":
        return this.fulfillmentService.fulfillCheckout(
          completedCheckoutFromEvent(event),
        );
      case "checkout.session.expired":
        return this.expiryService.expireCheckout(
          expiredCheckoutFromEvent(event),
        );
      default:
        return;
    }
  }
}
