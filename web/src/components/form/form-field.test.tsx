import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Input } from "@/components/ui/input";

import { FormField } from "./form-field";

type HarnessProps = {
  required?: boolean;
  description?: string;
  submitted?: boolean;
};

/** Mimics a form: the field is touched on blur, and is invalid while empty. */
function Harness({
  required = true,
  description,
  submitted = false,
}: HarnessProps) {
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);
  return (
    <FormField
      label="Course name"
      description={description}
      error={required && !value ? "Enter a course name." : undefined}
      touched={touched}
      submitted={submitted}
    >
      {(inputProps) => (
        <Input
          {...inputProps}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => setTouched(true)}
        />
      )}
    </FormField>
  );
}

describe("FormField", () => {
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
    expect(document.querySelector(".lucide-x")).toBeInTheDocument();
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
    expect(document.querySelector(".lucide-check")).toBeInTheDocument();
    expect(document.querySelector(".lucide-x")).not.toBeInTheDocument();
  });

  it("shows nothing for an untouched field", () => {
    render(<Harness />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(document.querySelector("svg")).not.toBeInTheDocument();
  });

  it("shows the problem on an untouched field after the form was submitted", () => {
    render(<Harness submitted />);

    expect(screen.getByRole("alert")).toHaveTextContent("Enter a course name.");
    expect(screen.getByLabelText("Course name")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
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
      <FormField
        label="Description"
        touched={false}
        submitted={false}
        onLabelClick={onLabelClick}
      >
        {({ labelId }) => <div role="textbox" aria-labelledby={labelId} />}
      </FormField>,
    );

    await user.click(screen.getByText("Description"));
    expect(onLabelClick).toHaveBeenCalledOnce();
    expect(screen.getByRole("textbox")).toHaveAccessibleName("Description");
  });
});
