import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Input } from "@/components/ui/input";

import { ValidatedField } from "./validated-field";

type HarnessProps = {
  isRequired?: boolean;
  description?: string;
  isSubmitted?: boolean;
};

/** Mimics a form: the field is touched on blur, and is invalid while empty. */
function Harness({
  isRequired = true,
  description,
  isSubmitted = false,
}: HarnessProps) {
  const [value, setValue] = useState("");
  const [isTouched, setIsTouched] = useState(false);
  return (
    <ValidatedField
      label="Course name"
      description={description}
      error={isRequired && !value ? "Enter a course name." : undefined}
      isTouched={isTouched}
      isSubmitted={isSubmitted}
    >
      {(inputProps) => (
        <Input
          {...inputProps}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => setIsTouched(true)}
        />
      )}
    </ValidatedField>
  );
}

describe("ValidatedField", () => {
  it("shows the message and marks the input invalid once the empty field loses focus", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByLabelText("Course name"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await user.tab();
    const input = screen.getByLabelText("Course name");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a course name.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Enter a course name.");
    expect(
      screen.getByRole("img", { name: "Needs a fix" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: "Looks good" }),
    ).not.toBeInTheDocument();
    expect(input).toHaveAccessibleName("Course name");
  });

  it("shows a check once a touched field is valid, and clears the message while typing", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByLabelText("Course name"));
    await user.tab();
    await user.type(screen.getByLabelText("Course name"), "Cooking");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Course name")).toHaveAttribute(
      "aria-invalid",
      "false",
    );
    expect(screen.getByRole("img", { name: "Looks good" })).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: "Needs a fix" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Course name")).toHaveAccessibleName(
      "Course name",
    );
  });

  it("shows nothing for an untouched field", () => {
    render(<Harness />);

    expect(screen.getByLabelText("Course name")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("keeps a fixed slot for the status icon before an error appears and after it clears", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const slotSelector = '[data-slot="status-icon"]';

    expect(document.querySelector(slotSelector)).toBeInTheDocument();
    expect(document.querySelector(slotSelector)).toBeEmptyDOMElement();

    await user.click(screen.getByLabelText("Course name"));
    await user.tab();
    expect(document.querySelector(slotSelector)).toContainElement(
      screen.getByRole("img", { name: "Needs a fix" }),
    );

    await user.type(screen.getByLabelText("Course name"), "Cooking");
    expect(document.querySelectorAll(slotSelector)).toHaveLength(1);
    expect(document.querySelector(slotSelector)).toContainElement(
      screen.getByRole("img", { name: "Looks good" }),
    );
  });

  it("shows the problem on an untouched field after the form was submitted", () => {
    render(<Harness isSubmitted />);

    expect(screen.getByRole("alert")).toHaveTextContent("Enter a course name.");
    expect(screen.getByLabelText("Course name")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(
      screen.getByRole("img", { name: "Needs a fix" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: "Looks good" }),
    ).not.toBeInTheDocument();
  });

  it("describes the input by the help text, and by the message as well when invalid", async () => {
    const user = userEvent.setup();
    render(<Harness description="Shown on the course card." />);

    const input = screen.getByLabelText("Course name");
    expect(input).toHaveAccessibleDescription("Shown on the course card.");

    await user.click(input);
    await user.tab();
    expect(input).toHaveAccessibleDescription(
      "Shown on the course card. Enter a course name.",
    );
  });

  it("calls onLabelClick when the label is clicked", async () => {
    const user = userEvent.setup();
    const onLabelClick = vi.fn();
    render(
      <ValidatedField
        label="Description"
        isTouched={false}
        isSubmitted={false}
        onLabelClick={onLabelClick}
      >
        {({ labelId }) => <div role="textbox" aria-labelledby={labelId} />}
      </ValidatedField>,
    );

    await user.click(screen.getByText("Description"));
    expect(onLabelClick).toHaveBeenCalledOnce();
    expect(screen.getByRole("textbox")).toHaveAccessibleName("Description");
  });
});
