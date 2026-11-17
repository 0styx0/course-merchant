import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  adminCourseWithEnrollment,
  adminCourseWithEveryStudentCase,
} from "@/mocks/fixtures/admin-courses";

import { StudentList } from "./student-list";

vi.mock("./unenroll/unenroll-student.action", () => ({
  unenrollStudentAction: vi.fn(),
}));

const courseId = adminCourseWithEveryStudentCase.id;

describe("StudentList", () => {
  it("counts every student in the heading, un-enrolled ones too", () => {
    render(
      <StudentList
        courseId={courseId}
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
      <StudentList
        courseId={courseId}
        enrollments={[unenrolledAda]}
        timeZone="America/New_York"
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Students (1)" }),
    ).toBeInTheDocument();
  });

  it("reads Students (0) and says no students yet when nobody has enrolled", () => {
    render(
      <StudentList
        courseId={courseId}
        enrollments={[]}
        timeZone="America/New_York"
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Students (0)" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No students yet.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("draws the students as cards and as a table, for CSS to choose between", () => {
    render(
      <StudentList
        courseId={courseId}
        enrollments={adminCourseWithEveryStudentCase.enrollments}
        timeZone="America/New_York"
      />,
    );

    expect(screen.getAllByRole("list")[0].children).toHaveLength(8);
    expect(screen.getAllByRole("row")).toHaveLength(9);
  });

  it("offers Un-enroll in both the cards and the table", () => {
    const [adaEnrollment] = adminCourseWithEnrollment.enrollments;

    render(
      <StudentList
        courseId={courseId}
        enrollments={[adaEnrollment]}
        timeZone="America/New_York"
      />,
    );

    expect(
      screen.getAllByRole("button", { name: "Un-enroll Ada Lovelace" }),
    ).toHaveLength(2);
  });
});
