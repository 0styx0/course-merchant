import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { adminCourseWithEnrollment } from "@/mocks/fixtures/admin-courses";

import { StudentList } from "./student-list";

describe("StudentList", () => {
  it("lists each student by name and email", () => {
    const [adaEnrollment] = adminCourseWithEnrollment.enrollments;
    const graceEnrollment = {
      ...adaEnrollment,
      customer: {
        id: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        name: "Grace Hopper",
        email: "grace@example.com",
      },
    };

    render(<StudentList enrollments={[adaEnrollment, graceEnrollment]} />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Students" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("listitem").map((row) => row.textContent),
    ).toEqual([
      "Ada Lovelace · ada@example.com",
      "Grace Hopper · grace@example.com",
    ]);
  });

  it("says no students yet when nobody has enrolled", () => {
    render(<StudentList enrollments={[]} />);

    expect(screen.getByText("No students yet.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });
});
