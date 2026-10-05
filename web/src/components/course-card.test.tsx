import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CourseCard } from "./course-card";
import type { Course } from "@/lib/api/courses";

const course: Course = {
  name: "React Fundamentals",
  description: "Learn React",
  enrollmentCount: 12,
  price: {
    amount: 9900,
    currency: "USD",
  },
  schedule: {
    startTime: "2026-10-01T14:00:00-04:00",
    endTime: "2026-10-01T16:00:00-04:00",
    timeZone: "America/New_York",
  },
};

describe("CourseCard", () => {
  it("renders the course information", () => {
    render(<CourseCard course={course} />);

    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "React Fundamentals",
      }),
    ).toBeInTheDocument();

    expect(screen.getByText("Learn React")).toBeInTheDocument();

    expect(screen.getByText("$99.00")).toBeInTheDocument();

    expect(
      screen.getByText("2026-10-01T14:00:00-04:00"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("2026-10-01T16:00:00-04:00"),
    ).toBeInTheDocument();

    expect(screen.getByText("America/New_York")).toBeInTheDocument();

    expect(screen.getByText("12 students enrolled")).toBeInTheDocument();
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