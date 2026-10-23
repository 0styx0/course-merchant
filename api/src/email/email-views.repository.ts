import { Injectable } from "@nestjs/common";

import type { DbScope } from "types.js";
import type { EmailViews } from "./templates/email-templates.js";

type CourseView = EmailViews["access_granted"]["course"];
type DisputedPaymentView = {
  payment: EmailViews["dispute_alert"]["payment"];
  courseId: string;
  customer: EmailViews["dispute_alert"]["customer"];
};

/**
 * Reads what the email templates show, by the ids in an outbox payload. Each
 * method returns null when the row no longer exists.
 */
@Injectable()
export class EmailViewsRepository {
  async findCourse(
    scope: DbScope,
    courseId: string,
  ): Promise<CourseView | null> {
    return scope.orm.public.Course.select(
      "title",
      "contentUrl",
      "startsAt",
      "endsAt",
      "timeZone",
    )
      .where((course) => course.id.eq(courseId))
      .first();
  }

  /** The payment with the customer who made it and the course it bought. */
  async findDisputedPayment(
    scope: DbScope,
    paymentId: string,
  ): Promise<DisputedPaymentView | null> {
    const payment = await scope.orm.public.Payment.select(
      "id",
      "amount",
      "currency",
    )
      .include("customer", (customer) => customer.select("email"))
      .include("coursePrice", (coursePrice) => coursePrice.select("courseId"))
      .where((candidate) => candidate.id.eq(paymentId))
      .first();

    if (!payment) {
      return null;
    }

    // always present: both foreign keys are required, but the ORM types every
    // to-one include as nullable
    return {
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
      },
      courseId: payment.coursePrice!.courseId,
      customer: payment.customer!,
    };
  }
}
