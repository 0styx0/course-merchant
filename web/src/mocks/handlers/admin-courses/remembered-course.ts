import type {
  AdminCourse,
  CreateCourseRequest,
  UpdateCourseRequest,
} from "@/lib/types";

import { draftedAdminCourse } from "../../fixtures/admin-courses";

type SavedCourseRequest = CreateCourseRequest | UpdateCourseRequest;

function givePricesNewIds(prices: SavedCourseRequest["prices"]) {
  return prices.map((price) => ({ ...price, id: crypto.randomUUID() }));
}

function buildImageVersion(savedAt: Date) {
  return {
    updatedAt: savedAt.toISOString(),
    version: String(savedAt.getTime()),
  };
}

function buildStoredCourse(
  previous: AdminCourse,
  request: SavedCourseRequest,
): AdminCourse {
  return {
    id: previous.id,
    name: request.name,
    summary: request.summary,
    description: request.description,
    schedule: request.schedule,
    contentUrl: request.contentUrl,
    status: { name: request.status, changedAt: new Date().toISOString() },
    image: previous.image,
    enrollments: [],
    prices: givePricesNewIds(request.prices),
  };
}

type Enrollment = AdminCourse["enrollments"][number];

function refundPayment(payment: Enrollment["payment"]) {
  if (payment?.status !== "succeeded") return payment;
  return { ...payment, status: "refunded" as const };
}

function buildRevokedEnrollment(enrollment: Enrollment, revokedAt: Date) {
  return {
    ...enrollment,
    revokedAt: enrollment.revokedAt ?? revokedAt.toISOString(),
    payment: refundPayment(enrollment.payment),
  };
}

function hasCustomer(enrollment: Enrollment, customerId: string) {
  return enrollment.customer.id === customerId;
}

/**
 * Makes a store holding one course that the create, update, upload, get and
 * un-enroll handlers share, so a saved course comes back as saved. It starts
 * with the given course, or the drafted sample course.
 */
export function makeRememberedCourse(
  startCourse: AdminCourse = draftedAdminCourse,
) {
  let storedCourse: AdminCourse = startCourse;

  return {
    current: () => storedCourse,
    saveSentCourse: (request: SavedCourseRequest) => {
      storedCourse = buildStoredCourse(storedCourse, request);
    },
    saveUploadedImage: () => {
      storedCourse = { ...storedCourse, image: buildImageVersion(new Date()) };
    },
    /**
     * Un-enrolls the student: sets revokedAt once and marks a succeeded payment
     * refunded. refundStatus stays, because the owner still refunds in Stripe.
     * Returns false when the course has no student with that customer id.
     */
    revokeEnrollment: (customerId: string) => {
      const isKnown = storedCourse.enrollments.some((enrollment) =>
        hasCustomer(enrollment, customerId),
      );
      if (!isKnown) return false;
      const revokedAt = new Date();
      storedCourse = {
        ...storedCourse,
        enrollments: storedCourse.enrollments.map((enrollment) =>
          hasCustomer(enrollment, customerId)
            ? buildRevokedEnrollment(enrollment, revokedAt)
            : enrollment,
        ),
      };
      return true;
    },
  };
}

export type RememberedCourse = ReturnType<typeof makeRememberedCourse>;
