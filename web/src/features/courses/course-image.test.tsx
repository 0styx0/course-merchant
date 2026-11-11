import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";

import { CourseImage } from "./course-image";

const courseId = "0b9a2a3e-6a0e-4a43-9a5b-0f6d6f1c2a11";
const imageVersion = "1700000000000";

describe("CourseImage", () => {
  it("shows the course image through Next's resizer with an empty alt", () => {
    const { container } = render(
      <CourseImage courseId={courseId} imageVersion={imageVersion} />,
    );

    const image = container.querySelector("img");
    expect(image).toHaveAttribute("alt", "");
    expect(screen.queryByRole("img")).toBeNull();
    expect(image?.getAttribute("src")).toMatch(
      new RegExp(
        `^/_next/image\\?url=${encodeURIComponent(`/courses/${courseId}/image/${imageVersion}`)}&`,
      ),
    );
  });

  it("sizes the image to seven grid columns from md and full width below", () => {
    const { container } = render(
      <CourseImage courseId={courseId} imageVersion={imageVersion} />,
    );

    expect(container.querySelector("img")).toHaveAttribute(
      "sizes",
      "(min-width: 768px) 680px, 100vw",
    );
  });
});
