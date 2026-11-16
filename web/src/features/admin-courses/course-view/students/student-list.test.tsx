import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  adminCourseWithEnrollment,
  adminCourseWithEveryStudentCase,
} from "@/mocks/fixtures/admin-courses";

import { StudentList } from "./student-list";

describe("StudentList", () => {
  it("counts every student in the heading, un-enrolled ones too", () => {
    render(
      <StudentList
        enrollments={adminCourseWithEveryStudentCase.enrollments}
        timeZone="America/New_York"
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Students (8)" }),
    ).toBeInTheDocument();
  });

  it("counts an un-enrolled student as a student", () => {
    const [adaEnrollment] = adminCourseWithEnrollment.enrollments;
    const unenrolledAda = {
      ...adaEnrollment,
      revokedAt: "2026-11-05T15:00:00Z",
    };

    render(
      <StudentList enrollments={[unenrolledAda]} timeZone="America/New_York" />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Students (1)" }),
    ).toBeInTheDocument();
  });

  it("reads Students (0) and says no students yet when nobody has enrolled", () => {
    render(<StudentList enrollments={[]} timeZone="America/New_York" />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Students (0)" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No students yet.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });
});
