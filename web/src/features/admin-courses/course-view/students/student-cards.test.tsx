import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  adminCourseWithEnrollment,
  adminCourseWithEveryStudentCase,
} from "@/mocks/fixtures/admin-courses";

import { StudentCards } from "./student-cards";

vi.mock("./unenroll/unenroll-student.action", () => ({
  unenrollStudentAction: vi.fn(),
}));

const courseId = adminCourseWithEveryStudentCase.id;

const [adaEnrollment] = adminCourseWithEnrollment.enrollments;

// The cards are the outer list's children; Attention lines are nested list items.
function studentCards() {
  return Array.from(screen.getAllByRole("list")[0].children) as HTMLElement[];
}

function fieldText(card: HTMLElement, term: string) {
  const termElement = within(card).getByText(term, { selector: "dt" });
  return termElement.nextElementSibling?.textContent;
}

describe("StudentCards", () => {
  it("draws one card per student, in the API's order", () => {
    render(
      <StudentCards
        courseId={courseId}
        enrollments={adminCourseWithEveryStudentCase.enrollments}
        timeZone="America/New_York"
      />,
    );

    expect(studentCards().map((card) => fieldText(card, "Student"))).toEqual([
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

  it("shows name, email, Enrolled, Access, Paid and Payment, in that order", () => {
    render(
      <StudentCards
        courseId={courseId}
        enrollments={[adaEnrollment]}
        timeZone="America/New_York"
      />,
    );

    const [card] = studentCards();
    expect(
      within(card)
        .getAllByRole("term")
        .map((term) => term.textContent),
    ).toEqual(["Student", "Enrolled", "Access", "Paid", "Payment"]);
    expect(fieldText(card, "Student")).toBe("Ada Lovelaceada@example.com");
    expect(fieldText(card, "Enrolled")).toBe("Oct 16, 2026");
    expect(fieldText(card, "Access")).toBe("Active");
    expect(fieldText(card, "Paid")).toBe("$99");
    expect(fieldText(card, "Payment")).toBe("Paid");
  });

  it("dates each enrollment in the course's time zone", () => {
    const lateEveningEnrollment = {
      ...adaEnrollment,
      enrolledAt: "2026-10-17T02:00:00Z",
    };

    render(
      <StudentCards
        courseId={courseId}
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
        courseId={courseId}
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
        courseId={courseId}
        enrollments={adminCourseWithEveryStudentCase.enrollments}
        timeZone="America/New_York"
      />,
    );

    expect(studentCards().map((card) => fieldText(card, "Access"))).toEqual([
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

  it("shows what each student paid and the state of the payment", () => {
    render(
      <StudentCards
        courseId={courseId}
        enrollments={adminCourseWithEveryStudentCase.enrollments}
        timeZone="America/New_York"
      />,
    );

    const [dana, , noa, , , , ari] = studentCards();
    expect(fieldText(dana, "Paid")).toBe("$99");
    expect(fieldText(dana, "Payment")).toBe("Paid");
    expect(fieldText(noa, "Paid")).toBe("Free");
    expect(fieldText(noa, "Payment")).toBe("—");
    expect(fieldText(ari, "Paid")).toBe("$79");
    expect(fieldText(ari, "Payment")).toBe("Refunded");
  });

  it("lists Dana's two Attention lines in order", () => {
    render(
      <StudentCards
        courseId={courseId}
        enrollments={adminCourseWithEveryStudentCase.enrollments.slice(0, 1)}
        timeZone="America/New_York"
      />,
    );

    const [card] = studentCards();
    const lines = within(
      within(card).getByText("Attention", { selector: "dt" })
        .nextElementSibling as HTMLElement,
    ).getAllByRole("listitem");
    expect(lines.map((line) => line.textContent)).toEqual([
      "Already-enrolled email failed",
      "Refund owed",
    ]);
  });

  it("gives each card its own student's Attention lines", () => {
    render(
      <StudentCards
        courseId={courseId}
        enrollments={adminCourseWithEveryStudentCase.enrollments}
        timeZone="America/New_York"
      />,
    );

    expect(
      studentCards().map(
        (card) =>
          within(card).queryByText("Attention", { selector: "dt" })
            ?.nextElementSibling?.textContent ?? null,
      ),
    ).toEqual([
      "Already-enrolled email failedRefund owed",
      "Course access email failed",
      "Course access email failed",
      "Suspension email failed",
      null,
      null,
      null,
      null,
    ]);
  });

  it("shows no Attention field on a card with no lines", () => {
    render(
      <StudentCards
        courseId={courseId}
        enrollments={[adaEnrollment]}
        timeZone="America/New_York"
      />,
    );

    expect(screen.queryByText("Attention", { selector: "dt" })).toBeNull();
  });

  it("hides the Attention icons from screen readers", () => {
    const { container } = render(
      <StudentCards
        courseId={courseId}
        enrollments={adminCourseWithEveryStudentCase.enrollments.slice(0, 1)}
        timeZone="America/New_York"
      />,
    );

    const icons = container.querySelectorAll("svg");
    expect(icons).toHaveLength(2);
    icons.forEach((icon) =>
      expect(icon).toHaveAttribute("aria-hidden", "true"),
    );
  });

  it("offers Un-enroll at the bottom of every card whose student still has access", () => {
    render(
      <StudentCards
        courseId={courseId}
        enrollments={adminCourseWithEveryStudentCase.enrollments}
        timeZone="America/New_York"
      />,
    );

    expect(
      studentCards().map(
        (card) => within(card).queryAllByRole("button").length,
      ),
    ).toEqual([1, 1, 1, 1, 1, 0, 0, 0]);
    const [dana] = studentCards();
    expect(dana.lastElementChild).toContainElement(
      within(dana).getByRole("button", { name: "Un-enroll Dana Cohen" }),
    );
  });
});
