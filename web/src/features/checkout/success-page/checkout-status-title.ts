import type { CheckoutStatus } from "@/lib/types";

const CHECKOUT_STATUS_TITLES = {
  expired: "Checkout timed out",
  refunded: "Payment refunded",
  pending: "Thank you",
  succeeded: "Thank you",
} as const satisfies Record<CheckoutStatus["status"], string>;

/** The words that name the return page, both in its tab and (with a full stop) its heading. */
export function getCheckoutStatusTitle(status: CheckoutStatus["status"]) {
  return CHECKOUT_STATUS_TITLES[status];
}
