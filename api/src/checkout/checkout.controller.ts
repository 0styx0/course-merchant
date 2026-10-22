import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
} from "@nestjs/common";

import type {
  CheckoutStatusResponse,
  StartCheckoutRequest,
  StartCheckoutResponse,
} from "types.js";
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

  // an unknown or malformed id simply isn't found, so it needs no format check
  @Get(":checkoutId")
  getCheckoutStatus(
    @Param("checkoutId") checkoutId: string,
  ): Promise<CheckoutStatusResponse> {
    return this.checkoutService.getCheckoutStatus(checkoutId);
  }
}
