"use server";

import { redirect } from "next/navigation";
import {
  fieldErrorsByFormPath,
  type FormFieldError,
} from "@/lib/api/form-errors";
import type { CheckoutCustomer, ProblemDetails } from "@/lib/types";
import { checkoutFormPath } from "../form/checkout-form-path";
import { readCheckoutCustomer } from "../form/read-checkout-customer";
import { startCheckout, type StartCheckoutResult } from "./start-checkout.api";
import { UNREACHABLE_PROBLEM } from "./unreachable-problem";

export type StartCheckoutFormState =
  | { state: "empty" }
  | { state: "success"; customer: { email: string } }
  | {
      state: "failure";
      problem: ProblemDetails;
      customer: CheckoutCustomer;
      fieldErrors: FormFieldError[];
    };

/** A network error, a timeout or an answer without a problem body becomes a failure, so the form keeps the typed values. */
async function startCheckoutCatchingThrows(
  courseId: string,
  customer: CheckoutCustomer,
): Promise<StartCheckoutResult> {
  try {
    return await startCheckout(courseId, customer);
  } catch (error) {
    console.error(error);
    return { state: "failure", error: UNREACHABLE_PROBLEM };
  }
}

/**
 * Starts a checkout for the bound course. The page binds `courseId`;
 * `useActionState` supplies the previous state, which the action ignores.
 * A redirect answer sends the browser to the payment page.
 */
export async function startCheckoutAction(
  courseId: string,
  _previousState: StartCheckoutFormState,
  formData: FormData,
): Promise<StartCheckoutFormState> {
  const customer = readCheckoutCustomer(formData);
  const result = await startCheckoutCatchingThrows(courseId, customer);

  if (result.state === "failure") {
    return {
      state: "failure",
      problem: result.error,
      customer,
      fieldErrors: fieldErrorsByFormPath(result.error, checkoutFormPath),
    };
  }
  if (result.data.status === "redirect") {
    redirect(result.data.url);
  }
  return { state: "success", customer: { email: customer.email } };
}
