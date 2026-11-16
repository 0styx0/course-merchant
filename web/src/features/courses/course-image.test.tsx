import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";

import { CourseImage } from "./course-image";

// Any address works; the caller chooses it.
const imageSrc = "/any/course/image.png";

describe("CourseImage", () => {
  it("shows the image at the given address through Next's resizer with an empty alt", () => {
    const { container } = render(<CourseImage src={imageSrc} />);

    const image = container.querySelector("img");
    expect(image).toHaveAttribute("alt", "");
    expect(screen.queryByRole("img")).toBeNull();
    expect(image?.getAttribute("src")).toMatch(
      new RegExp(`^/_next/image\\?url=${encodeURIComponent(imageSrc)}&`),
    );
  });

  it("sizes the image to seven grid columns from md and full width below", () => {
    const { container } = render(<CourseImage src={imageSrc} />);

    expect(container.querySelector("img")).toHaveAttribute(
      "sizes",
      "(min-width: 768px) 631px, 100vw",
    );
  });
});
