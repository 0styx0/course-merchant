import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";

import type { GetCourseResult } from "@/lib/api/course.get";
import { formatDate, formatPrice } from "@/lib/utils/formatters";
import { reactCourse } from "@/mocks/fixtures/courses";
import { CourseDetailsView } from "./course-details-view";

const course = reactCourse;

describe("CourseDetailsView", () => {
  it("displays the course details", () => {
    const result = {
      state: "success",
      data: course,
    } satisfies GetCourseResult;

    render(<CourseDetailsView result={result} />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "React Fundamentals",
      }),
    ).toBeVisible();

    expect(screen.getByText(course.description)).toBeVisible();

    expect(screen.getByText(formatPrice(9900, "USD"))).toBeVisible();

    const dateFormatter = formatDate("America/New_York");
    const formattedStart = dateFormatter.format(
      new Date("2026-10-01T14:00:00-04:00"),
    );
    const formattedEnd = dateFormatter.format(
      new Date("2026-10-01T16:00:00-04:00"),
    );

    const startTime = screen.getByText(formattedStart);
    const endTime = screen.getByText(formattedEnd);

    expect(startTime).toHaveAttribute("datetime", "2026-10-01T14:00:00-04:00");
    expect(endTime).toHaveAttribute("datetime", "2026-10-01T16:00:00-04:00");

    expect(screen.getByText("America/New_York")).toBeVisible();
    expect(screen.getByText("12 enrolled")).toBeVisible();
  });

  it("displays zero enrollment and formats other currencies", () => {
    const result = {
      state: "success",
      data: {
        ...course,
        enrollmentCount: 0,
        price: {
          amount: 1250,
          currency: "EUR",
        },
      },
    } satisfies GetCourseResult;

    render(<CourseDetailsView result={result} />);

    expect(screen.getByText("0 enrolled")).toBeVisible();
    expect(screen.getByText(formatPrice(1250, "EUR"))).toBeVisible();
  });

  it("displays an error when loading the course fails", () => {
    const result = {
      state: "failure",
      error: {
        title: "Internal server error",
        detail: "An unexpected error occurred.",
        code: "INTERNAL_SERVER_ERROR",
      },
    } satisfies GetCourseResult;

    render(<CourseDetailsView result={result} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Internal server error",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "An unexpected error occurred.",
    );

    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();

    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });
});
