import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";

import { reactCourse } from "@/mocks/fixtures/courses";
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

    expect(screen.getByRole("button", { name: "Enroll now" })).toBeVisible();
  });

  it("shows no price, schedule or enrollment count of its own", () => {
    render(<CourseDetails course={course}>{buyBlock}</CourseDetails>);

    expect(screen.queryByText("12 enrolled")).not.toBeInTheDocument();
    expect(screen.queryByText("$99")).not.toBeInTheDocument();
    expect(screen.queryByText("America/New_York")).not.toBeInTheDocument();
  });

  it("puts the buy block before the description in the page source", () => {
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

  it("shows the summary in the muted text colour", () => {
    render(<CourseDetails course={course}>{buyBlock}</CourseDetails>);

    expect(screen.getByText(course.summary)).toHaveClass(
      "text-muted-foreground",
    );
  });
});
