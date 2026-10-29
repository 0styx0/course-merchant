// The browser's copy of the API's limits, so the form can warn early.
// course-form-limits.test.ts fails if one drifts from openapi-v1.yaml.

export const COURSE_NAME_MAX_LENGTH = 100;
export const COURSE_SUMMARY_MAX_LENGTH = 300;
export const COURSE_DESCRIPTION_MAX_TEXT_LENGTH = 5_000;
export const COURSE_CONTENT_URL_MAX_LENGTH = 2_048;

/** The payment processor's minimum charge; a free course (0) is also allowed. */
export const MIN_PAID_PRICE_CENTS = 50;

/** A price time that is set must be this far ahead, so it can't equal "when saved" (now + this). */
export const MIN_PRICE_LEAD_MS = 60_000;

/** The only currency the storefront sells in. */
export const COURSE_CURRENCY = "USD";
