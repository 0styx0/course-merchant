import { render, screen } from "@testing-library/react";
import { Editor, type JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { CourseDescription } from "./course-description";
import { descriptionExtensions } from "./description-extensions";

const text = (value: string, marks?: JSONContent["marks"]): JSONContent => ({
  type: "text",
  text: value,
  ...(marks && { marks }),
});
const paragraph = (...content: JSONContent[]): JSONContent => ({
  type: "paragraph",
  content,
});
const doc = (...content: JSONContent[]): JSONContent => ({
  type: "doc",
  content,
});

describe("CourseDescription", () => {
  it("renders paragraphs, bold, italic and line breaks", () => {
    const { container } = render(
      <CourseDescription
        description={doc(
          paragraph(
            text("Plain "),
            text("bold", [{ type: "bold" }]),
            text(" "),
            text("italic", [{ type: "italic" }]),
            { type: "hardBreak" },
            text("next line"),
          ),
        )}
      />,
    );

    expect(container.querySelector("p")).toContainHTML(
      "Plain <strong>bold</strong> <em>italic</em><br>next line",
    );
  });

  it("renders heading levels 2-4 as the same HTML levels", () => {
    render(
      <CourseDescription
        description={doc(
          ...[2, 3, 4].map((level) => ({
            type: "heading",
            attrs: { level },
            content: [text(`Level ${level}`)],
          })),
        )}
      />,
    );

    for (const level of [2, 3, 4]) {
      expect(
        screen.getByRole("heading", { level, name: `Level ${level}` }),
      ).toBeVisible();
    }
  });

  it("never renders a level 1 heading, the page's h1 is the course name", () => {
    render(
      <CourseDescription
        description={doc({
          type: "heading",
          attrs: { level: 1 },
          content: [text("Title")],
        })}
      />,
    );

    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });

  it("renders bullet and numbered lists, nested", () => {
    render(
      <CourseDescription
        description={doc({
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                paragraph(text("Outer")),
                {
                  type: "orderedList",
                  content: [
                    { type: "listItem", content: [paragraph(text("Inner"))] },
                  ],
                },
              ],
            },
          ],
        })}
      />,
    );

    const lists = screen.getAllByRole("list");
    expect(lists.map((list) => list.tagName)).toEqual(["UL", "OL"]);
    expect(lists[0]).toContainElement(lists[1]);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("renders a link in the same tab", () => {
    render(
      <CourseDescription
        description={doc(
          paragraph(
            text("Docs", [
              { type: "link", attrs: { href: "https://example.com/docs" } },
            ]),
          ),
        )}
      />,
    );

    const link = screen.getByRole("link", { name: "Docs" });
    expect(link).toHaveAttribute("href", "https://example.com/docs");
    expect(link).not.toHaveAttribute("target");
  });

  it("does not follow a javascript: link", () => {
    render(
      <CourseDescription
        description={doc(
          paragraph(
            text("Click", [
              { type: "link", attrs: { href: "javascript:alert(1)" } },
            ]),
          ),
        )}
      />,
    );

    expect(screen.getByText("Click")).not.toHaveAttribute(
      "href",
      expect.stringMatching(/javascript/i),
    );
  });

  it("shows the text of an unknown node and an unknown mark", () => {
    render(
      <CourseDescription
        description={doc(
          { type: "callout", content: [paragraph(text("Inside callout"))] },
          paragraph(text("Marked", [{ type: "sparkle" }])),
        )}
      />,
    );

    expect(screen.getByText("Inside callout")).toBeVisible();
    expect(screen.getByText("Marked")).toBeVisible();
  });

  it("renders what the editor produces, reducing code to text", () => {
    const editor = new Editor({
      extensions: descriptionExtensions,
      content: [
        "<h2>Title</h2>",
        "<h1>Big</h1>",
        "<p><strong>bold</strong> <em>italic</em> <s>struck</s> <u>under</u></p>",
        "<blockquote><p>quoted</p></blockquote>",
        "<hr>",
        "<pre><code>let x</code></pre>",
        '<p><a href="https://example.com">site</a></p>',
        "<ul><li><p>item</p></li></ul>",
      ].join(""),
    });
    const description = editor.getJSON();
    editor.destroy();

    const { container } = render(
      <CourseDescription description={description} />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Title" }),
    ).toBeVisible();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(container.querySelector("strong")).toHaveTextContent("bold");
    expect(container.querySelector("em")).toHaveTextContent("italic");
    expect(container.querySelector("s")).toHaveTextContent("struck");
    expect(container.querySelector("u")).toHaveTextContent("under");
    expect(container.querySelector("blockquote")).toHaveTextContent("quoted");
    expect(container.querySelector("hr")).not.toBeNull();
    expect(container.querySelector("pre, code")).toBeNull();
    expect(screen.getByText(/let x/)).toBeVisible();
    expect(screen.getByRole("link", { name: "site" })).toHaveAttribute(
      "href",
      "https://example.com",
    );
    expect(screen.getByRole("listitem")).toHaveTextContent("item");
  });
});
