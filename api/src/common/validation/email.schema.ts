import { z } from "zod";

/**
 * An email address, normalized before the format check so " Ada@Example.com "
 * is accepted and the same person is one customer (or admin) whatever case
 * they type. Shared by checkout and admin login so both clean it the same way.
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, {
    error: "That email address is too long. Use 254 characters or fewer.",
  })
  .pipe(
    z.email({
      error:
        "That email address looks incomplete. It should look like name@example.com.",
    }),
  );
