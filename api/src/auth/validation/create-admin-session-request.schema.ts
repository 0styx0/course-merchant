import { z } from "zod";

import { emailSchema } from "@/common/validation/email.schema.js";

export const createAdminSessionRequestSchema = z.strictObject({
  email: emailSchema,
  // only bounded: the 15 to 128 character rule is for new passwords, and at
  // login a wrong length is just a wrong password
  password: z.string().min(1).max(1024),
});
