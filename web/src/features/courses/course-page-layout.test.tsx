import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";

import { reactCourse } from "@/mocks/fixtures/courses";
import { CoursePageLayout } from "./course-page-layout";
import { CourseImage } from "./course-image";

const course = reactCourse;
const imageSrc = "/given-image.png";
const image = <CourseImage src={imageSrc} />;
const buyBlock = <button type="button">Enroll now</button>;

function renderCoursePageLayout() {
  return render(
    <CoursePageLayout
      image={image}
      name={course.name}
      summary={course.summary}
      description={course.description}
    >
      {buyBlock}
    </CoursePageLayout>,
  );
}

describe("CoursePageLayout", () => {
  it("displays the course details", () => {
    renderCoursePageLayout();

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
    renderCoursePageLayout();

    expect(screen.queryByText("12 enrolled")).not.toBeInTheDocument();
    expect(screen.queryByText("$99")).not.toBeInTheDocument();
    expect(screen.queryByText("America/New_York")).not.toBeInTheDocument();
  });

  it("puts the buy block before the description in the page source", () => {
    renderCoursePageLayout();

    const description = screen.getByRole("heading", {
      level: 2,
      name: "What you will build",
    });
    const isBeforeDescription = (element: HTMLElement) =>
      Boolean(
        description.compareDocumentPosition(element) &
        Node.DOCUMENT_POSITION_PRECEDING,
      );

    expect(
      isBeforeDescription(screen.getByRole("button", { name: "Enroll now" })),
    ).toBe(true);
  });

  it("shows the image it was given before the title", () => {
    const { container } = renderCoursePageLayout();

    const [firstElement, title] = container.querySelectorAll("img, h1");
    expect(firstElement.getAttribute("src")).toContain(
      encodeURIComponent(imageSrc),
    );
    expect(title).toBe(screen.getByRole("heading", { level: 1 }));
  });

  it("shows the summary in the muted text colour", () => {
    renderCoursePageLayout();

    expect(screen.getByText(course.summary)).toHaveClass(
      "text-muted-foreground",
    );
  });
});
