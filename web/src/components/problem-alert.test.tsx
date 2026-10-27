import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProblemAlert } from "./problem-alert";

describe("ProblemAlert", () => {
  it("shows the title and detail in an alert", () => {
    render(
      <ProblemAlert
        problem={{
          title: "Course not found",
          detail: "No course exists with that ID.",
          code: "COURSE_NOT_FOUND",
        }}
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Course not found");
    expect(alert).toHaveTextContent("No course exists with that ID.");
  });
});
