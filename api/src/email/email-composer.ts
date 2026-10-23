import { Inject, Injectable } from "@nestjs/common";

import { EMAIL_CONFIG, type EmailConfig } from "@/config/email-config.js";
import { PrismaService } from "@/prisma/prisma.service.js";
import type { EmailPayloads, OutboxEmail } from "./email-outbox.repository.js";
import { EmailViewsRepository } from "./email-views.repository.js";
import type { RenderedEmail } from "./templates/email-content.js";
import { renderEmail } from "./templates/render-email.js";

export class EmailSourceMissingError extends Error {
  constructor(what: string) {
    super(`Can't compose the email: the ${what} no longer exists.`);
    this.name = "EmailSourceMissingError";
  }
}

/**
 * Turns a queued email into the subject, text and HTML to send. The payload
 * holds only ids, so this loads the current course, customer or payment first.
 */
@Injectable()
export class EmailComposer {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(EmailViewsRepository)
    private readonly views: EmailViewsRepository,
    @Inject(EMAIL_CONFIG)
    private readonly config: EmailConfig,
  ) {}

  /** Throws `EmailSourceMissingError` when a row the payload names is gone. */
  async compose(email: OutboxEmail): Promise<RenderedEmail> {
    // the payload was written by `enqueue`, so it matches the email's kind
    const payload = email.payload as EmailPayloads[typeof email.kind];

    switch (email.kind) {
      case "access_granted":
        return this.accessGranted(payload as EmailPayloads["access_granted"]);
      case "already_owned":
        return this.alreadyOwned(payload as EmailPayloads["already_owned"]);
      case "access_suspended":
        return this.accessSuspended(
          payload as EmailPayloads["access_suspended"],
        );
      case "dispute_alert":
        return this.disputeAlert(payload as EmailPayloads["dispute_alert"]);
    }
  }

  private async accessGranted(
    payload: EmailPayloads["access_granted"],
  ): Promise<RenderedEmail> {
    const course = await this.course(payload.courseId);

    return this.render({
      kind: "access_granted",
      view: { course },
    });
  }

  private async alreadyOwned(
    payload: EmailPayloads["already_owned"],
  ): Promise<RenderedEmail> {
    const course = await this.course(payload.courseId);

    return this.render({
      kind: "already_owned",
      view: { course, refundIssued: payload.refundIssued },
    });
  }

  private async accessSuspended(
    payload: EmailPayloads["access_suspended"],
  ): Promise<RenderedEmail> {
    const course = await this.course(payload.courseId);

    return this.render({
      kind: "access_suspended",
      view: { course, refundIssued: payload.refundIssued },
    });
  }

  private async disputeAlert(
    payload: EmailPayloads["dispute_alert"],
  ): Promise<RenderedEmail> {
    const disputed = await this.views.findDisputedPayment(
      this.prisma.db,
      payload.paymentId,
    );

    if (!disputed) {
      throw new EmailSourceMissingError("disputed payment");
    }

    const course = await this.course(disputed.courseId);

    return this.render({
      kind: "dispute_alert",
      view: {
        payment: disputed.payment,
        course,
        customer: disputed.customer,
      },
    });
  }

  private render(email: Parameters<typeof renderEmail>[0]): RenderedEmail {
    return renderEmail(email, this.config.shopName);
  }

  private async course(courseId: string) {
    const course = await this.views.findCourse(this.prisma.db, courseId);

    if (!course) {
      throw new EmailSourceMissingError("course");
    }

    return course;
  }
}
