import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  adminCourseWithEnrollment,
  adminCourseWithEveryStudentCase,
} from "@/mocks/fixtures/admin-courses";

import { StudentCards } from "./student-cards";

const [adaEnrollment] = adminCourseWithEnrollment.enrollments;

function fieldText(card: HTMLElement, term: string) {
  const termElement = within(card).getByText(term, { selector: "dt" });
  return termElement.nextElementSibling?.textContent;
}

describe("StudentCards", () => {
  it("draws one card per student, in the API's order", () => {
    render(
      <StudentCards
        enrollments={adminCourseWithEveryStudentCase.enrollments}
        timeZone="America/New_York"
      />,
    );

    expect(
      screen.getAllByRole("listitem").map((card) => fieldText(card, "Student")),
    ).toEqual([
      expect.stringMatching(/^Dana Cohen/),
      expect.stringMatching(/^Omar Haddad/),
      expect.stringMatching(/^Noa Levi/),
      expect.stringMatching(/^Lee Park/),
      expect.stringMatching(/^Sam Ortiz/),
      expect.stringMatching(/^Rina Gold/),
      expect.stringMatching(/^Ari Stein/),
      expect.stringMatching(/^Ben Shaw/),
    ]);
  });

  it("shows name, email, Enrolled and Access, in that order", () => {
    render(
      <StudentCards
        enrollments={[adaEnrollment]}
        timeZone="America/New_York"
      />,
    );

    const card = screen.getByRole("listitem");
    expect(
      within(card)
        .getAllByRole("term")
        .map((term) => term.textContent),
    ).toEqual(["Student", "Enrolled", "Access"]);
    expect(fieldText(card, "Student")).toBe("Ada Lovelaceada@example.com");
    expect(fieldText(card, "Enrolled")).toBe("Oct 16, 2026");
    expect(fieldText(card, "Access")).toBe("Active");
  });

  it("dates each enrollment in the course's time zone", () => {
    const lateEveningEnrollment = {
      ...adaEnrollment,
      enrolledAt: "2026-10-17T02:00:00Z",
    };

    render(
      <StudentCards
        enrollments={[lateEveningEnrollment]}
        timeZone="America/New_York"
      />,
    );

    expect(fieldText(screen.getByRole("listitem"), "Enrolled")).toBe(
      "Oct 16, 2026",
    );
  });

  it("dates the same moment by a different course time zone", () => {
    const lateEveningEnrollment = {
      ...adaEnrollment,
      enrolledAt: "2026-10-16T16:00:00Z",
    };

    render(
      <StudentCards
        enrollments={[lateEveningEnrollment]}
        timeZone="Asia/Tokyo"
      />,
    );

    expect(fieldText(screen.getByRole("listitem"), "Enrolled")).toBe(
      "Oct 17, 2026",
    );
  });

  it("shows each student's access, with the date beside Suspended", () => {
    render(
      <StudentCards
        enrollments={adminCourseWithEveryStudentCase.enrollments}
        timeZone="America/New_York"
      />,
    );

    expect(
      screen.getAllByRole("listitem").map((card) => fieldText(card, "Access")),
    ).toEqual([
      "Active",
      "Active",
      "Active",
      "SuspendedOct 30, 2026",
      "Active",
      "SuspendedNov 1, 2026",
      "Un-enrolled",
      "Un-enrolled",
    ]);
  });
});
