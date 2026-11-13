import { Injectable } from "@nestjs/common";
import type { Temporal } from "@js-temporal/polyfill";
import { and } from "@prisma/orm-postgres/orm-client";

import type { DbScope } from "types.js";

export type EnrollmentRecord = {
  id: string;
  paymentId: string | null;
  revokedAt: Temporal.Instant | null;
  suspendedAt: Temporal.Instant | null;
};

export type EnrollmentRevocation = {
  courseId: string;
  customerId: string;
  paymentId: string | null;
  now: Temporal.Instant;
};

type EnrollmentAccess = {
  courseId: string;
  customerId: string;
  paymentId: string | null;
  now: Temporal.Instant;
};

/**
 * Grants, reactivates and revokes enrollments. Checkout (free courses) and
 * fulfillment (paid ones) share granting, so the two can't drift apart; the
 * admin's un-enroll revokes. Which access an enrollment gives is decided in
 * `enrollment-access.ts`.
 */
@Injectable()
export class EnrollmentsRepository {
  async findEnrollment(
    scope: DbScope,
    courseId: string,
    customerId: string,
  ): Promise<EnrollmentRecord | null> {
    return scope.orm.public.Enrollment.select(
      "id",
      "paymentId",
      "revokedAt",
      "suspendedAt",
    )
      .where((enrollment) =>
        and(
          enrollment.courseId.eq(courseId),
          enrollment.customerId.eq(customerId),
        ),
      )
      .first();
  }

  /**
   * Enrolls the customer, or reactivates an enrollment the admin's un-enroll revoked.
   * `paymentId` records the payment that bought access, or null for a free
   * course. Returns the enrollment's id when this call granted access, or
   * null when they already had access or are suspended.
   */
  async grantAccess(
    scope: DbScope,
    access: EnrollmentAccess,
  ): Promise<string | null> {
    const insertedId = await this.insertEnrollment(scope, access);

    if (insertedId) {
      return insertedId;
    }

    return this.reactivateEnrollment(scope, access);
  }

  /**
   * Revokes an active enrollment that `paymentId` bought (null for a free
   * course). The guard sits in the UPDATE itself, so of two concurrent
   * un-enrolls only one changes the row, and an enrollment a newer payment
   * reactivated is left alone. Returns whether this call revoked it.
   */
  async revokeEnrollment(
    scope: DbScope,
    revocation: EnrollmentRevocation,
  ): Promise<boolean> {
    const { courseId, customerId, paymentId, now } = revocation;

    const revokedEnrollments = await scope.orm.public.Enrollment.where(
      (enrollment) =>
        and(
          enrollment.courseId.eq(courseId),
          enrollment.customerId.eq(customerId),
          enrollment.revokedAt.isNull(),
          paymentId === null
            ? enrollment.paymentId.isNull()
            : enrollment.paymentId.eq(paymentId),
        ),
    ).updateAndCount({ revokedAt: now });

    return revokedEnrollments === 1;
  }

  /** Returns the new enrollment's id, or null when the customer already has one. */
  private async insertEnrollment(
    scope: DbScope,
    access: EnrollmentAccess,
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

    return isNewEnrollment ? newEnrollmentId : null;
  }

  /** Returns the enrollment's id, or null when it can't be reactivated. */
  private async reactivateEnrollment(
    scope: DbScope,
    access: EnrollmentAccess,
  ): Promise<string | null> {
    const { courseId, customerId, paymentId, now } = access;

    // only a revoked, unsuspended enrollment can be reactivated. The
    // condition is part of the UPDATE itself, so of two concurrent requests
    // only one changes the row. A plain .update reads the row first and then
    // updates it by id alone, so both would reactivate it
    const reactivatedEnrollments = await scope.orm.public.Enrollment.where(
      (enrollment) =>
        and(
          enrollment.courseId.eq(courseId),
          enrollment.customerId.eq(customerId),
          enrollment.revokedAt.isNotNull(),
          enrollment.suspendedAt.isNull(),
        ),
    ).updateAndCount({ revokedAt: null, paymentId, purchasedAt: now });

    if (reactivatedEnrollments !== 1) {
      return null;
    }

    // updateAndCount returns only the count, and an enrollment's id never
    // changes, so reading it after the update is safe
    const reactivatedEnrollment = await this.findEnrollment(
      scope,
      courseId,
      customerId,
    );

    return reactivatedEnrollment?.id ?? null;
  }
}
