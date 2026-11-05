const CHECKOUT_FORM_PATHS: Record<string, string> = {
  "/customer/name": "customer.name",
  "/customer/email": "customer.email",
};

/**
 * Where the enroll form shows an error for a part of the request body, or
 * nothing when the form has no field for it. Such errors show only in the
 * summary, which comes from the problem's `detail`.
 */
export function checkoutFormPath(pointer: string): string | undefined {
  return CHECKOUT_FORM_PATHS[pointer];
}
