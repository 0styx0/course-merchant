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

function imageRequiredToPublish({
  request,
  stored,
}: UpdateRuleContext): ValidationError[] {
  if (!isPublishing(request, stored) || stored.image !== null) {
    return [];
  }

  return [
    {
      field: toJsonPointer(["status"]),
      code: FieldErrorCode.INVALID_VALUE,
      detail: "Upload an image before publishing.",
    },
  ];
}

const MOMENT_LABELS = { startTime: "Start", endTime: "End" } as const;

/** A changed schedule moment may not be moved into the past. */
function changedMomentInPast(
  field: "startTime" | "endTime",
  requestValue: string,
  storedValue: Temporal.Instant,
  now: Temporal.Instant,
): ValidationError[] {
  if (
    isSameInstant(requestValue, storedValue) ||
    !isInPast(requestValue, now)
  ) {
    return [];
  }

  return [
    {
      field: toJsonPointer(["schedule", field]),
      code: FieldErrorCode.IN_PAST,
      detail: `${MOMENT_LABELS[field]} time cannot be in the past.`,
    },
  ];
}

function startNotInPast({
  request,
  stored,
  now,
}: UpdateRuleContext): ValidationError[] {
  return changedMomentInPast(
    "startTime",
    request.schedule.startTime,
    stored.startsAt,
    now,
  );
}

function endNotInPast({
  request,
  stored,
  now,
}: UpdateRuleContext): ValidationError[] {
  return changedMomentInPast(
    "endTime",
    request.schedule.endTime,
    stored.endsAt,
    now,
  );
}

function isNewPriceInPast(
  price: RequestPrice,
  stored: StoredCourse,
  now: Temporal.Instant,
): boolean {
  const isStored = stored.prices.some((storedPrice) =>
    isSamePrice(price, storedPrice),
  );

  return !isStored && isInPast(price.effectiveAt, now);
}

function pricesNotInPast({
  request,
  stored,
  now,
}: UpdateRuleContext): ValidationError[] {
  return request.prices.flatMap((price, index) => {
    if (!isNewPriceInPast(price, stored, now)) {
      return [];
    }

    return [
      {
        field: toJsonPointer(["prices", index, "effectiveAt"]),
        code: FieldErrorCode.IN_PAST,
        detail: "Price effective time cannot be in the past.",
      },
    ];
  });
}

function priceInEffectRequired({
  request,
  stored,
  now,
}: UpdateRuleContext): ValidationError[] {
  const hasPriceInEffect = stored.prices.some((price) =>
    isInEffect(price, now),
  );

  if (hasPriceInEffect || request.prices.length > 0) {
    return [];
  }

  return [
    {
      field: toJsonPointer(["prices"]),
      code: FieldErrorCode.TOO_SHORT,
      detail:
        "Prices must contain at least one entry when no price is in effect.",
    },
  ];
}

const UPDATE_RULES = [
  imageRequiredToPublish,
  startNotInPast,
  endNotInPast,
  pricesNotInPast,
  priceInEffectRequired,
];

/**
 * Rules that depend on the stored course. Runs after the request has passed
 * `updateCourseRequestSchema`, and reports every violation at once.
 */
export function findUpdateRuleViolations(
  context: UpdateRuleContext,
): ValidationError[] {
  return UPDATE_RULES.flatMap((rule) => rule(context));
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
