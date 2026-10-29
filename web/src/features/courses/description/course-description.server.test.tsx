// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CourseDescription } from "./course-description";

describe("CourseDescription on the server", () => {
  it("renders to HTML without a browser", () => {
    const html = renderToStaticMarkup(
      <CourseDescription
        description={{
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Hello " },
                { type: "text", text: "world", marks: [{ type: "bold" }] },
              ],
            },
          ],
        }}
      />,
    );

    expect(html).toBe(
      '<div class="description-content"><p>Hello <strong>world</strong></p></div>',
    );
  });
});
