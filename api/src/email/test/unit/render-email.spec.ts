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

const emails: EmailToRender[] = [
  { kind: "access_granted", view: { course } },
  {
    kind: "already_owned",
    view: { course, wasRefundIssued: false },
  },
  { kind: "access_suspended", view: { course, wasRefundIssued: false } },
];

function emailOfKind(kind: EmailToRender["kind"]): EmailToRender {
  return emails.find((candidate) => candidate.kind === kind)!;
}

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
      const { text, html } = renderEmail(emailOfKind(kind), "Course Shop");

      expect(text).toContain(course.contentUrl);
      expect(html).toContain(
        'href="https://drive.example.com/folder?a=1&amp;b=2"',
      );
    },
  );

  it("never includes the link in the suspended email", () => {
    const { text, html } = renderEmail(
      emailOfKind("access_suspended"),
      "Course Shop",
    );

    expect(text).not.toContain("drive.example.com");
    expect(html).not.toContain("drive.example.com");
  });

  it.each(["access_granted", "already_owned", "access_suspended"] as const)(
    "opens the %s email with a greeting",
    (kind) => {
      expect(renderEmail(emailOfKind(kind), "Course Shop").text).toMatch(
        /Hello/,
      );
    },
  );

  it("writes the schedule in the course's time zone", () => {
    const { text } = renderEmail(emailOfKind("access_granted"), "Course Shop");

    expect(text).toContain("6:00 PM EST");
  });

  it("mentions the refund only when one was issued", () => {
    const withRefund = renderEmail(
      {
        kind: "already_owned",
        view: { course, wasRefundIssued: true },
      },
      "Course Shop",
    );
    const withoutRefund = renderEmail(
      emailOfKind("already_owned"),
      "Course Shop",
    );

    expect(withRefund.text).toContain("refunded");
    expect(withoutRefund.text).not.toContain("refunded");
  });

  it("mentions the refund in the suspension email only when one was issued", () => {
    const withRefund = renderEmail(
      { kind: "access_suspended", view: { course, wasRefundIssued: true } },
      "Course Shop",
    );
    const withoutRefund = renderEmail(
      emailOfKind("access_suspended"),
      "Course Shop",
    );

    expect(withRefund.text).toContain("refunded");
    expect(withoutRefund.text).not.toContain("refunded");
  });
});
