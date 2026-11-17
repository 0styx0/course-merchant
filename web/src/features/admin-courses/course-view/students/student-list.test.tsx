import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  adminCourseWithEnrollment,
  adminCourseWithEveryStudentCase,
} from "@/mocks/fixtures/admin-courses";

import type { AdminCourse } from "@/lib/types";

import { StudentList } from "./student-list";

vi.mock("./unenroll/unenroll-student.action", () => ({
  unenrollStudentAction: vi.fn(),
}));

const courseId = adminCourseWithEveryStudentCase.id;
const everyStudent = adminCourseWithEveryStudentCase.enrollments;

// Cards come first in the page, then the table, so each name shows twice.
function namesInReadingOrder() {
  return screen
    .getAllByText(/^(Sam|Noa|Omar|Dana|Lee|Rina|Ari|Ben) \w+$/)
    .map((element) => element.textContent);
}

function cardNames() {
  return namesInReadingOrder().slice(0, everyStudent.length);
}

async function pickStudentOrder(orderLabel: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("combobox", { name: "Sort by" }));
  await user.click(screen.getByRole("option", { name: orderLabel }));
}

function studentListShowing(enrollments: AdminCourse["enrollments"]) {
  return (
    <StudentList
      courseId={courseId}
      enrollments={enrollments}
      timeZone="America/New_York"
    />
  );
}

function renderEveryStudent() {
  return render(studentListShowing(everyStudent));
}

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
    expect(screen.queryByRole("combobox", { name: "Sort by" })).toBeNull();
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

  it("lists the students newest enrolled first in both the cards and the table", () => {
    const newestFirst = [
      "Sam Ortiz",
      "Noa Levi",
      "Omar Haddad",
      "Dana Cohen",
      "Lee Park",
      "Rina Gold",
      "Ari Stein",
      "Ben Shaw",
    ];

    render(
      <StudentList
        courseId={courseId}
        enrollments={adminCourseWithEveryStudentCase.enrollments}
        timeZone="America/New_York"
      />,
    );

    expect(namesInReadingOrder()).toEqual([...newestFirst, ...newestFirst]);
  });

  it("opens with Newest enrolled first in the Sort by menu", () => {
    renderEveryStudent();

    expect(screen.getByRole("combobox", { name: "Sort by" })).toHaveTextContent(
      "Newest enrolled first",
    );
  });

  it("reorders both the cards and the table when the admin picks an order", async () => {
    const oldestFirst = [
      "Ben Shaw",
      "Ari Stein",
      "Rina Gold",
      "Lee Park",
      "Dana Cohen",
      "Omar Haddad",
      "Noa Levi",
      "Sam Ortiz",
    ];
    renderEveryStudent();

    await pickStudentOrder("Oldest enrolled first");

    expect(namesInReadingOrder()).toEqual([...oldestFirst, ...oldestFirst]);
  });

  it("keeps the chosen order when the page re-renders with a newly un-enrolled student", async () => {
    const { rerender } = renderEveryStudent();
    await pickStudentOrder("Active first");
    const withSamUnenrolled = everyStudent.map((enrollment) =>
      enrollment.customer.name === "Sam Ortiz"
        ? { ...enrollment, revokedAt: "2026-11-16T15:00:00Z" }
        : enrollment,
    );

    rerender(studentListShowing(withSamUnenrolled));

    expect(screen.getByRole("combobox", { name: "Sort by" })).toHaveTextContent(
      "Active first",
    );
    expect(cardNames()).toEqual([
      "Noa Levi",
      "Omar Haddad",
      "Dana Cohen",
      "Sam Ortiz",
      "Lee Park",
      "Rina Gold",
      "Ari Stein",
      "Ben Shaw",
    ]);
  });

  it("starts at Newest enrolled first on every mount, as after a reload", async () => {
    const { unmount } = renderEveryStudent();
    await pickStudentOrder("Needs attention first");
    unmount();

    renderEveryStudent();

    expect(screen.getByRole("combobox", { name: "Sort by" })).toHaveTextContent(
      "Newest enrolled first",
    );
    expect(cardNames()[0]).toBe("Sam Ortiz");
  });
});
