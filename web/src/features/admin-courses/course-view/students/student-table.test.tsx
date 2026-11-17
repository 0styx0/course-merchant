import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  adminCourseWithEnrollment,
  adminCourseWithEveryStudentCase,
} from "@/mocks/fixtures/admin-courses";

import { StudentTable } from "./student-table";

const [adaEnrollment] = adminCourseWithEnrollment.enrollments;

// The first row holds the column headers; the rows after it hold the students.
function studentRows() {
  return screen.getAllByRole("row").slice(1);
}

function rowCells(row: HTMLElement) {
  return within(row).getAllByRole("cell");
}

// Finds a cell by its column header, so a reordered column fails by name.
function cellInColumn(row: HTMLElement, header: string) {
  const headers = screen
    .getAllByRole("columnheader")
    .map((columnHeader) => columnHeader.textContent);
  return rowCells(row)[headers.indexOf(header)];
}

function enrollmentNamed(name: string) {
  const enrollment = adminCourseWithEveryStudentCase.enrollments.find(
    (candidate) => candidate.customer.name === name,
  );
  if (enrollment === undefined) throw new Error(`No fixture student ${name}`);
  return enrollment;
}

describe("StudentTable", () => {
  it("heads the columns Student, Enrolled, Access, Paid, Payment and Attention", () => {
    render(
      <StudentTable
        enrollments={[adaEnrollment]}
        timeZone="America/New_York"
      />,
    );

    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent),
    ).toEqual([
      "Student",
      "Enrolled",
      "Access",
      "Paid",
      "Payment",
      "Attention",
    ]);
  });

  it("shows name over email, Enrolled, Access, Paid and Payment in one row", () => {
    render(
      <StudentTable
        enrollments={[adaEnrollment]}
        timeZone="America/New_York"
      />,
    );

    const [row] = studentRows();
    expect(
      rowCells(row)
        .slice(0, 5)
        .map((cell) => cell.textContent),
    ).toEqual([
      "Ada Lovelaceada@example.com",
      "Oct 16, 2026",
      "Active",
      "$99",
      "Paid",
    ]);
  });

  it("right-aligns the Paid column and its header with tabular figures", () => {
    render(
      <StudentTable
        enrollments={[adaEnrollment]}
        timeZone="America/New_York"
      />,
    );

    const paidHeader = screen.getByRole("columnheader", { name: "Paid" });
    const [row] = studentRows();
    const paidCell = cellInColumn(row, "Paid");
    expect(paidHeader).toHaveClass("text-right");
    expect(paidCell).toHaveClass("text-right", "tabular-nums");
  });

  it("shows the Free pill and a dash for a free student", () => {
    const noa = enrollmentNamed("Noa Levi");

    render(<StudentTable enrollments={[noa]} timeZone="America/New_York" />);

    const [row] = studentRows();
    expect(within(cellInColumn(row, "Paid")).getByText("Free")).toHaveClass(
      "bg-secondary",
    );
    expect(cellInColumn(row, "Payment")).toHaveTextContent(/^—$/);
  });

  it("lists Dana's failed-email and Refund owed lines in the Attention cell", () => {
    const dana = enrollmentNamed("Dana Cohen");

    render(<StudentTable enrollments={[dana]} timeZone="America/New_York" />);

    const [row] = studentRows();
    const lines = within(cellInColumn(row, "Attention")).getAllByRole(
      "listitem",
    );
    expect(lines.map((line) => line.textContent)).toEqual([
      "Already-enrolled email failed",
      "Refund owed",
    ]);
  });

  it("leaves the Attention cell empty on a row with no lines", () => {
    render(
      <StudentTable
        enrollments={[adaEnrollment]}
        timeZone="America/New_York"
      />,
    );

    const [row] = studentRows();
    expect(cellInColumn(row, "Attention")).toBeEmptyDOMElement();
  });

  it("draws one row per student, in the API's order", () => {
    render(
      <StudentTable
        enrollments={adminCourseWithEveryStudentCase.enrollments}
        timeZone="America/New_York"
      />,
    );

    expect(
      studentRows().map((row) => cellInColumn(row, "Student").textContent),
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
});
