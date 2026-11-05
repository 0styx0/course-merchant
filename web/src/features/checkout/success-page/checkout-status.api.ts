import "server-only";

import { api } from "@/lib/api/client";
import { toResult } from "@/lib/api/to-result";
import type { CheckoutStatus, ProblemDetails, Result } from "@/lib/types";

export type GetCheckoutStatusResult = Result<CheckoutStatus, ProblemDetails>;

export async function getCheckoutStatus(
  checkoutId: string,
): Promise<GetCheckoutStatusResult> {
  return toResult(
    await api.GET("/checkout-sessions/{checkoutId}", {
      params: { path: { checkoutId } },
    }),
  );
}
