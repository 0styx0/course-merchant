import type { JSONContent } from "@tiptap/core";
import { z } from "zod";

import {
  countDescriptionCharacters,
  hasVisibleText,
} from "@/features/course-description/description-document";

import {
  COURSE_CONTENT_URL_MAX_LENGTH,
  COURSE_DESCRIPTION_MAX_TEXT_LENGTH,
  COURSE_NAME_MAX_LENGTH,
  COURSE_SUMMARY_MAX_LENGTH,
  MIN_PAID_PRICE_CENTS,
} from "./course-form-limits";
import { crossFieldIssues } from "./course-form-cross-field-issues";

/**
 * The time zone the form starts with; the admin can change it. Call it in the
 * browser: on the server it would give the server's zone.
 */
export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

const requiredName = "Enter a course name.";
const requiredSummary = "Enter a summary.";
const requiredDescription = "Enter a description.";
const requiredStartDate = "Enter a start date.";
const requiredStartTime = "Enter a start time.";
const requiredEndDate = "Enter an end date.";
const requiredEndTime = "Enter an end time.";

const timeZoneMessage = "Choose a time zone.";

function tooLong(label: string, max: number): string {
  return `The ${label} must be ${max.toLocaleString("en-US")} characters or fewer.`;
}

// `Intl.supportedValuesOf` returns hundreds of names, and this check runs on
// every validation, so build the set once on first use and keep it.
let knownTimeZones: Set<string> | undefined;

function isKnownTimeZone(timeZone: string): boolean {
  knownTimeZones ??= new Set(Intl.supportedValuesOf("timeZone"));
  return knownTimeZones.has(timeZone);
}

function isWebUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

function contentUrlProblem(url: string): string | undefined {
  if (!url) return "Enter the link to the course material.";
  if (url.length > COURSE_CONTENT_URL_MAX_LENGTH) {
    return tooLong("link", COURSE_CONTENT_URL_MAX_LENGTH);
  }
  if (isWebUrl(url)) return undefined;
  return "Enter a link starting with https:// or http://.";
}

function descriptionProblem(description: JSONContent): string | undefined {
  if (!hasVisibleText(description)) return requiredDescription;
  if (
    countDescriptionCharacters(description) > COURSE_DESCRIPTION_MAX_TEXT_LENGTH
  ) {
    return tooLong("description", COURSE_DESCRIPTION_MAX_TEXT_LENGTH);
  }
  return undefined;
}

/** Reads a comma as the decimal mark, so `79,50` is `79.50`. */
export function normalizeDollars(dollars: string): string {
  return dollars.replace(",", ".");
}

export function amountProblem(typed: string): string | undefined {
  const dollars = normalizeDollars(typed);
  if (!/^\d+(\.\d+)?$/.test(dollars)) return "Enter a price, like 79.50.";
  if (dollars.split(".")[1]?.length > 2) {
    return "Use at most two decimal places.";
  }
  const cents = Math.round(Number(dollars) * 100);
  if (cents > 0 && cents < MIN_PAID_PRICE_CENTS) {
    return "The payment processor needs a price of at least $0.50. Enter 0 for a free course.";
  }
  return undefined;
}

/** Adds the first problem found as the field's single message. */
function checkedBy<T>(problem: (value: T) => string | undefined) {
  return (value: T, ctx: z.RefinementCtx) => {
    const message = problem(value);
    if (message) ctx.addIssue({ code: "custom", message });
  };
}

const descriptionSchema = z
  .custom<JSONContent>(
    (value) => typeof value === "object" && value !== null,
    requiredDescription,
  )
  .superRefine(checkedBy(descriptionProblem));

const priceSchema = z.object({
  amountDollars: z.string().superRefine(checkedBy(amountProblem)),
  /** Date and time of day as typed; both empty means "when saved". */
  effectiveDate: z.string(),
  effectiveTimeOfDay: z.string(),
});

export const courseFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, requiredName)
      .max(COURSE_NAME_MAX_LENGTH, tooLong("name", COURSE_NAME_MAX_LENGTH)),
    summary: z
      .string()
      .trim()
      .min(1, requiredSummary)
      .max(
        COURSE_SUMMARY_MAX_LENGTH,
        tooLong("summary", COURSE_SUMMARY_MAX_LENGTH),
      ),
    description: descriptionSchema,
    contentUrl: z.string().trim().superRefine(checkedBy(contentUrlProblem)),
    schedule: z.object({
      startDate: z.string().min(1, requiredStartDate),
      startTimeOfDay: z.string().min(1, requiredStartTime),
      endDate: z.string().min(1, requiredEndDate),
      endTimeOfDay: z.string().min(1, requiredEndTime),
      timeZone: z.string().refine(isKnownTimeZone, timeZoneMessage),
    }),
    prices: z.array(priceSchema).min(1, "Add at least one price."),
  })
  .check((ctx) => {
    for (const issue of crossFieldIssues(ctx.value, Date.now())) {
      ctx.issues.push({ code: "custom", input: ctx.value, ...issue });
    }
  });

export type CourseFormValues = z.input<typeof courseFormSchema>;

/** The values after the schema has checked and trimmed them. */
export type CheckedCourseFormValues = z.output<typeof courseFormSchema>;
