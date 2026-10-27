import { Temporal } from "@js-temporal/polyfill";

import { formatDate } from "@/utils/formatters.js";
import { GetCourseAdminResponse, GetCourseResponse } from "types.js";
import type { CourseRepositoryModelPublic } from "./courses.repository/courses.repository.js";
import { CourseRepositoryModelAdmin } from "./courses.repository/admin-courses.repository.js";

/**
 * The image's version: its `updatedAt` as epoch milliseconds, in decimal. The
 * one place it is built, so responses and URLs agree on it.
 */
export function imageVersion(updatedAt: Temporal.Instant): string {
  return String(updatedAt.epochMilliseconds);
}

export function toPublicCourseResponse(
  course: CourseRepositoryModelPublic,
): GetCourseResponse {
  const [price] = course.prices;

  return {
    id: course.id,
    name: course.title,
    summary: course.summary,
    description: course.description,
    enrollmentCount: course.enrollments,
    price: {
      amount: price.amount,
      currency: price.currency,
    },
    schedule: {
      startTime: formatDate(course.startsAt),
      endTime: formatDate(course.endsAt),
      timeZone: course.timeZone,
    },
  };
}

export function toAdminCourseResponse(
  course: CourseRepositoryModelAdmin,
): GetCourseAdminResponse {
  const formatOptionalDate = (time: Temporal.Instant | null) =>
    time === null ? null : formatDate(time);

  return {
    id: course.id,
    name: course.title,
    summary: course.summary,
    description: course.description,
    contentUrl: course.contentUrl,
    schedule: {
      startTime: formatDate(course.startsAt),
      endTime: formatDate(course.endsAt),
      timeZone: course.timeZone,
    },
    status: {
      name: course.statuses[0].name,
      changedAt: formatDate(course.statuses[0].changedAt),
    },
    image: course.image && {
      updatedAt: formatDate(course.image.updatedAt),
      version: imageVersion(course.image.updatedAt),
    },
    prices: course.prices.map((price) => ({
      id: price.id,
      amount: price.amount,
      currency: price.currency,
      effectiveAt: formatDate(price.effectiveAt),
    })),
    enrollments: course.enrollments.map((enrollment) => ({
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
    })),
  };
}
