import { z } from "zod";

import { emailSchema } from "@/common/validation/email.schema.js";

const checkoutCustomerSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1, { error: "Enter your name." })
    .max(100, { error: "That name is too long. Use 100 characters or fewer." }),
  email: emailSchema,
});

export const startCheckoutRequestSchema = z.strictObject({
  // any 8-4-4-4-12 hex id, matching what ParseCourseIdPipe accepts
  courseId: z.guid(),
  customer: checkoutCustomerSchema,
});
