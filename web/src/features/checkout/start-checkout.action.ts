"use server";

import { redirect } from "next/navigation";
import {
  fieldErrorsByFormPath,
  type FormFieldError,
} from "@/lib/api/form-errors";
import type { CheckoutCustomer, ProblemDetails } from "@/lib/types";
import { checkoutFormPath } from "./form/checkout-form-path";
import { startCheckout } from "./start-checkout.api";

export type StartCheckoutFormState =
  | { state: "empty" }
  | { state: "success"; customer: { email: string } }
  | {
      state: "failure";
      problem: ProblemDetails;
      customer: CheckoutCustomer;
      fieldErrors: FormFieldError[];
    };

/** A missing field or an uploaded file reads as "", so the API's 400 answers. */
function readText(formData: FormData, fieldName: string): string {
  const field = formData.get(fieldName);
  return typeof field === "string" ? field : "";
}

function readCustomer(formData: FormData): CheckoutCustomer {
  return {
    name: readText(formData, "customer.name"),
    email: readText(formData, "customer.email"),
  };
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
  const customer = readCustomer(formData);
  const result = await startCheckout(courseId, customer);

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
