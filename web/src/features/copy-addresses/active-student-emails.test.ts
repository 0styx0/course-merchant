import { describe, expect, it } from "vitest";

import {
  adminCourseWithEveryStudentCase,
  everyStudentCaseEmail,
} from "@/mocks/fixtures/admin-courses";

import { activeStudentEmails } from "./active-student-emails";

const everyStudent = adminCourseWithEveryStudentCase.enrollments;

describe("activeStudentEmails", () => {
  it("lists the Active students' addresses in the API's order", () => {
    expect(activeStudentEmails(everyStudent)).toEqual([
      everyStudentCaseEmail("Dana Cohen"),
      everyStudentCaseEmail("Omar Haddad"),
      everyStudentCaseEmail("Noa Levi"),
      everyStudentCaseEmail("Sam Ortiz"),
    ]);
  });

  it("leaves out Suspended and Un-enrolled students", () => {
    const addresses = activeStudentEmails(everyStudent);

    for (const name of ["Lee Park", "Rina Gold", "Ari Stein", "Ben Shaw"]) {
      expect(addresses).not.toContain(everyStudentCaseEmail(name));
    }
  });

  it("is empty when the course has no students", () => {
    expect(activeStudentEmails([])).toEqual([]);
  });

  it("is empty when no student is Active", () => {
    const noneActive = everyStudent.map((enrollment) => ({
      ...enrollment,
      revokedAt: "2026-11-16T15:00:00Z",
    }));

    expect(activeStudentEmails(noneActive)).toEqual([]);
  });
});
