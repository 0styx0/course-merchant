import { z } from "zod";
import type { FormFieldError } from "@/lib/api/form-errors";
import type { CheckoutCustomer } from "@/lib/types";
import {
  CHECKOUT_EMAIL_INCOMPLETE_MESSAGE,
  CHECKOUT_EMAIL_TOO_LONG_MESSAGE,
  CHECKOUT_NAME_MISSING_MESSAGE,
  CHECKOUT_NAME_TOO_LONG_MESSAGE,
} from "./checkout-messages";

// The limits and their order (length before format) match the API's schemas.
const checkoutCustomerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, CHECKOUT_NAME_MISSING_MESSAGE)
    .max(100, CHECKOUT_NAME_TOO_LONG_MESSAGE),
  email: z
    .string()
    .trim()
    .max(254, CHECKOUT_EMAIL_TOO_LONG_MESSAGE)
    .pipe(z.email(CHECKOUT_EMAIL_INCOMPLETE_MESSAGE)),
});

/** The messages the enroll form shows before sending, name first; empty when both boxes are fine. */
export function findCheckoutCustomerErrors(
  customer: CheckoutCustomer,
): FormFieldError[] {
  const parsed = checkoutCustomerSchema.safeParse(customer);
  if (parsed.success) return [];
  return parsed.error.issues.map((issue) => ({
    path: `customer.${String(issue.path[0])}`,
    message: issue.message,
  }));
}
