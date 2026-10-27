import { Temporal } from "@js-temporal/polyfill";

import { FieldErrorCode } from "@/common/errors/error-codes.js";
import type { ValidationError } from "@/common/errors/validation.exception.js";
import { toJsonPointer } from "@/common/validation/zod-validation.pipe.js";
import type { CourseRepositoryModelAdmin } from "../courses.repository/admin-courses.repository.js";
import type { UpdateCourseRequest } from "types.js";

type StoredCourse = Pick<
  CourseRepositoryModelAdmin,
  "startsAt" | "endsAt" | "prices" | "statuses" | "image"
>;

type StoredPrice = StoredCourse["prices"][number];

type RequestPrice = UpdateCourseRequest["prices"][number];

type UpdateRuleContext = {
  request: UpdateCourseRequest;
  stored: StoredCourse;
  now: Temporal.Instant;
};

export type PriceChanges = {
  newPrices: RequestPrice[];
  deletePriceIds: string[];
};

/**
 * Postgres stores microseconds, so a request value is compared at that
 * precision to avoid treating a stored value as changed.
 */
export function toDatabasePrecision(
  instant: Temporal.Instant,
): Temporal.Instant {
  return instant.round({ smallestUnit: "microseconds" });
}

export function isSameInstant(
  requestValue: string,
  storedValue: Temporal.Instant,
): boolean {
  const instant = toDatabasePrecision(Temporal.Instant.from(requestValue));

  return Temporal.Instant.compare(instant, storedValue) === 0;
}

export function isSamePrice(
  requestPrice: RequestPrice,
  storedPrice: StoredPrice,
): boolean {
  return (
    requestPrice.amount === storedPrice.amount &&
    requestPrice.currency === storedPrice.currency &&
    isSameInstant(requestPrice.effectiveAt, storedPrice.effectiveAt)
  );
}

function isInPast(value: string, now: Temporal.Instant): boolean {
  return Temporal.Instant.compare(Temporal.Instant.from(value), now) < 0;
}

function isInEffect(price: StoredPrice, now: Temporal.Instant): boolean {
  return Temporal.Instant.compare(price.effectiveAt, now) <= 0;
}

function isPublishing(
  request: UpdateCourseRequest,
  stored: StoredCourse,
): boolean {
  return (
    request.status === "published" && stored.statuses[0].name !== "published"
  );
}

/**
 * Rules that depend on the stored course. Runs after the request has passed
 * `updateCourseRequestSchema`, and reports every violation at once.
 */
export function findUpdateRuleViolations({
  request,
  stored,
  now,
}: UpdateRuleContext): ValidationError[] {
  const errors: ValidationError[] = [];
  const { startTime, endTime } = request.schedule;

  if (isPublishing(request, stored) && stored.image === null) {
    errors.push({
      field: toJsonPointer(["status"]),
      code: FieldErrorCode.INVALID_VALUE,
      detail: "Upload an image before publishing.",
    });
  }

  if (!isSameInstant(startTime, stored.startsAt) && isInPast(startTime, now)) {
    errors.push({
      field: toJsonPointer(["schedule", "startTime"]),
      code: FieldErrorCode.IN_PAST,
      detail: "Start time cannot be in the past.",
    });
  }

  if (!isSameInstant(endTime, stored.endsAt) && isInPast(endTime, now)) {
    errors.push({
      field: toJsonPointer(["schedule", "endTime"]),
      code: FieldErrorCode.IN_PAST,
      detail: "End time cannot be in the past.",
    });
  }

  request.prices.forEach((price, index) => {
    const isStored = stored.prices.some((storedPrice) =>
      isSamePrice(price, storedPrice),
    );

    if (isStored || !isInPast(price.effectiveAt, now)) {
      return;
    }

    errors.push({
      field: toJsonPointer(["prices", index, "effectiveAt"]),
      code: FieldErrorCode.IN_PAST,
      detail: "Price effective time cannot be in the past.",
    });
  });

  const hasPriceInEffect = stored.prices.some((price) =>
    isInEffect(price, now),
  );

  if (!hasPriceInEffect && request.prices.length === 0) {
    errors.push({
      field: toJsonPointer(["prices"]),
      code: FieldErrorCode.TOO_SHORT,
      detail:
        "Prices must contain at least one entry when no price is in effect.",
    });
  }

  return errors;
}

/**
 * Splits the request's future schedule into prices to insert and stored
 * prices to delete. Exact matches are kept, and prices in effect are never
 * deleted.
 */
export function findPriceChanges({
  request,
  stored,
  now,
}: UpdateRuleContext): PriceChanges {
  const newPrices = request.prices.filter(
    (price) =>
      !stored.prices.some((storedPrice) => isSamePrice(price, storedPrice)),
  );

  const deletePriceIds = stored.prices
    .filter(
      (storedPrice) =>
        !isInEffect(storedPrice, now) &&
        !request.prices.some((price) => isSamePrice(price, storedPrice)),
    )
    .map((storedPrice) => storedPrice.id);

  return { newPrices, deletePriceIds };
}
