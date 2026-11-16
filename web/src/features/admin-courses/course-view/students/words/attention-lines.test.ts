import { describe, expect, it } from "vitest";

import { adminCourseWithEveryStudentCase } from "@/mocks/fixtures/admin-courses";

import { attentionLineWords } from "./attention-lines";

function studentNamed(name: string) {
  const enrollment = adminCourseWithEveryStudentCase.enrollments.find(
    (candidate) => candidate.customer.name.startsWith(name),
  );
  if (enrollment === undefined) throw new Error(`No fixture student ${name}`);
  return enrollment;
}

const dana = studentNamed("Dana");
const omar = studentNamed("Omar");
const noa = studentNamed("Noa");
const lee = studentNamed("Lee");
const sam = studentNamed("Sam");
const rina = studentNamed("Rina");
const ari = studentNamed("Ari");
const ben = studentNamed("Ben");

describe("attentionLineWords", () => {
  it("lists the failed email line, then Refund owed, when both apply", () => {
    expect(attentionLineWords(dana)).toEqual([
      "Already-enrolled email failed",
      "Refund owed",
    ]);
  });

  it("names a failed access_granted email Course access email failed", () => {
    expect(attentionLineWords(omar)).toEqual(["Course access email failed"]);
    expect(attentionLineWords(noa)).toEqual(["Course access email failed"]);
  });

  it("names a failed access_suspended email Suspension email failed", () => {
    expect(attentionLineWords(lee)).toEqual(["Suspension email failed"]);
  });

  it("adds nothing for a sent email", () => {
    expect(attentionLineWords(sam)).toEqual([]);
    expect(attentionLineWords(rina)).toEqual([]);
  });

  it("adds nothing for a pending email", () => {
    expect(
      attentionLineWords({
        ...sam,
        latestEmail: { kind: "access_granted", status: "pending" },
      }),
    ).toEqual([]);
  });

  it("hides a failed email for an Un-enrolled student", () => {
    expect(attentionLineWords(ari)).toEqual([]);
    expect(attentionLineWords(ben)).toEqual([]);
  });

  it("shows Refund owed on an Un-enrolled row", () => {
    expect(attentionLineWords({ ...ari, refundStatus: "owed" })).toEqual([
      "Refund owed",
    ]);
  });

  it("still shows a failed email when the student is Suspended and Un-enrolled, because access reads Suspended", () => {
    expect(
      attentionLineWords({
        ...lee,
        revokedAt: "2026-11-05T15:00:00Z",
      }),
    ).toEqual(["Suspension email failed"]);
  });
});
