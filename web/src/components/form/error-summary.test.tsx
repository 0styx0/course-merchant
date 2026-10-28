import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { ErrorSummary } from "./error-summary";

const problems = [
  { fieldName: "name", label: "Course name", message: "Enter a course name." },
  { fieldName: "description", label: "Description", message: "Too long." },
  { fieldName: "summary", label: "Summary", message: "Enter a summary." },
];

describe("ErrorSummary", () => {
  it("renders nothing without problems", () => {
    const { container } = render(
      <ErrorSummary problems={[]} onSelectField={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("counts the problems in the heading", () => {
    render(<ErrorSummary problems={problems} onSelectField={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: "Fix 3 problems before saving" }),
    ).toBeInTheDocument();
  });

  it("uses the singular for one problem", () => {
    render(
      <ErrorSummary problems={problems.slice(0, 1)} onSelectField={vi.fn()} />,
    );

    expect(
      screen.getByRole("heading", { name: "Fix 1 problem before saving" }),
    ).toBeInTheDocument();
  });

  it("lists each problem's message beside a link to its field", () => {
    render(<ErrorSummary problems={problems} onSelectField={vi.fn()} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText(/Enter a course name\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Summary" })).toBeInTheDocument();
  });

  it("tells the caller which field was selected", async () => {
    const onSelectField = vi.fn();
    render(<ErrorSummary problems={problems} onSelectField={onSelectField} />);

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Description" }));

    expect(onSelectField).toHaveBeenCalledWith("description");
  });

  it("shows the server's title and detail", () => {
    render(
      <ErrorSummary
        problems={[]}
        serverProblem={{ title: "Unauthorized", detail: "Sign in first." }}
        onSelectField={vi.fn()}
      />,
    );

    expect(screen.getByText("Unauthorized")).toBeInTheDocument();
    expect(screen.getByText("Sign in first.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("can be focused through its ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ErrorSummary ref={ref} problems={problems} onSelectField={vi.fn()} />,
    );

    ref.current?.focus();

    expect(screen.getByRole("alert")).toHaveFocus();
  });

  it("drops a problem from the list once it is fixed", () => {
    const { rerender } = render(
      <ErrorSummary problems={problems} onSelectField={vi.fn()} />,
    );

    rerender(
      <ErrorSummary problems={problems.slice(1)} onSelectField={vi.fn()} />,
    );

    expect(
      screen.queryByRole("button", { name: "Course name" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading")).toHaveTextContent("Fix 2 problems");
  });
});
