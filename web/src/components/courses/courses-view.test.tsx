import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CoursesLoading, CoursesView } from "./courses-view";
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

describe("CoursesView", () => {
    
  it("renders the loading state", () => {
    render(<CoursesLoading />);

    expect(
      screen.getByRole("heading", { name: "Courses" })
    ).toBeInTheDocument();

    expect(screen.getByText("Loading courses...")).toBeInTheDocument();

    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("renders the error state", () => {
    render(
      <CoursesView
        result={{
          state: "failure",
          error: "unavailable",
        }}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Courses" })
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "We couldn't load the courses right now. Please try again later."
      )
    ).toBeInTheDocument();

    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("renders the empty state when there are no courses", () => {
    render(
      <CoursesView
        result={{
          state: "success",
          data: {
            courses: [],
          },
        }}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Courses" })
    ).toBeInTheDocument();

    expect(
      screen.getByText("Check back later for new courses.")
    ).toBeInTheDocument();

    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("renders the available courses", () => {
    render(
      <CoursesView
        result={{
          state: "success",
          data: {
            courses: [
              course,
              {
                ...course,
                name: "Advanced TypeScript",
              },
            ],
          },
        }}
      />
    );

    const courses = screen.getByRole("region", { name: "Courses" });
    const cards = within(courses).getAllByRole("article");

    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent("React Fundamentals");
    expect(cards[1]).toHaveTextContent("Advanced TypeScript");
  });
});
