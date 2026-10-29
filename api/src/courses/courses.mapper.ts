import { Temporal } from "@js-temporal/polyfill";

import {
  CourseDescription,
  CreateCourseRequest,
  GetCourseAdminResponse,
  GetCourseResponse,
} from "types.js";
import type { CourseRepositoryModelPublic } from "./courses.repository/courses.repository.js";
import {
  CourseRepositoryCreateInput,
  CourseRepositoryModelAdmin,
} from "./courses.repository/admin-courses.repository.js";

/**
 * The image's version: its `updatedAt` as epoch milliseconds, in decimal. The
 * one place it is built, so responses and URLs agree on it.
 */
export function imageVersion(updatedAt: Temporal.Instant): string {
  return String(updatedAt.epochMilliseconds);
}

// the column is generic JSON, but only validated documents are ever written
export function storedDescription(
  json: CourseRepositoryModelPublic["description"],
): CourseDescription {
  return json as CourseDescription;
}

// the document is JSON as parsed from the request, which the generated type
// can't say, as it has an index signature
export function toStoredDescription(
  description: CourseDescription,
): CourseRepositoryModelPublic["description"] {
  return description as CourseRepositoryModelPublic["description"];
}

type StoredCourseFields = Pick<
  CourseRepositoryCreateInput,
  | "title"
  | "summary"
  | "description"
  | "contentUrl"
  | "startsAt"
  | "endsAt"
  | "timeZone"
>;

// the course fields that create and update both write
export function toStoredCourseFields(
  request: Pick<
    CreateCourseRequest,
    "name" | "summary" | "description" | "contentUrl" | "schedule"
  >,
): StoredCourseFields {
  return {
    title: request.name,
    summary: request.summary,
    description: toStoredDescription(request.description),
    contentUrl: request.contentUrl,
    startsAt: Temporal.Instant.from(request.schedule.startTime),
    endsAt: Temporal.Instant.from(request.schedule.endTime),
    timeZone: request.schedule.timeZone,
  };
}

export function toStoredPrices(
  prices: CreateCourseRequest["prices"],
): CourseRepositoryCreateInput["prices"] {
  return prices.map((price) => ({
    amount: price.amount,
    currency: price.currency,
    effectiveAt: Temporal.Instant.from(price.effectiveAt),
  }));
}

// publishing requires an image and images are never removed
function requireImage(course: CourseRepositoryModelPublic) {
  if (!course.image) {
    throw new Error(`Published course ${course.id} has no image.`);
  }

  return course.image;
}

export function toPublicCourseResponse(
  course: CourseRepositoryModelPublic,
): GetCourseResponse {
  const [price] = course.prices;

  return {
    id: course.id,
    name: course.title,
    summary: course.summary,
    description: storedDescription(course.description),
    enrollmentCount: course.enrollments,
    image: { version: imageVersion(requireImage(course).updatedAt) },
    price: {
      amount: price.amount,
      currency: price.currency,
    },
    schedule: {
      startTime: course.startsAt.toString(),
      endTime: course.endsAt.toString(),
      timeZone: course.timeZone,
    },
  };
}

type AdminPrice = CourseRepositoryModelAdmin["prices"][number];
type AdminEnrollment = CourseRepositoryModelAdmin["enrollments"][number];

function formatOptionalDate(time: Temporal.Instant | null) {
  return time === null ? null : time.toString();
}

function toAdminPriceResponse(price: AdminPrice) {
  return {
    id: price.id,
    amount: price.amount,
    currency: price.currency,
    effectiveAt: price.effectiveAt.toString(),
  };
}

function toAdminEnrollmentResponse(enrollment: AdminEnrollment) {
  return {
    revokedAt: formatOptionalDate(enrollment.revokedAt),
    suspendedAt: formatOptionalDate(enrollment.suspendedAt),
    // no email at all reads as failed, so the owner follows up
    emailStatus: enrollment.emails[0]?.email?.status ?? "failed",
    customer: {
      id: enrollment.customer.id,
      name: enrollment.customer.name,
      email: enrollment.customer.email,
    },
    payment: enrollment.payment && {
      status: enrollment.payment.status,
      amount: enrollment.payment.amount,
      paidAt: formatOptionalDate(enrollment.payment.paidAt),
    },
  };
}

export function toAdminCourseResponse(
  course: CourseRepositoryModelAdmin,
): GetCourseAdminResponse {
  return {
    id: course.id,
    name: course.title,
    summary: course.summary,
    description: storedDescription(course.description),
    contentUrl: course.contentUrl,
    schedule: {
      startTime: course.startsAt.toString(),
      endTime: course.endsAt.toString(),
      timeZone: course.timeZone,
    },
    status: {
      name: course.statuses[0].name,
      changedAt: course.statuses[0].changedAt.toString(),
    },
    image: course.image && {
      updatedAt: course.image.updatedAt.toString(),
      version: imageVersion(course.image.updatedAt),
    },
    prices: course.prices.map(toAdminPriceResponse),
    enrollments: course.enrollments.map(toAdminEnrollmentResponse),
  };
}
