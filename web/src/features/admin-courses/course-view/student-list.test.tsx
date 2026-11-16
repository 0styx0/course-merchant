import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { adminCourseWithEnrollment } from "@/mocks/fixtures/admin-courses";

import { StudentList } from "./student-list";

describe("StudentList", () => {
  it("lists each student by name, email and enrolled date", () => {
    const [adaEnrollment] = adminCourseWithEnrollment.enrollments;
    const graceEnrollment = {
      ...adaEnrollment,
      customer: {
        id: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        name: "Grace Hopper",
        email: "grace@example.com",
      },
    };

    render(
      <StudentList
        enrollments={[adaEnrollment, graceEnrollment]}
        timeZone="America/New_York"
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Students" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("listitem").map((row) => row.textContent),
    ).toEqual([
      "Ada Lovelace · ada@example.com · enrolled Oct 16, 2026",
      "Grace Hopper · grace@example.com · enrolled Oct 16, 2026",
    ]);
  });

  it("dates each enrollment in the course's time zone", () => {
    const [adaEnrollment] = adminCourseWithEnrollment.enrollments;
    const lateEveningEnrollment = {
      ...adaEnrollment,
      enrolledAt: "2026-10-17T02:00:00Z",
    };

    render(
      <StudentList
        enrollments={[lateEveningEnrollment]}
        timeZone="America/New_York"
      />,
    );

    expect(screen.getByRole("listitem")).toHaveTextContent(
      "enrolled Oct 16, 2026",
    );
  });

  it("dates the same moment by a different course time zone", () => {
    const [adaEnrollment] = adminCourseWithEnrollment.enrollments;
    const lateEveningEnrollment = {
      ...adaEnrollment,
      enrolledAt: "2026-10-16T16:00:00Z",
    };

    render(
      <StudentList
        enrollments={[lateEveningEnrollment]}
        timeZone="Asia/Tokyo"
      />,
    );

    expect(screen.getByRole("listitem")).toHaveTextContent(
      "enrolled Oct 17, 2026",
    );
  });

  it("says no students yet when nobody has enrolled", () => {
    render(<StudentList enrollments={[]} timeZone="America/New_York" />);

    expect(screen.getByText("No students yet.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });
});
