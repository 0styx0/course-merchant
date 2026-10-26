import { z } from "zod";

import { emailSchema } from "@/common/validation/email.schema.js";

const checkoutCustomerSchema = z.strictObject({
  name: z.string().trim().min(1).max(100),
  email: emailSchema,
});

export const startCheckoutRequestSchema = z.strictObject({
  // any 8-4-4-4-12 hex id, matching what ParseCourseIdPipe accepts
  courseId: z.guid(),
  customer: checkoutCustomerSchema,
});
