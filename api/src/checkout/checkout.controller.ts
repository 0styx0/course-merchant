import { Body, Controller, HttpCode, HttpStatus, Inject, Post } from "@nestjs/common";

import type { StartCheckoutRequest, StartCheckoutResponse } from "types.js";
import { ZodValidationPipe } from "@/courses/pipes/create-course-validation.pipe.js";
import { CheckoutService } from "./checkout.service.js";
import { startCheckoutRequestSchema } from "./validation/start-checkout-request.schema.js";

@Controller({
  path: "checkout-sessions",
  version: "1",
})
export class CheckoutController {
  constructor(
    @Inject(CheckoutService)
    private readonly checkoutService: CheckoutService,
  ) {}

  // 200 for both outcomes, so the status code doesn't reveal whether the
  // email already owns the course
  @Post()
  @HttpCode(HttpStatus.OK)
  startCheckout(
    @Body(new ZodValidationPipe(startCheckoutRequestSchema))
    request: StartCheckoutRequest,
  ): Promise<StartCheckoutResponse> {
    return this.checkoutService.startCheckout(request);
  }
}
