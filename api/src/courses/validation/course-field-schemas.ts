import { z } from "zod";

import { FieldErrorCode } from "@/common/errors/error-codes.js";

const requiredString = z.string();

const nonEmptyTrimmedString = z.string().trim().min(1);

export const courseNameSchema =
    nonEmptyTrimmedString.max(100);

export const courseDescriptionSchema =
    nonEmptyTrimmedString.max(5000);

export const createStatusSchema = z.enum([
    "published",
    "archived",
    "drafted",
]);

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

// Uses currency identifiers supported by the Node.js runtime.
const supportedCurrencies = new Set([
    "USD",
    ...(typeof Intl.supportedValuesOf === "function"
        ? Intl.supportedValuesOf("currency")
        : []),
]);

export const courseCurrencySchema = requiredString
    .regex(/^[A-Z]{3}$/)
    .refine(
        (currency) => supportedCurrencies.has(currency),
        {
            error: "Must be an existing ISO 4217 currency code.",
        },
    );

export const coursePriceAmountSchema = z
    .number()
    .int()
    .max(Number.MAX_SAFE_INTEGER)
    .refine(
        (amount) => amount === 0 || amount >= 50,
        {
            error: "Price must either be free or cost at least 0.50.",
            params: { validationCode: FieldErrorCode.BELOW_MINIMUM },
        },
    );

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
    description: courseDescriptionSchema,
};