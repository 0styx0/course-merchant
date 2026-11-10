import "server-only";

import { cache } from "react";
import { api } from "@/lib/api/client";
import { toResult } from "@/lib/api/to-result";
import type { CheckoutStatus, ProblemDetails, Result } from "@/lib/types";

export type GetCheckoutStatusResult = Result<CheckoutStatus, ProblemDetails>;

/**
 * Cached per render, so a page and its `generateMetadata` share one API call.
 */
export const getCheckoutStatus = cache(
  async (checkoutId: string): Promise<GetCheckoutStatusResult> =>
    toResult(
      await api.GET("/checkout-sessions/{checkoutId}", {
        params: { path: { checkoutId } },
      }),
    ),
);
