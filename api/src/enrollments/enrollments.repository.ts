import { Injectable } from "@nestjs/common";
import type { Temporal } from "@js-temporal/polyfill";
import { and } from "@prisma/orm-postgres/orm-client";

import type { DbScope } from "types.js";

export type EnrollmentRecord = {
  id: string;
  revokedAt: Temporal.Instant | null;
  suspendedAt: Temporal.Instant | null;
};

/**
 * The rules for who can access a course, shared by checkout (free courses)
 * and Stripe's webhook (paid ones), so the two can't drift apart.
 */
@Injectable()
export class EnrollmentsRepository {
  async findEnrollment(
    scope: DbScope,
    courseId: string,
    customerId: string,
  ): Promise<EnrollmentRecord | null> {
    return scope.orm.public.Enrollment.select("id", "revokedAt", "suspendedAt")
      .where((enrollment) =>
        and(
          enrollment.courseId.eq(courseId),
          enrollment.customerId.eq(customerId),
        ),
      )
      .first();
  }

  /**
   * Enrolls the customer, or reactivates an enrollment a refund revoked.
   * `paymentId` records the payment that bought access, or null for a free
   * course. Returns the enrollment's id when this call granted access, or
   * null when they already had access or are suspended.
   */
  async grantAccess(
    scope: DbScope,
    access: {
      courseId: string;
      customerId: string;
      paymentId: string | null;
      now: Temporal.Instant;
    },
  ): Promise<string | null> {
    const { courseId, customerId, paymentId, now } = access;
    const newEnrollmentId = crypto.randomUUID();

    // skips the insert, instead of failing, when this customer already has
    // an enrollment in this course: the fields name the composite
    // @@unique([courseId, customerId]) constraint
    const insertedEnrollments =
      await scope.orm.public.Enrollment.createAndCount(
        [
          {
            id: newEnrollmentId,
            courseId,
            customerId,
            paymentId,
            purchasedAt: now,
          },
        ],
        { onConflict: "skip", conflictOn: ["courseId", "customerId"] },
      );

    const isNewEnrollment = insertedEnrollments === 1;

    if (isNewEnrollment) {
      return newEnrollmentId;
    }

    // only a revoked, unsuspended enrollment can be reactivated. Matching on
    // revokedAt means a concurrent request that already reactivated it finds
    // nothing to update
    const reactivatedEnrollment = await scope.orm.public.Enrollment.where(
      (enrollment) =>
        and(
          enrollment.courseId.eq(courseId),
          enrollment.customerId.eq(customerId),
          enrollment.revokedAt.isNotNull(),
          enrollment.suspendedAt.isNull(),
        ),
    ).update({ revokedAt: null, paymentId, purchasedAt: now });

    return reactivatedEnrollment?.id ?? null;
  }
}
