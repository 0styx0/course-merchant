import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "vitest";

import {
  renderEmail,
  type EmailToRender,
} from "@/email/templates/render-email.js";

const course = {
  title: "Intro to <Pottery> & Glaze",
  contentUrl: "https://drive.example.com/folder?a=1&b=2",
  startsAt: Temporal.Instant.from("2026-01-05T23:00:00Z"),
  endsAt: Temporal.Instant.from("2026-01-05T01:00:00Z").add({ hours: 48 }),
  timeZone: "America/New_York",
};
const customer = { name: 'Ann "the Potter" <script>' };

const emails: EmailToRender[] = [
  { kind: "access_granted", view: { customer, course } },
  {
    kind: "already_owned",
    view: { customer, course, refundIssued: false },
  },
  { kind: "access_suspended", view: { customer, course } },
  {
    kind: "dispute_alert",
    view: {
      payment: { id: "pay_1", amount: 1999, currency: "USD" },
      course,
      customer: { email: "ann@example.com" },
    },
  },
];

describe("renderEmail", () => {
  it.each(emails)("renders $kind with a subject, text and html", (email) => {
    const rendered = renderEmail(email, "Course Shop");

    expect(rendered.subject).toContain("Pottery");
    expect(rendered.text).toContain("Course Shop");
    expect(rendered.html).toContain("<!doctype html>");
    expect(rendered.html).toContain("Course Shop");
  });

  it.each(emails)("escapes user-written values in the $kind html", (email) => {
    const { html } = renderEmail(email, "Course Shop");

    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<Pottery>");
  });

  it.each(["access_granted", "already_owned"] as const)(
    "puts the %s link in both parts",
    (kind) => {
      const email = emails.find((candidate) => candidate.kind === kind)!;
      const { text, html } = renderEmail(email, "Course Shop");

      expect(text).toContain(course.contentUrl);
      expect(html).toContain(
        'href="https://drive.example.com/folder?a=1&amp;b=2"',
      );
    },
  );

  it("never includes the link in the suspended email", () => {
    const { text, html } = renderEmail(emails[2], "Course Shop");

    expect(text).not.toContain("drive.example.com");
    expect(html).not.toContain("drive.example.com");
  });

  it("writes the schedule in the course's time zone", () => {
    const { text } = renderEmail(emails[0], "Course Shop");

    expect(text).toContain("6:00 PM EST");
  });

  it("mentions the refund only when one was issued", () => {
    const withRefund = renderEmail(
      {
        kind: "already_owned",
        view: { customer, course, refundIssued: true },
      },
      "Course Shop",
    );
    const withoutRefund = renderEmail(emails[1], "Course Shop");

    expect(withRefund.text).toContain("refunded");
    expect(withoutRefund.text).not.toContain("refunded");
  });

  it("formats the disputed amount in the payment's currency", () => {
    expect(renderEmail(emails[3], "Course Shop").text).toContain("$19.99");
  });
});
