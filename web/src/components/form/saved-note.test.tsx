import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SavedNote } from "./saved-note";

describe("SavedNote", () => {
  it("shows the note as a status", () => {
    render(<SavedNote note="Saved as a draft" />);

    expect(screen.getByRole("status")).toHaveTextContent("Saved as a draft");
  });

  it("renders nothing without a note", () => {
    const { container } = render(<SavedNote note={undefined} />);

    expect(container).toBeEmptyDOMElement();
  });
});
