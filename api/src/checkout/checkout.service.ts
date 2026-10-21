import { Inject, Injectable } from "@nestjs/common";
import { Temporal } from "@js-temporal/polyfill";

import type { DbScope, StartCheckoutRequest, StartCheckoutResponse } from "types.js";
import { ApiException } from "@/common/errors/api.exception.js";
import { ErrorCodeCheckout } from "@/common/errors/error-codes.js";
import { courseNotFound } from "@/courses/course-errors.js";
import {
  CoursesRepository,
  type CourseRepositoryModelPublic,
} from "@/courses/courses.repository/courses.repository.js";
import { EmailOutboxRepository, type QueuedEmail } from "@/email/email-outbox.repository.js";
import { PrismaService } from "@/prisma/prisma.service.js";
import { CheckoutRepository, type CheckoutCustomer } from "./checkout.repository.js";
import { EnrollmentAccess, enrollmentAccess } from "./enrollment-access.js";

// Anyone can start a checkout for any address, so cap how many emails one
// inbox receives. Over the cap the response is unchanged; nothing is queued.
const CHECKOUT_EMAIL_LIMIT = 5;
const CHECKOUT_EMAIL_WINDOW = { hours: 24 };

const CHECK_EMAIL: StartCheckoutResponse = { status: "check_email" };

/** Everything the outcome handlers need about one checkout attempt. */
type CheckoutContext = {
  tx: DbScope;
  now: Temporal.Instant;
  course: CourseRepositoryModelPublic;
  customer: CheckoutCustomer;
};

@Injectable()
export class CheckoutService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(CoursesRepository)
    private readonly coursesRepository: CoursesRepository,
    @Inject(CheckoutRepository)
    private readonly checkoutRepository: CheckoutRepository,
    @Inject(EmailOutboxRepository)
    private readonly emailOutbox: EmailOutboxRepository,
  ) {}

  /**
   * Starts buying a course. The response never reveals whether the email
   * already owns it: owners, suspended buyers and free enrollments all get
   * `check_email`, with the details in the email itself.
   */
  async startCheckout(
    request: StartCheckoutRequest,
  ): Promise<StartCheckoutResponse> {
    const now = Temporal.Now.instant();
    const course = await this.findPurchasableCourse(request.courseId, now);

    return this.prisma.db.transaction(async (tx) => {
      const customer = await this.checkoutRepository.findOrCreateCustomer(tx, {
        email: request.email,
        name: request.name,
      });

      const enrollment = await this.checkoutRepository.findEnrollment(
        tx,
        course.id,
        customer.id,
      );

      const context = { tx, now, course, customer };

      return this.respondToAccess(enrollmentAccess(enrollment), context);
    });
  }

  /**
   * The course a buyer may pay for: publicly viewable (same rule as
   * getCourse) and not yet ended.
   */
  private async findPurchasableCourse(
    courseId: string,
    now: Temporal.Instant,
  ): Promise<CourseRepositoryModelPublic> {
    const course = await this.coursesRepository.findById(courseId, now);

    if (!course) {
      throw courseNotFound(courseId);
    }

    const hasEnded = Temporal.Instant.compare(course.endsAt, now) <= 0;

    if (hasEnded) {
      throw new ApiException(ErrorCodeCheckout.COURSE_NOT_PURCHASABLE, {
        detail: "This course has ended and can no longer be bought.",
      });
    }

    return course;
  }

  private respondToAccess(
    access: EnrollmentAccess,
    context: CheckoutContext,
  ): Promise<StartCheckoutResponse> {
    switch (access) {
      case EnrollmentAccess.ACTIVE:
        return this.resendCourseLink(context);
      case EnrollmentAccess.SUSPENDED:
        return this.explainSuspension(context);
      // no access yet, or a refund removed it: the buyer can buy (again)
      case EnrollmentAccess.NONE:
      case EnrollmentAccess.REVOKED:
        return this.sellCourse(context);
    }
  }

  private async resendCourseLink(
    context: CheckoutContext,
  ): Promise<StartCheckoutResponse> {
    await this.queueCheckoutEmail(context, {
      kind: "already_owned",
      recipient: context.customer.email,
      payload: { ...emailIds(context), refundIssued: false },
    });

    return CHECK_EMAIL;
  }

  private async explainSuspension(
    context: CheckoutContext,
  ): Promise<StartCheckoutResponse> {
    await this.queueCheckoutEmail(context, {
      kind: "access_suspended",
      recipient: context.customer.email,
      payload: emailIds(context),
    });

    return CHECK_EMAIL;
  }

  private sellCourse(
    context: CheckoutContext,
  ): Promise<StartCheckoutResponse> {
    const [currentPrice] = context.course.prices;
    const isFree = currentPrice.amount === 0;

    return isFree
      ? this.enrollInFreeCourse(context)
      : this.startPaidCheckout(context);
  }

  private async enrollInFreeCourse(
    context: CheckoutContext,
  ): Promise<StartCheckoutResponse> {
    const accessGranted = await this.checkoutRepository.grantFreeAccess(
      context.tx,
      context.course.id,
      context.customer.id,
      context.now,
    );

    // false only if a concurrent request granted access first, and that
    // request sends the email
    if (accessGranted) {
      await this.queueCheckoutEmail(context, {
        kind: "access_granted",
        recipient: context.customer.email,
        payload: emailIds(context),
      });
    }

    return CHECK_EMAIL;
  }

  private async startPaidCheckout(
    _context: CheckoutContext,
  ): Promise<StartCheckoutResponse> {
    throw new Error("Paid checkout isn't implemented yet.");
  }

  private async queueCheckoutEmail(
    context: CheckoutContext,
    email: QueuedEmail,
  ): Promise<void> {
    const recentlyQueued = await this.emailOutbox.countQueuedSince(
      context.tx,
      email.recipient,
      context.now.subtract(CHECKOUT_EMAIL_WINDOW),
    );

    const isOverLimit = recentlyQueued >= CHECKOUT_EMAIL_LIMIT;

    if (isOverLimit) {
      return;
    }

    await this.emailOutbox.enqueue(context.tx, email);
  }
}

function emailIds(context: CheckoutContext) {
  return { courseId: context.course.id, customerId: context.customer.id };
}
