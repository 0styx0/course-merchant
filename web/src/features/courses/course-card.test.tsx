import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CourseCard } from "./course-card";
import { reactCourse } from "@/mocks/fixtures/courses";

const course = reactCourse;

describe("CourseCard", () => {
  it("renders the course information", () => {
    render(<CourseCard course={course} />);

    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "React Fundamentals",
      }),
    ).toBeInTheDocument();

    expect(screen.getByText(course.summary)).toBeInTheDocument();
    expect(screen.queryByText("What you will build")).not.toBeInTheDocument();

    expect(screen.getByText("$99.00")).toBeInTheDocument();

    expect(screen.getByText("Oct 1, 2026, 2:00 PM")).toHaveAttribute(
      "datetime",
      "2026-10-01T18:00:00Z",
    );

    expect(screen.getByText("Oct 1, 2026, 4:00 PM")).toHaveAttribute(
      "datetime",
      "2026-10-01T20:00:00Z",
    );

    expect(screen.getByText("America/New_York")).toBeInTheDocument();

    expect(screen.getByText("12 students enrolled")).toBeInTheDocument();
  });

  it("links the course name to its page", () => {
    render(<CourseCard course={course} />);

    expect(
      screen.getByRole("link", { name: "React Fundamentals" }),
    ).toHaveAttribute("href", `/courses/${course.id}`);
  });

  it("uses singular language for one enrollment", () => {
    render(
      <CourseCard
        course={{
          ...course,
          enrollmentCount: 1,
        }}
      />,
    );

    expect(screen.getByText("1 student enrolled")).toBeInTheDocument();
  });

  it("uses plural language for zero enrollments", () => {
    render(
      <CourseCard
        course={{
          ...course,
          enrollmentCount: 0,
        }}
      />,
    );

    expect(screen.getByText("0 students enrolled")).toBeInTheDocument();
  });

  it("uses the course currency when formatting the price", () => {
    render(
      <CourseCard
        course={{
          ...course,
          price: {
            amount: 12550,
            currency: "EUR",
          },
        }}
      />,
    );

    expect(screen.getByText("€125.50")).toBeInTheDocument();
  });
});
