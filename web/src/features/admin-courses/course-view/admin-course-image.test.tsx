import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdminCourseImage } from "./admin-course-image";

describe("AdminCourseImage", () => {
  it("loads a stored image from the admin image route as given", () => {
    const { container } = render(
      <AdminCourseImage
        courseId="c1"
        image={{ updatedAt: "2026-10-16T09:00:00Z", version: "42" }}
      />,
    );

    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "/admin/courses/c1/image?v=42",
    );
  });

  it("shows an empty 16:9 box when the course has no image", () => {
    const { container } = render(
      <AdminCourseImage courseId="c1" image={null} />,
    );

    expect(container.querySelector("img")).toBeNull();
    expect(container.firstElementChild).toHaveClass("aspect-video");
  });
});
