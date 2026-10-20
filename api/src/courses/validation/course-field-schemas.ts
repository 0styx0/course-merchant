import { z } from "zod";

export const COURSE_VALIDATION_ERRORS = {
    required: "REQUEST_BODY_REQUIRED",
    invalidType: "REQUEST_BODY_INVALID_TYPE",
    validationFailed: "REQUEST_VALIDATION_FAILED",
    name: {
        required: "NAME_REQUIRED",
        invalidType: "NAME_INVALID_TYPE",
        tooShort: "NAME_TOO_SHORT",
        tooLong: "NAME_TOO_LONG",
    },
    description: {
        required: "DESCRIPTION_REQUIRED",
        invalidType: "DESCRIPTION_INVALID_TYPE",
        tooShort: "DESCRIPTION_TOO_SHORT",
        tooLong: "DESCRIPTION_TOO_LONG",
    },
    status: {
        required: "STATUS_REQUIRED",
        invalidType: "STATUS_INVALID_TYPE",
        invalidValue: "STATUS_INVALID_VALUE",
    },
    schedule: {
        required: "SCHEDULE_REQUIRED",
        invalidType: "SCHEDULE_INVALID_TYPE",
        startTime: {
            required: "SCHEDULE_START_TIME_REQUIRED",
            invalidType: "SCHEDULE_START_TIME_INVALID_TYPE",
            invalidFormat: "SCHEDULE_START_TIME_INVALID_FORMAT",
            invalidValue: "SCHEDULE_START_TIME_INVALID_VALUE",
            inPast: "SCHEDULE_START_TIME_IN_PAST",
        },
        endTime: {
            required: "SCHEDULE_END_TIME_REQUIRED",
            invalidType: "SCHEDULE_END_TIME_INVALID_TYPE",
            invalidFormat: "SCHEDULE_END_TIME_INVALID_FORMAT",
            invalidValue: "SCHEDULE_END_TIME_INVALID_VALUE",
            inPast: "SCHEDULE_END_TIME_IN_PAST",
            invalidRange: "SCHEDULE_END_TIME_INVALID_RANGE",
        },
        timeZone: {
            required: "SCHEDULE_TIME_ZONE_REQUIRED",
            invalidType: "SCHEDULE_TIME_ZONE_INVALID_TYPE",
            invalidValue: "SCHEDULE_TIME_ZONE_INVALID_VALUE",
        },
    },
    prices: {
        required: "PRICES_REQUIRED",
        invalidType: "PRICES_INVALID_TYPE",
        tooShort: "PRICES_TOO_SHORT",
        entryRequired: "PRICES_ENTRY_REQUIRED",
        entryInvalidType: "PRICES_ENTRY_INVALID_TYPE",
        amount: {
            required: "PRICES_AMOUNT_REQUIRED",
            invalidType: "PRICES_AMOUNT_INVALID_TYPE",
            notInteger: "PRICES_AMOUNT_NOT_INTEGER",
            belowMinimum: "PRICES_AMOUNT_BELOW_MINIMUM",
            aboveMaximum: "PRICES_AMOUNT_ABOVE_MAXIMUM",
        },
        currency: {
            required: "PRICES_CURRENCY_REQUIRED",
            invalidType: "PRICES_CURRENCY_INVALID_TYPE",
            invalidFormat: "PRICES_CURRENCY_INVALID_FORMAT",
            invalidValue: "PRICES_CURRENCY_INVALID_VALUE",
        },
        effectiveAt: {
            required: "PRICES_EFFECTIVE_AT_REQUIRED",
            invalidType: "PRICES_EFFECTIVE_AT_INVALID_TYPE",
            invalidFormat: "PRICES_EFFECTIVE_AT_INVALID_FORMAT",
            inPast: "PRICES_EFFECTIVE_AT_IN_PAST",
            duplicateValue: "PRICES_EFFECTIVE_AT_DUPLICATE_VALUE",
        },
    },
} as const;

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