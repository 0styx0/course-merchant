import { z } from "zod";

// Payloads hold ids, not rendered content, so an email always shows the
// course's current details (such as an updated content link) when it's sent.
// refundIssued: the payment that triggered the email was refunded (a second
// payment for the same course, or a payment while access is suspended)
export const payloadSchemas = {
  access_granted: z.object({ courseId: z.string(), customerId: z.string() }),
  already_owned: z.object({
    courseId: z.string(),
    customerId: z.string(),
    refundIssued: z.boolean(),
  }),
  access_suspended: z.object({
    courseId: z.string(),
    customerId: z.string(),
    refundIssued: z.boolean(),
  }),
  dispute_alert: z.object({ paymentId: z.string() }),
};

export type EmailPayloads = {
  [Kind in keyof typeof payloadSchemas]: z.infer<(typeof payloadSchemas)[Kind]>;
};

export class EmailPayloadInvalidError extends Error {
  constructor(kind: string, fields: string[]) {
    super(
      `Can't compose the email: the ${kind} payload is invalid (${fields.join(", ")}).`,
    );
    this.name = "EmailPayloadInvalidError";
  }
}

/** Throws `EmailPayloadInvalidError` when `payload` doesn't match its kind. */
export function parsePayload<Kind extends keyof EmailPayloads>(
  kind: Kind,
  payload: unknown,
): EmailPayloads[Kind] {
  const result = payloadSchemas[kind].safeParse(payload);

  if (!result.success) {
    const fields = result.error.issues.map(
      (issue) => issue.path.join(".") || "(root)",
    );

    throw new EmailPayloadInvalidError(kind, fields);
  }

  return result.data as EmailPayloads[Kind];
}
