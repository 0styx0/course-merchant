import "server-only";

import { api } from "@/lib/api/client";
import { toResult } from "@/lib/api/to-result";
import type {
  CheckoutCustomer,
  ProblemDetails,
  Result,
  StartCheckoutResponse,
} from "@/lib/types";

export type StartCheckoutResult = Result<StartCheckoutResponse, ProblemDetails>;

export async function startCheckout(
  courseId: string,
  customer: CheckoutCustomer,
): Promise<StartCheckoutResult> {
  return toResult(
    await api.POST("/checkout-sessions", { body: { courseId, customer } }),
  );
}
