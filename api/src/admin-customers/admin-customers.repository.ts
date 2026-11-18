import { Injectable } from "@nestjs/common";
import { Temporal } from "@js-temporal/polyfill";

import type { DbScope } from "types.js";

export type AdminCustomerRepositoryModel = {
  id: string;
  name: string;
  email: string;
  // when the newest checkout started; null when the customer never started one
  latestCheckoutStartedAt: Temporal.Instant | null;
  // newest enrollment first, including enrollments in deleted courses
  enrollments: {
    // when access was last granted
    purchasedAt: Temporal.Instant;
    revokedAt: Temporal.Instant | null;
    suspendedAt: Temporal.Instant | null;
    course: { id: string; title: string };
  }[];
};

type CustomerWithLatestPayment = Omit<
  AdminCustomerRepositoryModel,
  "latestCheckoutStartedAt"
> & {
  payments: { createdAt: Temporal.Instant }[];
};

@Injectable()
export class AdminCustomersRepository {
  /**
   * Returns every customer, newest first, with their latest checkout time
   * and all their enrollments.
   */
  async findAllCustomersWithEnrollments(
    scope: DbScope,
  ): Promise<AdminCustomerRepositoryModel[]> {
    const customers = await scope.orm.public.Customer.select(
      "id",
      "name",
      "email",
    )
      .include("payments", (payments) =>
        payments
          .select("createdAt")
          .orderBy((payment) => payment.createdAt.desc())
          .limit(1),
      )
      .include("enrollments", (enrollments) =>
        enrollments
          .select("purchasedAt", "revokedAt", "suspendedAt")
          .include("course", (course) => course.select("id", "title"))
          .orderBy((enrollment) => enrollment.purchasedAt.desc()),
      )
      .orderBy([
        (customer) => customer.createdAt.desc(),
        (customer) => customer.id.desc(),
      ])
      .all();

    return customers.map(toAdminCustomerModel);
  }
}

// the ORM returns the latest payment as a list of at most one
function toAdminCustomerModel({
  payments,
  ...customer
}: CustomerWithLatestPayment): AdminCustomerRepositoryModel {
  return {
    ...customer,
    latestCheckoutStartedAt: payments[0]?.createdAt ?? null,
  };
}
