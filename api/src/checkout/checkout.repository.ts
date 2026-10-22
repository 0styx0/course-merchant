import { Injectable } from "@nestjs/common";
import type { Temporal } from "@js-temporal/polyfill";
import { and } from "@prisma/orm-postgres/orm-client";

import { visibleCoursesWithCurrentPrice } from "@/courses/course-visibility.js";
import type { Models } from "@/prisma/contract.js";
import type { DbScope } from "types.js";

type PaymentProvider = Models.public_Payment["provider"];

export type PaymentStatus = Models.public_Payment["status"];

/** A course the public can see, with what it costs right now. */
export type CheckoutCourse = {
  id: string;
  title: string;
  endsAt: Temporal.Instant;
  currentPrice: {
    id: string;
    amount: number;
    currency: string;
  };
};

export type CheckoutCustomer = {
  id: string;
  email: string;
  name: string;
};

export type PendingPayment = {
  id: string;
  amount: number;
  currency: string;
};

@Injectable()
export class CheckoutRepository {
  /**
   * The course if the public can see it, using the same rule as browsing.
   * Whether it has ended is left to the caller, which reports that
   * differently from a course that doesn't exist.
   */
  async findVisibleCourse(
    scope: DbScope,
    courseId: string,
    now: Temporal.Instant,
  ): Promise<CheckoutCourse | null> {
    const course = await visibleCoursesWithCurrentPrice(
      scope.orm.public.Course,
      now,
    )
      .where((candidate) => candidate.id.eq(courseId))
      .first();

    if (!course) {
      return null;
    }

    // always present: a course is only visible once a price is in effect
    const [currentPrice] = course.prices;

    return {
      id: course.id,
      title: course.title,
      endsAt: course.endsAt,
      currentPrice: {
        id: currentPrice.id,
        amount: currentPrice.amount,
        currency: currentPrice.currency,
      },
    };
  }

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

  /**
   * Records a checkout attempt before the provider is called, so its id can
   * key the provider request. Amount and currency are copied from the price,
   * so a later price change never alters what this attempt charges.
   */
  async createPendingPayment(
    scope: DbScope,
    payment: {
      provider: PaymentProvider;
      customerId: string;
      coursePriceId: string;
      amount: number;
      currency: string;
    },
  ): Promise<PendingPayment> {
    return scope.orm.public.Payment.create({ ...payment, status: "pending" });
  }

  async saveProviderCheckoutId(
    scope: DbScope,
    paymentId: string,
    providerCheckoutId: string,
  ): Promise<void> {
    await scope.orm.public.Payment
      .where((payment) => payment.id.eq(paymentId))
      .update({ providerCheckoutId });
  }

  async findPaymentStatusByCheckoutId(
    scope: DbScope,
    provider: PaymentProvider,
    providerCheckoutId: string,
  ): Promise<PaymentStatus | null> {
    const payment = await scope.orm.public.Payment
      .where((candidate) =>
        and(
          candidate.provider.eq(provider),
          candidate.providerCheckoutId.eq(providerCheckoutId),
        ),
      )
      .first();

    return payment?.status ?? null;
  }
}
