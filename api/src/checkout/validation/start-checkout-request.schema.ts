import { z } from "zod";

const checkoutCustomerSchema = z.strictObject({
  name: z.string().trim().min(1).max(100),
  // normalized before the format check, so " Ada@Example.com " is accepted
  // and the same buyer whatever case they type
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
});

export const startCheckoutRequestSchema = z.strictObject({
  // any 8-4-4-4-12 hex id, matching what ParseCourseIdPipe accepts
  courseId: z.guid(),
  customer: checkoutCustomerSchema,
});
