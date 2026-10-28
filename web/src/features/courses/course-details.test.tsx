import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";

import { formatPrice } from "@/lib/utils/formatters";
import { reactCourse } from "@/mocks/fixtures/courses";
import { CourseDetails } from "./course-details";

const course = reactCourse;

describe("CourseDetails", () => {
  it("displays the course details", () => {
    render(<CourseDetails course={course} />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "React Fundamentals",
      }),
    ).toBeVisible();

    expect(screen.getByText(course.summary)).toBeVisible();

    expect(
      screen.getByRole("heading", { level: 2, name: "What you will build" }),
    ).toBeVisible();
    expect(screen.getByText("Three small apps")).toBeVisible();
    expect(screen.getByRole("link", { name: "React docs" })).toHaveAttribute(
      "href",
      "https://react.dev",
    );

    expect(screen.getByText(formatPrice(9900, "USD"))).toBeVisible();

    expect(screen.getByText("Oct 1, 2026, 2:00 PM")).toHaveAttribute(
      "datetime",
      "2026-10-01T18:00:00Z",
    );
    expect(screen.getByText("Oct 1, 2026, 4:00 PM")).toHaveAttribute(
      "datetime",
      "2026-10-01T20:00:00Z",
    );

    expect(screen.getByText("America/New_York")).toBeVisible();
    expect(screen.getByText("12 enrolled")).toBeVisible();
  });

  it("displays zero enrollment and formats other currencies", () => {
    render(
      <CourseDetails
        course={{
          ...course,
          enrollmentCount: 0,
          price: { amount: 1250, currency: "EUR" },
        }}
      />,
    );

    expect(screen.getByText("0 enrolled")).toBeVisible();
    expect(screen.getByText(formatPrice(1250, "EUR"))).toBeVisible();
  });
});
