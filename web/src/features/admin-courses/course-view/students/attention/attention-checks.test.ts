import { describe, expect, it } from "vitest";

import { adminCourseWithEveryStudentCase } from "@/mocks/fixtures/admin-courses";

import {
  isFailedEmailToResend,
  isRefundOwedToStudent,
} from "./attention-checks";

function studentNamed(name: string) {
  const enrollment = adminCourseWithEveryStudentCase.enrollments.find(
    (candidate) => candidate.customer.name.startsWith(name),
  );
  if (enrollment === undefined) throw new Error(`No fixture student ${name}`);
  return enrollment;
}

const dana = studentNamed("Dana");
const omar = studentNamed("Omar");
const lee = studentNamed("Lee");
const sam = studentNamed("Sam");
const ari = studentNamed("Ari");

describe("isRefundOwedToStudent", () => {
  it("says the shop owes the student a refund when the API marks it owed", () => {
    expect(isRefundOwedToStudent(dana)).toBe(true);
  });

  it("says the shop owes nothing when the API marks it not owed", () => {
    expect(isRefundOwedToStudent(sam)).toBe(false);
  });

  it("still says the shop owes the student after an un-enroll", () => {
    expect(
      isRefundOwedToStudent({ ...dana, revokedAt: "2026-11-05T15:00:00Z" }),
    ).toBe(true);
  });
});

describe("isFailedEmailToResend", () => {
  it("asks for a resend when an enrolled student's email failed", () => {
    expect(isFailedEmailToResend(omar)).toBe(true);
  });

  it("asks for no resend when the email was sent", () => {
    expect(isFailedEmailToResend(sam)).toBe(false);
  });

  it("asks for no resend when the email is still pending", () => {
    expect(
      isFailedEmailToResend({
        ...omar,
        latestEmail: { kind: "access_granted", status: "pending" },
      }),
    ).toBe(false);
  });

  it("asks for no resend when the student is Un-enrolled", () => {
    expect(isFailedEmailToResend(ari)).toBe(false);
  });

  it("asks for a resend when a Suspended student is also un-enrolled, because access reads Suspended", () => {
    expect(
      isFailedEmailToResend({ ...lee, revokedAt: "2026-11-05T15:00:00Z" }),
    ).toBe(true);
  });
});
