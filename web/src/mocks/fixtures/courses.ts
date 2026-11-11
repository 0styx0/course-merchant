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

const textNode = (text: string) => ({ type: "text", text });
const paragraphNode = (text: string) => ({
  type: "paragraph",
  content: [textNode(text)],
});
const headingNode = (level: number, text: string) => ({
  type: "heading",
  attrs: { level },
  content: [textNode(text)],
});
const listNode = (type: "bulletList" | "orderedList", items: string[]) => ({
  type,
  content: items.map((item) => ({
    type: "listItem",
    content: [paragraphNode(item)],
  })),
});

// Exercises every node the description editor can produce, with enough text
// to make the description far taller than a screen.
const longDescription = {
  type: "doc" as const,
  content: [
    headingNode(2, "Why this course exists"),
    paragraphNode(
      "Most people learn to sit still by trying harder, and trying harder is the opposite of stillness. This course teaches the other way, one small practice at a time.",
    ),
    paragraphNode(
      "Each week starts with a short talk, continues with a guided practice and ends with a written reflection you keep for yourself.",
    ),
    headingNode(3, "What each week covers"),
    listNode("bulletList", [
      "Posture and breath",
      "Sensation without story",
      "Working with restlessness",
    ]),
    headingNode(4, "How to prepare"),
    listNode("orderedList", [
      "Find a quiet corner",
      "Set a timer for ten minutes",
      "Sit down before you feel ready",
    ]),
    {
      type: "blockquote",
      content: [
        paragraphNode("Nothing to add, nothing to remove, nothing to fix."),
      ],
    },
    { type: "horizontalRule" },
    headingNode(2, "Who teaches it"),
    {
      type: "paragraph",
      content: [
        textNode("Read the teacher's "),
        {
          type: "text",
          text: "notes on practice",
          marks: [
            { type: "link", attrs: { href: "https://example.com/notes" } },
          ],
        },
        textNode(" before the first session."),
      ],
    },
    paragraphNode(
      "The group meets online, and every session has a recording for anyone who cannot attend live.",
    ),
    paragraphNode(
      "Questions arrive by email before each session, and the teacher answers the most common ones at the start of the next talk.",
    ),
    paragraphNode(
      "By the last week, most students sit for thirty minutes without checking the clock.",
    ),
  ],
};

// The image version is a cache-busting stamp (milliseconds since 1970) the
// page adds to the image URL; its value matters to no test and has no link
// to the course dates.
const sampleImageVersion = "1790856000000";

/** Sample courses shared by the MSW handlers, Vitest and the browser tests. */
export const reactCourse = {
  id: "0b8f2d2a-5c1e-4f6b-9a37-1d2c3e4f5a61",
  name: "React Fundamentals",
  summary: "Learn React",
  description: reactDescription,
  enrollmentCount: 12,
  image: { version: sampleImageVersion },
  price: {
    amount: 9900,
    currency: "USD",
  },
  schedule: {
    startTime: "2030-10-01T18:00:00Z",
    endTime: "2030-10-01T20:00:00Z",
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
  image: { version: sampleImageVersion },
  price: {
    amount: 14900,
    currency: "USD",
  },
  schedule: {
    startTime: "2030-10-02T22:00:00Z",
    endTime: "2030-10-03T00:00:00Z",
    timeZone: "America/New_York",
  },
} as const satisfies Course;

export const freeCourse = {
  id: "d3a1f6e8-2c47-4b90-8e15-6a7b8c9d0e13",
  name: "Mindful Breathing",
  summary: "Five calm minutes a day",
  description: paragraphDoc("Simple breathing practices you can do anywhere."),
  enrollmentCount: 0,
  image: { version: sampleImageVersion },
  price: {
    amount: 0,
    currency: "USD",
  },
  schedule: {
    startTime: "2030-10-03T18:00:00Z",
    endTime: "2030-10-03T20:00:00Z",
    timeZone: "America/New_York",
  },
} as const satisfies Course;

export const longCourse = {
  id: "5e9b3c70-8a14-4d2f-a6c3-0b1d2e3f4a85",
  name: "Supercalifragilisticexpialidocious Contemplative Practice for Absolutely Everyone",
  summary: "A slow, patient introduction to sitting still",
  description: longDescription,
  enrollmentCount: 5,
  image: { version: sampleImageVersion },
  price: {
    amount: 19900,
    currency: "USD",
  },
  schedule: {
    startTime: "2030-11-04T18:00:00Z",
    endTime: "2030-11-04T20:00:00Z",
    timeZone: "America/New_York",
  },
} as const satisfies Course;

export const inProgressCourse = {
  id: "a4c8e2f6-1b39-4d75-9e0a-3f5b7d9c1e24",
  name: "Rust for Busy Developers",
  summary: "A started course that still takes enrollments",
  description: paragraphDoc("Ownership, borrowing and lifetimes in practice."),
  enrollmentCount: 12,
  image: { version: sampleImageVersion },
  price: {
    amount: 12900,
    currency: "USD",
  },
  schedule: {
    startTime: "2020-01-01T00:00:00Z",
    endTime: "2040-12-01T00:00:00Z",
    timeZone: "America/New_York",
  },
} as const satisfies Course;

export const endedCourse = {
  id: "c7d1f3a9-5e28-4b60-8a14-9d2e6f0b3c57",
  name: "Intro to Go",
  summary: "A finished course that no longer takes enrollments",
  description: paragraphDoc("Goroutines, channels and the standard library."),
  enrollmentCount: 30,
  image: { version: sampleImageVersion },
  price: {
    amount: 9900,
    currency: "USD",
  },
  schedule: {
    startTime: "2025-09-01T18:00:00Z",
    endTime: "2025-09-01T20:00:00Z",
    timeZone: "America/New_York",
  },
} as const satisfies Course;

export const publicCourses = [
  reactCourse,
  typescriptCourse,
  freeCourse,
  longCourse,
  inProgressCourse,
];
