import { Temporal } from "@js-temporal/polyfill";
import { z } from "zod";

import {
  COURSE_VALIDATION_ERRORS,
  courseScheduleFieldsSchema,
  courseDetailsShape,
  createStatusSchema,
  scheduledPriceFieldsSchema,
  updateStatusSchema,
} from "./course-field-schemas.js";

type ScheduleTimeField = "startTime" | "endTime";

type ValidationIssue = {
  path: (string | number)[];
  code: string;
  message: string;
  input: unknown;
};

type ValidationContext = Pick<
  z.core.$RefinementCtx,
  "addIssue"
>;

type CourseSchedule = z.output<
  typeof courseScheduleFieldsSchema
>;

type ScheduledPrice = z.output<
  typeof scheduledPriceFieldsSchema
>;

function addValidationIssue(
  ctx: ValidationContext,
  issue: ValidationIssue,
): void {
  ctx.addIssue({
    code: "custom",
    path: issue.path,
    message: issue.message,
    input: issue.input,
    params: { validationCode: issue.code },
  });
}

// These schemas already validate UTC timestamp format and calendar values.
const scheduleStartTimeInputSchema = z.object({
  startTime: courseScheduleFieldsSchema.shape.startTime,
});

const scheduleEndTimeInputSchema = z.object({
  endTime: courseScheduleFieldsSchema.shape.endTime,
});

const scheduleRangeInputSchema = z.object({
  startTime: courseScheduleFieldsSchema.shape.startTime,
  endTime: courseScheduleFieldsSchema.shape.endTime,
});

const priceEffectiveAtInputSchema = z.object({
  effectiveAt: scheduledPriceFieldsSchema.shape.effectiveAt,
});

const priceEffectiveTimesInputSchema = z.array(
  priceEffectiveAtInputSchema,
);

function validateScheduleRange(
  schedule: CourseSchedule,
  ctx: ValidationContext,
): void {
  const startTime = Temporal.Instant.from(schedule.startTime);
  const endTime = Temporal.Instant.from(schedule.endTime);

  if (Temporal.Instant.compare(endTime, startTime) > 0) {
    return;
  }

  addValidationIssue(ctx, {
    path: ["endTime"],
    code: COURSE_VALIDATION_ERRORS.schedule.endTime.invalidRange,
    message: "End time must be after start time.",
    input: schedule.endTime,
  });
}

function validateFutureScheduleTime(
  schedule: CourseSchedule,
  ctx: ValidationContext,
  field: ScheduleTimeField,
): void {
  const dateTime = Temporal.Instant.from(schedule[field]);
  const now = Temporal.Now.instant();

  if (Temporal.Instant.compare(dateTime, now) >= 0) {
    return;
  }

  addValidationIssue(ctx, {
    path: [field],
    code: COURSE_VALIDATION_ERRORS.schedule[field].inPast,
    message: `${
      field === "startTime" ? "Start" : "End"
    } time cannot be in the past.`,
    input: schedule[field],
  });
}

// Past-time checks for updates depend on the stored course, so they run in
// the service instead (see course-update-rules.ts).
export const updateCourseScheduleSchema =
  courseScheduleFieldsSchema.superRefine(validateScheduleRange, {
    when(payload) {
      return scheduleRangeInputSchema.safeParse(
        payload.value,
      ).success;
    },
  });

export const createCourseScheduleSchema =
  updateCourseScheduleSchema
    .superRefine(
      (schedule, ctx) => {
        validateFutureScheduleTime(
          schedule,
          ctx,
          "startTime",
        );
      },
      {
        when(payload) {
          return scheduleStartTimeInputSchema.safeParse(
            payload.value,
          ).success;
        },
      },
    )
    .superRefine(
      (schedule, ctx) => {
        validateFutureScheduleTime(
          schedule,
          ctx,
          "endTime",
        );
      },
      {
        when(payload) {
          return scheduleEndTimeInputSchema.safeParse(
            payload.value,
          ).success;
        },
      },
    );

function validateFuturePriceEffectiveTime(
  price: ScheduledPrice,
  ctx: ValidationContext,
): void {
  const effectiveAt = Temporal.Instant.from(price.effectiveAt);
  const now = Temporal.Now.instant();

  if (Temporal.Instant.compare(effectiveAt, now) >= 0) {
    return;
  }

  addValidationIssue(ctx, {
    path: ["effectiveAt"],
    code: COURSE_VALIDATION_ERRORS.prices.effectiveAt.inPast,
    message: "Price effective time cannot be in the past.",
    input: price.effectiveAt,
  });
}

export const createScheduledPriceSchema =
  scheduledPriceFieldsSchema.superRefine(
    validateFuturePriceEffectiveTime,
    {
      when(payload) {
        return priceEffectiveAtInputSchema.safeParse(
          payload.value,
        ).success;
      },
    },
  );

function validateUniquePriceEffectiveTimes(
  prices: ScheduledPrice[],
  ctx: ValidationContext,
): void {
  const seenInstants = new Set<string>();

  prices.forEach((price, index) => {
    // Normalize timestamps so equivalent instants compare equally.
    const instant = Temporal.Instant.from(
      price.effectiveAt,
    ).toString();

    if (!seenInstants.has(instant)) {
      seenInstants.add(instant);
      return;
    }

    addValidationIssue(ctx, {
      path: [index, "effectiveAt"],
      code:
        COURSE_VALIDATION_ERRORS.prices.effectiveAt.duplicateValue,
      message: "Price effective times must be unique.",
      input: price.effectiveAt,
    });
  });
}

export const createScheduledPricesSchema = z
  .array(createScheduledPriceSchema)
  .min(1)
  .superRefine(validateUniquePriceEffectiveTimes, {
    when(payload) {
      return priceEffectiveTimesInputSchema.safeParse(
        payload.value,
      ).success;
    },
  });

const createCourseRequestBaseSchema = z.strictObject({
  ...courseDetailsShape,
  status: createStatusSchema,
  schedule: createCourseScheduleSchema,
  prices: createScheduledPricesSchema,
});

export const createCourseRequestSchema =
  createCourseRequestBaseSchema;

// Prices may be empty and in the past here: whether that is allowed depends
// on the stored prices, which the service checks.
export const updateScheduledPricesSchema = z
  .array(scheduledPriceFieldsSchema)
  .superRefine(validateUniquePriceEffectiveTimes, {
    when(payload) {
      return priceEffectiveTimesInputSchema.safeParse(
        payload.value,
      ).success;
    },
  });

export const updateCourseRequestSchema = z.strictObject({
  ...courseDetailsShape,
  status: updateStatusSchema,
  schedule: updateCourseScheduleSchema,
  prices: updateScheduledPricesSchema,
});
