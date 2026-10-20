import { Temporal } from "@js-temporal/polyfill";
import { z } from "zod";

import {
  COURSE_VALIDATION_ERRORS,
  courseScheduleFieldsSchema,
  courseDetailsShape,
  createStatusSchema,
  scheduledPriceFieldsSchema,
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
  typeof createCourseScheduleFieldsSchema
>;

type ScheduledPrice = z.output<
  typeof createScheduledPriceFieldsSchema
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

function isValidTemporalInstant(value: string): boolean {
  try {
    Temporal.Instant.from(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Retains the original field validation and additionally rejects
 * date-time strings that Temporal cannot interpret as an instant.
 *
 * The when guard prevents duplicate errors when the original field
 * schema has already rejected the input.
 */
function withValidTemporalInstant<T extends z.ZodType<string>>(
  schema: T,
): T {
  return schema.refine(isValidTemporalInstant, {
    error: "Date-time must represent a valid instant.",
    when(payload) {
      return schema.safeParse(payload.value).success;
    },
  });
}

function isValidOffsetForTimeZone(
  dateTime: string,
  timeZone: string,
): boolean {
  try {
    Temporal.ZonedDateTime.from(
      `${dateTime}[${timeZone}]`,
      { offset: "reject" },
    );

    return true;
  } catch {
    return false;
  }
}

// Add strict Temporal validation while preserving the original fields.
const createCourseScheduleFieldsSchema =
  courseScheduleFieldsSchema.extend({
    startTime: withValidTemporalInstant(
      courseScheduleFieldsSchema.shape.startTime,
    ),
    endTime: withValidTemporalInstant(
      courseScheduleFieldsSchema.shape.endTime,
    ),
  });

const createScheduledPriceFieldsSchema =
  scheduledPriceFieldsSchema.extend({
    effectiveAt: withValidTemporalInstant(
      scheduledPriceFieldsSchema.shape.effectiveAt,
    ),
  });

// These schemas validate only the fields each refinement depends on.
// Unrelated field errors will not prevent the refinement from running.
const scheduleStartTimeInputSchema = z.object({
  startTime: createCourseScheduleFieldsSchema.shape.startTime,
});

const scheduleEndTimeInputSchema = z.object({
  endTime: createCourseScheduleFieldsSchema.shape.endTime,
});

const scheduleRangeInputSchema = z.object({
  startTime: createCourseScheduleFieldsSchema.shape.startTime,
  endTime: createCourseScheduleFieldsSchema.shape.endTime,
});

const scheduleStartOffsetInputSchema = z.object({
  startTime: createCourseScheduleFieldsSchema.shape.startTime,
  timeZone: createCourseScheduleFieldsSchema.shape.timeZone,
});

const scheduleEndOffsetInputSchema = z.object({
  endTime: createCourseScheduleFieldsSchema.shape.endTime,
  timeZone: createCourseScheduleFieldsSchema.shape.timeZone,
});

const priceEffectiveAtInputSchema = z.object({
  effectiveAt: createScheduledPriceFieldsSchema.shape.effectiveAt,
});

const priceEffectiveTimesInputSchema = z.array(
  priceEffectiveAtInputSchema,
);

function validateScheduleOffset(
  schedule: CourseSchedule,
  ctx: ValidationContext,
  field: ScheduleTimeField,
): void {
  const dateTime = schedule[field];

  if (isValidOffsetForTimeZone(dateTime, schedule.timeZone)) {
    return;
  }

  const timeLabel = field === "startTime" ? "start" : "end";

  addValidationIssue(ctx, {
    path: [field],
    code: COURSE_VALIDATION_ERRORS.schedule[field].invalidValue,
    message:
      `The ${timeLabel} time offset must match the specified time zone.`,
    input: dateTime,
  });
}

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
    message:
      `${field === "startTime" ? "Start" : "End"} time cannot be in the past.`,
    input: schedule[field],
  });
}

const createCourseScheduleSchema =
  createCourseScheduleFieldsSchema
    .superRefine(
      (schedule, ctx) => {
        validateScheduleOffset(schedule, ctx, "startTime");
      },
      {
        when(payload) {
          return scheduleStartOffsetInputSchema.safeParse(
            payload.value,
          ).success;
        },
      },
    )
    .superRefine(
      (schedule, ctx) => {
        validateScheduleOffset(schedule, ctx, "endTime");
      },
      {
        when(payload) {
          return scheduleEndOffsetInputSchema.safeParse(
            payload.value,
          ).success;
        },
      },
    )
    .superRefine(validateScheduleRange, {
      when(payload) {
        return scheduleRangeInputSchema.safeParse(
          payload.value,
        ).success;
      },
    })
    .superRefine(
      (schedule, ctx) => {
        validateFutureScheduleTime(schedule, ctx, "startTime");
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
        validateFutureScheduleTime(schedule, ctx, "endTime");
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

const createScheduledPriceSchema =
  createScheduledPriceFieldsSchema.superRefine(
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
    // Normalize offsets so equivalent instants compare as equal.
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

const createScheduledPricesSchema = z
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