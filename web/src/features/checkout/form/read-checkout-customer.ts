import type { CheckoutCustomer } from "@/lib/types";

/** A missing field or an uploaded file reads as "", so the checks answer for it. */
function readText(formData: FormData, fieldName: string): string {
  const field = formData.get(fieldName);
  return typeof field === "string" ? field : "";
}

export function readCheckoutCustomer(formData: FormData): CheckoutCustomer {
  return {
    name: readText(formData, "customer.name"),
    email: readText(formData, "customer.email"),
  };
}
