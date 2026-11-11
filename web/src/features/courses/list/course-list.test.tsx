import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CourseListLoading, CourseList } from "./course-list";
import { publicCourses } from "@/mocks/fixtures/courses";

describe("CourseList", () => {
  it("renders the loading state", () => {
    render(<CourseListLoading />);

    expect(
      screen.getByRole("heading", { name: "Courses" }),
    ).toBeInTheDocument();

    expect(screen.getByText("Loading courses...")).toBeInTheDocument();

    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("renders the empty state when there are no courses", () => {
    render(<CourseList courses={[]} />);

    expect(
      screen.getByRole("heading", { name: "Courses" }),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Check back later for new courses."),
    ).toBeInTheDocument();

    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("renders the available courses", () => {
    render(<CourseList courses={publicCourses} />);

    const courses = screen.getByRole("region", { name: "Courses" });
    const cards = within(courses).getAllByRole("article");

    expect(cards).toHaveLength(5);
    expect(cards[0]).toHaveTextContent("React Fundamentals");
    expect(cards[1]).toHaveTextContent("Advanced TypeScript");
    expect(cards[2]).toHaveTextContent("Mindful Breathing");
    expect(cards[3]).toHaveTextContent(
      "Supercalifragilisticexpialidocious Contemplative Practice for Absolutely Everyone",
    );
  });
});
