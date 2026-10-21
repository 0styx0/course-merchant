import { Injectable } from "@nestjs/common";
import type { Temporal } from "@js-temporal/polyfill";
import { and } from "@prisma/orm-postgres/orm-client";

import type { DbScope } from "types.js";

export type CheckoutCustomer = {
  id: string;
  email: string;
  name: string;
};

export type CheckoutEnrollment = {
  id: string;
  revokedAt: Temporal.Instant | null;
  suspendedAt: Temporal.Instant | null;
};

@Injectable()
export class CheckoutRepository {
  /**
   * Returns the customer with this email, creating them if needed. `email`
   * must already be normalized. An existing customer keeps their name.
   */
  async findOrCreateCustomer(
    scope: DbScope,
    customer: { email: string; name: string },
  ): Promise<CheckoutCustomer> {
    // an empty `update` makes this a create-if-missing that returns the
    // existing row, so concurrent checkouts for one email can't collide
    return scope.orm.public.Customer
      .select("id", "email", "name")
      .upsert({
        create: customer,
        update: {},
        conflictOn: { email: customer.email },
      });
  }

  async findEnrollment(
    scope: DbScope,
    courseId: string,
    customerId: string,
  ): Promise<CheckoutEnrollment | null> {
    return scope.orm.public.Enrollment
      .select("id", "revokedAt", "suspendedAt")
      .where((enrollment) =>
        and(
          enrollment.courseId.eq(courseId),
          enrollment.customerId.eq(customerId),
        ),
      )
      .first();
  }

  /**
   * Enrolls the customer in a free course, or reactivates an enrollment a
   * refund revoked. Returns whether access was granted by this call: false
   * when they already had access or are suspended.
   */
  async grantFreeAccess(
    scope: DbScope,
    courseId: string,
    customerId: string,
    now: Temporal.Instant,
  ): Promise<boolean> {
    // skips the insert, instead of failing, when this customer already has
    // an enrollment in this course: the fields name the composite
    // @@unique([courseId, customerId]) constraint
    const insertedEnrollments =
      await scope.orm.public.Enrollment.createAndCount(
        [{ courseId, customerId }],
        { onConflict: "skip", conflictOn: ["courseId", "customerId"] },
      );

    const isNewEnrollment = insertedEnrollments === 1;

    if (isNewEnrollment) {
      return true;
    }

    // only a revoked, unsuspended enrollment can be reactivated. Matching on
    // revokedAt means a concurrent request that already reactivated it finds
    // nothing to update
    const reactivatedEnrollment = await scope.orm.public.Enrollment
      .where((enrollment) =>
        and(
          enrollment.courseId.eq(courseId),
          enrollment.customerId.eq(customerId),
          enrollment.revokedAt.isNotNull(),
          enrollment.suspendedAt.isNull(),
        ),
      )
      .update({ revokedAt: null, paymentId: null, purchasedAt: now });

    const wasReactivated = reactivatedEnrollment !== null;

    return wasReactivated;
  }
}
