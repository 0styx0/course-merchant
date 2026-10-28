import type { Course } from "@/lib/types";

const paragraphDoc = (text: string) => ({
  type: "doc" as const,
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

// Exercises each kind of formatting the page renders
const reactDescription = {
  type: "doc" as const,
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "What you will build" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Components, hooks and " },
        { type: "text", text: "state", marks: [{ type: "bold" }] },
        { type: "text", text: ", from the ground up." },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Three small apps" }],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Read the " },
                {
                  type: "text",
                  text: "React docs",
                  marks: [
                    { type: "link", attrs: { href: "https://react.dev" } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

/** Sample courses shared by the MSW handlers, Vitest and the browser tests. */
export const reactCourse = {
  id: "0b8f2d2a-5c1e-4f6b-9a37-1d2c3e4f5a61",
  name: "React Fundamentals",
  summary: "Learn React",
  description: reactDescription,
  enrollmentCount: 12,
  image: { version: "1790856000000" },
  price: {
    amount: 9900,
    currency: "USD",
  },
  schedule: {
    startTime: "2026-10-01T18:00:00Z",
    endTime: "2026-10-01T20:00:00Z",
    timeZone: "America/New_York",
  },
} as const satisfies Course;

export const typescriptCourse = {
  id: "7c4e9a10-3b2d-4e8f-b6a5-9f8e7d6c5b42",
  name: "Advanced TypeScript",
  summary: "Build robust applications with TypeScript",
  description: paragraphDoc(
    "Generics, conditional types and type-safe APIs in practice.",
  ),
  enrollmentCount: 37,
  image: { version: "1790856000000" },
  price: {
    amount: 14900,
    currency: "USD",
  },
  schedule: {
    startTime: "2026-10-02T22:00:00Z",
    endTime: "2026-10-03T00:00:00Z",
    timeZone: "America/New_York",
  },
} as const satisfies Course;
