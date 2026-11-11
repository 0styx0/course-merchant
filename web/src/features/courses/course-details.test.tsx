import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";

import { freeCourse, reactCourse } from "@/mocks/fixtures/courses";
import { CourseDetails } from "./course-details";

const course = reactCourse;
const buyBlock = <button type="button">Enroll now</button>;

describe("CourseDetails", () => {
  it("displays the course details", () => {
    render(<CourseDetails course={course}>{buyBlock}</CourseDetails>);

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

    expect(screen.getByText("$99")).toBeVisible();

    expect(screen.getByText("Oct 1, 2030, 2:00 PM")).toHaveAttribute(
      "datetime",
      "2030-10-01T18:00:00Z",
    );
    expect(screen.getByText("Oct 1, 2030, 4:00 PM")).toHaveAttribute(
      "datetime",
      "2030-10-01T20:00:00Z",
    );

    expect(screen.getByText("America/New_York")).toBeVisible();
    expect(screen.getByText("12 enrolled")).toBeVisible();
    expect(screen.getByRole("button", { name: "Enroll now" })).toBeVisible();
  });

  it("places the details and the buy block before the description", () => {
    render(<CourseDetails course={course}>{buyBlock}</CourseDetails>);

    const description = screen.getByRole("heading", {
      level: 2,
      name: "What you will build",
    });
    const isAfterDescription = (element: HTMLElement) =>
      Boolean(
        description.compareDocumentPosition(element) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      );

    expect(isAfterDescription(screen.getByText("Price"))).toBe(false);
    expect(
      isAfterDescription(screen.getByRole("button", { name: "Enroll now" })),
    ).toBe(false);
  });

  it("shows the course image before the title", () => {
    const { container } = render(
      <CourseDetails course={course}>{buyBlock}</CourseDetails>,
    );

    const [image, title] = container.querySelectorAll("img, h1");
    expect(image.tagName).toBe("IMG");
    expect(title).toBe(screen.getByRole("heading", { level: 1 }));
  });

  it("displays zero enrollment and formats other currencies", () => {
    render(
      <CourseDetails
        course={{
          ...course,
          enrollmentCount: 0,
          price: { amount: 1250, currency: "EUR" },
        }}
      >
        {buyBlock}
      </CourseDetails>,
    );

    expect(screen.getByText("0 enrolled")).toBeVisible();
    expect(screen.getByText("€12.50")).toBeVisible();
  });

  it("shows the summary in the muted text colour", () => {
    render(<CourseDetails course={course}>{buyBlock}</CourseDetails>);

    expect(screen.getByText(course.summary)).toHaveClass(
      "text-muted-foreground",
    );
  });

  it("shows Free for a course that costs nothing", () => {
    render(<CourseDetails course={freeCourse}>{buyBlock}</CourseDetails>);

    expect(screen.getByText("Free")).toBeVisible();
  });
});
