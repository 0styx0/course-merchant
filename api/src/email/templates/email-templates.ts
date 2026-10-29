import type { Temporal } from "@js-temporal/polyfill";

import type { EmailContent } from "./email-content.js";
import { formatCourseTime, formatMoney } from "./format.js";

type CourseView = {
  title: string;
  contentUrl: string;
  startsAt: Temporal.Instant;
  endsAt: Temporal.Instant;
  timeZone: string;
};

// What each kind needs, already loaded from the ids in the outbox payload.
export type EmailViews = {
  access_granted: { course: CourseView };
  already_owned: { course: CourseView; refundIssued: boolean };
  access_suspended: {
    course: Pick<CourseView, "title">;
    refundIssued: boolean;
  };
  dispute_alert: {
    payment: { id: string; amount: number; currency: string };
    course: Pick<CourseView, "title">;
    customer: { email: string };
  };
};

const DOUBLE_CHARGE_REFUNDED =
  "You were charged a second time, so we've refunded that payment. It can take a few days to appear on your statement.";

const SUSPENDED_CHARGE_REFUNDED =
  "You were charged for this purchase, so we've refunded that payment. It can take a few days to appear on your statement.";

function schedule(course: CourseView): string {
  const starts = formatCourseTime(course.startsAt, course.timeZone);
  const ends = formatCourseTime(course.endsAt, course.timeZone);

  return `It runs from ${starts} to ${ends}.`;
}

export function accessGranted(
  view: EmailViews["access_granted"],
): EmailContent {
  return {
    subject: `You're in: ${view.course.title}`,
    heading: `Welcome to ${view.course.title}`,
    paragraphs: [
      `Hello and welcome! You now have access to ${view.course.title}.`,
      schedule(view.course),
    ],
    button: { label: "Open the course", url: view.course.contentUrl },
  };
}

export function alreadyOwned(view: EmailViews["already_owned"]): EmailContent {
  return {
    subject: `You already have ${view.course.title}`,
    heading: "You already have access",
    paragraphs: [
      `Hello again! You already own ${view.course.title}, so there was nothing new to buy.`,
      ...(view.refundIssued ? [DOUBLE_CHARGE_REFUNDED] : []),
      schedule(view.course),
    ],
    button: { label: "Open the course", url: view.course.contentUrl },
  };
}

export function accessSuspended(
  view: EmailViews["access_suspended"],
): EmailContent {
  return {
    subject: `Your access to ${view.course.title} is suspended`,
    heading: "Your access is suspended",
    paragraphs: [
      `Hello, thanks for your patience. Your access to ${view.course.title} is currently suspended, so we can't send you the course link.`,
      ...(view.refundIssued ? [SUSPENDED_CHARGE_REFUNDED] : []),
      "If you think this is a mistake, reply to this email and we'll look into it.",
    ],
  };
}

export function disputeAlert(view: EmailViews["dispute_alert"]): EmailContent {
  const amount = formatMoney(view.payment.amount, view.payment.currency);

  return {
    subject: `Payment dispute: ${view.course.title}`,
    heading: "A payment was disputed",
    paragraphs: [
      `${view.customer.email} disputed a payment of ${amount} for ${view.course.title}. Their access is suspended until the dispute is resolved.`,
      `Payment id: ${view.payment.id}`,
      "Respond to the dispute in the Stripe Dashboard before its deadline.",
    ],
  };
}
