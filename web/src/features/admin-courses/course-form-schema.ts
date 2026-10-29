import type { JSONContent } from "@tiptap/core";
import { z } from "zod";

import {
  countDescriptionCharacters,
  hasVisibleText,
} from "@/features/courses/description-document";

import {
  COURSE_CONTENT_URL_MAX_LENGTH,
  COURSE_DESCRIPTION_MAX_TEXT_LENGTH,
  COURSE_NAME_MAX_LENGTH,
  COURSE_SUMMARY_MAX_LENGTH,
  MIN_PAID_PRICE_CENTS,
  MIN_PRICE_LEAD_MS,
} from "./course-form-limits";
import { wallClockToUtc } from "./wall-clock-time";

/**
 * The time zone the form starts with; the admin can change it. Call it in the
 * browser: on the server it would give the server's zone.
 */
export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

type FormIssue = { path: (string | number)[]; message: string };

const issueAt = (path: (string | number)[], message: string): FormIssue => ({
  path,
  message,
});

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

let knownTimeZones: Set<string> | undefined;

function isKnownTimeZone(timeZone: string): boolean {
  knownTimeZones ??= new Set(Intl.supportedValuesOf("timeZone"));
  return knownTimeZones.has(timeZone);
}

function contentUrlProblem(url: string): string | undefined {
  if (!url) return "Enter the link to the course material.";
  if (url.length > COURSE_CONTENT_URL_MAX_LENGTH) {
    return tooLong("link", COURSE_CONTENT_URL_MAX_LENGTH);
  }
  try {
    const { protocol } = new URL(url);
    if (protocol === "https:" || protocol === "http:") return undefined;
  } catch {
    // falls through to the message below
  }
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

/**
 * Checks that compare fields. They run even while other fields are empty or
 * wrong (the zone is then unknown and the time is skipped, since that field
 * reports its own problem), so the admin sees every problem at once.
 */
function crossFieldIssues(
  values: CourseFormValues,
  nowMs: number,
): FormIssue[] {
  return [
    ...scheduleIssues(values.schedule, nowMs),
    ...priceTimeIssues(values.prices, values.schedule.timeZone, nowMs),
  ];
}

type Conversion =
  | { kind: "ms"; ms: number }
  | { kind: "issue"; message: string }
  | { kind: "skip" };

/** The date and time of day the admin typed, in the chosen zone. */
type DateAndTime = { date: string; timeOfDay: string };

/** Date and time of day to UTC milliseconds, or the message to show instead. */
function convert(
  { date, timeOfDay }: DateAndTime,
  timeZone: string,
): Conversion {
  if (!date || !timeOfDay) return { kind: "skip" };
  const result = wallClockToUtc(`${date}T${timeOfDay}`, timeZone);
  if (result.state === "success") {
    return { kind: "ms", ms: Date.parse(result.data) };
  }
  switch (result.error) {
    case "daylight-saving":
      return {
        kind: "issue",
        message: `That time doesn't exist, or happens twice, on that day in ${timeZone} because of a daylight-saving change. Choose another time.`,
      };
    case "invalid-time":
      return { kind: "issue", message: "Enter a valid date and time." };
    case "unknown-zone":
      return { kind: "skip" };
  }
}

// Problems with a combined date and time are shown on the time-of-day field.
function scheduleIssues(
  schedule: CourseFormValues["schedule"],
  nowMs: number,
): FormIssue[] {
  const start = convert(
    { date: schedule.startDate, timeOfDay: schedule.startTimeOfDay },
    schedule.timeZone,
  );
  const end = convert(
    { date: schedule.endDate, timeOfDay: schedule.endTimeOfDay },
    schedule.timeZone,
  );
  const at = (field: string, message: string) =>
    issueAt(["schedule", field], message);

  const issues: FormIssue[] = [];
  if (start.kind === "issue") {
    issues.push(at("startTimeOfDay", start.message));
  }
  if (end.kind === "issue") issues.push(at("endTimeOfDay", end.message));
  if (start.kind === "ms" && start.ms <= nowMs) {
    issues.push(at("startTimeOfDay", "The start time must be in the future."));
  }
  if (start.kind === "ms" && end.kind === "ms" && end.ms <= start.ms) {
    issues.push(
      at("endTimeOfDay", "The end time must be after the start time."),
    );
  }
  return issues;
}

function priceTimeIssues(
  prices: CourseFormValues["prices"],
  timeZone: string,
  nowMs: number,
): FormIssue[] {
  const issues: FormIssue[] = [];
  const takenMs = new Set<number>();

  prices.forEach((price, index) => {
    const at = (field: string, message: string) =>
      issueAt(["prices", index, field], message);
    const { effectiveDate: date, effectiveTimeOfDay: timeOfDay } = price;

    if (date && !timeOfDay) {
      return void issues.push(
        at("effectiveTimeOfDay", "Enter a time, or clear the date."),
      );
    }
    if (timeOfDay && !date) {
      return void issues.push(
        at("effectiveDate", "Enter a date, or clear the time."),
      );
    }

    // Both empty means "when saved", which the request builder sets to now + 1 minute.
    const isSet = Boolean(date);
    const time = isSet
      ? convert({ date, timeOfDay }, timeZone)
      : { kind: "ms" as const, ms: nowMs + MIN_PRICE_LEAD_MS };

    if (time.kind === "issue") {
      return void issues.push(at("effectiveTimeOfDay", time.message));
    }
    if (time.kind === "skip") return;

    if (isSet && time.ms < nowMs + MIN_PRICE_LEAD_MS) {
      issues.push(
        at(
          "effectiveTimeOfDay",
          "Choose a time at least a minute from now, or leave both empty to start when the course is saved.",
        ),
      );
    } else if (takenMs.has(time.ms)) {
      issues.push(
        at(
          "effectiveTimeOfDay",
          "Two prices can't take effect at the same time.",
        ),
      );
    }
    takenMs.add(time.ms);
  });

  return issues;
}
