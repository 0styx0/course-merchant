import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CoursesLoading, CoursesView } from "./courses-view";
import { reactCourse, typescriptCourse } from "@/mocks/fixtures/courses";

describe("CoursesView", () => {
  it("renders the loading state", () => {
    render(<CoursesLoading />);

    expect(
      screen.getByRole("heading", { name: "Courses" }),
    ).toBeInTheDocument();

    expect(screen.getByText("Loading courses...")).toBeInTheDocument();

    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("renders the empty state when there are no courses", () => {
    render(<CoursesView courses={[]} />);

    expect(
      screen.getByRole("heading", { name: "Courses" }),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Check back later for new courses."),
    ).toBeInTheDocument();

    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("renders the available courses", () => {
    render(<CoursesView courses={[reactCourse, typescriptCourse]} />);

    const courses = screen.getByRole("region", { name: "Courses" });
    const cards = within(courses).getAllByRole("article");

    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent("React Fundamentals");
    expect(cards[1]).toHaveTextContent("Advanced TypeScript");
  });
});
