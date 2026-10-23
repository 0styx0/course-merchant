import { Injectable } from "@nestjs/common";
import type { Temporal } from "@js-temporal/polyfill";

import { visibleCoursesWithCurrentPrice } from "@/courses/course-visibility.js";
import type { DbScope } from "types.js";

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
    return scope.orm.public.Customer.select("id", "email", "name").upsert({
      create: customer,
      update: {},
      conflictOn: { email: customer.email },
    });
  }
}
