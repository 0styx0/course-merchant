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
        }}
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Course not found");
    expect(alert).toHaveTextContent("No course exists with that ID.");
  });

  it("draws a 1px destructive border with the guide's title and detail colours", () => {
    render(
      <ProblemAlert
        problem={{ title: "Course not found", detail: "No such course." }}
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass(
      "border",
      "border-destructive",
      "rounded-lg",
      "p-4",
    );
    expect(screen.getByText("Course not found")).toHaveClass(
      "text-foreground",
      "font-medium",
    );
    expect(screen.getByText("No such course.")).toHaveClass(
      "text-muted-foreground",
    );
  });
});
