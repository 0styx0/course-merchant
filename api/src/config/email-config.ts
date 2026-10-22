import "dotenv/config.js";
import { z } from "zod";

const emailEnvSchema = z.object({
  // any SMTP provider's connection URL, e.g. smtps://user:pass@smtp.example.com
  SMTP_URL: z
    .string()
    .regex(/^smtps?:\/\//, "must be an smtp:// or smtps:// URL"),
  // the sender shown to buyers, e.g. `Course Shop <hello@example.com>`
  EMAIL_FROM: z.string().min(1),
  // the name in each email's header and footer
  EMAIL_SHOP_NAME: z.string().min(1),
});

export type EmailConfig = {
  smtpUrl: string;
  from: string;
  shopName: string;
};

export const EMAIL_CONFIG = Symbol("EMAIL_CONFIG");

/**
 * Reads the email settings from the environment. Throws on startup when one is
 * missing or malformed, naming the variable but never echoing its value (the
 * SMTP URL holds a password).
 */
export function loadEmailConfig(
  env: Record<string, string | undefined> = process.env,
): EmailConfig {
  const result = emailEnvSchema.safeParse(env);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join(".")} ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid email configuration: ${problems}.`);
  }

  return {
    smtpUrl: result.data.SMTP_URL,
    from: result.data.EMAIL_FROM,
    shopName: result.data.EMAIL_SHOP_NAME,
  };
}
