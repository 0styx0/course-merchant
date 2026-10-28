import { render, screen, waitFor } from "@testing-library/react";
import type { JSONContent } from "@tiptap/core";
import { describe, expect, it, vi } from "vitest";

import { DescriptionEditor } from "./description-editor";

const emptyDocument: JSONContent = { type: "doc", content: [] };

function documentWithText(text: string): JSONContent {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

function renderEditor(
  props: Partial<React.ComponentProps<typeof DescriptionEditor>> = {},
) {
  return render(
    <DescriptionEditor
      value={emptyDocument}
      onChange={vi.fn()}
      onBlur={vi.fn()}
      fieldRef={vi.fn()}
      touched={false}
      submitted={false}
      {...props}
    />,
  );
}

describe("DescriptionEditor", () => {
  it("is a textbox named by its label and described by the counter", async () => {
    renderEditor();

    const textbox = await screen.findByRole("textbox", { name: "Description" });
    expect(textbox).toHaveAttribute("aria-multiline", "true");
    expect(textbox).toHaveAttribute("aria-invalid", "false");
    expect(textbox).toHaveAccessibleDescription("0 / 5,000");
  });

  it("shows the stored text and counts it with a thousands separator", async () => {
    renderEditor({ value: documentWithText("a".repeat(1234)) });

    const textbox = await screen.findByRole("textbox", { name: "Description" });
    expect(textbox).toHaveTextContent("a".repeat(1234));
    expect(textbox).toHaveAccessibleDescription("1,234 / 5,000");
  });

  it("marks the counter red past the limit", async () => {
    renderEditor({ value: documentWithText("a".repeat(5001)) });

    expect(await screen.findByText("5,001 / 5,000")).toHaveClass(
      "text-destructive",
    );
  });

  it("shows the error and marks the textbox invalid once touched", async () => {
    renderEditor({ error: "Enter a description.", touched: true });

    const textbox = await screen.findByRole("textbox", { name: "Description" });
    expect(textbox).toHaveAttribute("aria-invalid", "true");
    expect(textbox).toHaveAccessibleDescription(
      expect.stringContaining("Enter a description."),
    );
  });

  it("gives react-hook-form a handle that focuses the editor", async () => {
    const fieldRef = vi.fn();
    renderEditor({ fieldRef });

    const textbox = await screen.findByRole("textbox", { name: "Description" });
    fieldRef.mock.calls.at(-1)?.[0]?.focus();
    await waitFor(() => expect(textbox).toHaveFocus());
  });
});
