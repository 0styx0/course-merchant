import { z } from "zod";

import { FieldErrorCode } from "@/common/errors/error-codes.js";
import { ALLOWED_CURRENCIES } from "@/courses/allowed-currencies.js";

const requiredString = z.string();

const nonEmptyTrimmedString = z.string().trim().min(1);

export const courseNameSchema = nonEmptyTrimmedString.max(100);

// private: emailed to buyers, only ever returned to admins
export const courseContentUrlSchema = z.url({ protocol: /^https?$/ }).max(2048);

export const courseSummarySchema = nonEmptyTrimmedString.max(300);

export const courseDescriptionSchema = nonEmptyTrimmedString.max(5000);

// never published: a course needs its image first, which comes after creation
export const createStatusSchema = z.enum(["archived", "drafted"]);

export const updateStatusSchema = z.enum([
  "published",
  "archived",
  "drafted",
  "deleted",
]);

export const courseDateTimeSchema = z.iso.datetime();

export const courseStartTimeSchema = courseDateTimeSchema;
export const courseEndTimeSchema = courseDateTimeSchema;
export const coursePriceEffectiveAtSchema = courseDateTimeSchema;

export const courseTimeZoneSchema = requiredString.refine(
  (value) => {
    // time zones might be numbers, like -7. I don't like those.
    //  allow only location names for clarity
    if (/^[+-]\d{2}(?::?\d{2})?$/.test(value)) {
      return false;
    }

    try {
      new Intl.DateTimeFormat("en-US", {
        timeZone: value,
      });
      return true;
    } catch {
      return false;
    }
  },
  {
    error: "Must be a valid IANA time zone identifier.",
  },
);

export const courseCurrencySchema = requiredString
  .regex(/^[A-Z]{3}$/)
  .refine((currency) => ALLOWED_CURRENCIES.has(currency), {
    error: `Must be one of the accepted currencies: ${[...ALLOWED_CURRENCIES].join(", ")}.`,
  });

export const coursePriceAmountSchema = z
  .number()
  .int()
  .max(Number.MAX_SAFE_INTEGER)
  .refine((amount) => amount === 0 || amount >= 50, {
    error: "Price must either be free or cost at least 0.50.",
    params: { validationCode: FieldErrorCode.BELOW_MINIMUM },
  });

export const scheduledPriceFieldsSchema = z.strictObject({
  amount: coursePriceAmountSchema,
  currency: courseCurrencySchema,
  effectiveAt: coursePriceEffectiveAtSchema,
});

export const courseScheduleFieldsSchema = z.strictObject({
  startTime: courseStartTimeSchema,
  endTime: courseEndTimeSchema,
  timeZone: courseTimeZoneSchema,
});

export const courseDetailsShape = {
  name: courseNameSchema,
  summary: courseSummarySchema,
  description: courseDescriptionSchema,
};
