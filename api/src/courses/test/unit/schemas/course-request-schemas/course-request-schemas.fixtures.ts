import { Temporal } from "@js-temporal/polyfill";
import { expect } from "vitest";

import { descriptionDoc } from "@/test/course-fixtures.js";
import { createCourseRequestSchema } from "@/courses/validation/course-request-schemas.js";

export type CourseRequestInput = {
  name: string;
  summary: string;
  description: ReturnType<typeof descriptionDoc>;
  contentUrl: string;
  status: "published" | "archived" | "drafted";
  schedule: {
    startTime: string;
    endTime: string;
    timeZone: string;
  };
  prices: Array<{
    amount: number;
    currency: string;
    effectiveAt: string;
  }>;
};

export type IssueLike = {
  code: string;
  path: PropertyKey[];
  message: string;
};

export function utcIn(hoursFromNow: number): string {
  return Temporal.Now.instant().add({ hours: hoursFromNow }).toString();
}

export function makeValidRequest(): CourseRequestInput {
  const startTime = utcIn(24);

  return {
    name: "TypeScript Fundamentals",
    summary: "Learn TypeScript from the ground up.",
    description: descriptionDoc("Learn TypeScript from the ground up."),
    contentUrl: "https://drive.google.com/drive/folders/typescript",
    status: "drafted",
    schedule: {
      startTime,
      endTime: Temporal.Instant.from(startTime).add({ hours: 1 }).toString(),
      timeZone: "UTC",
    },
    prices: [
      {
        amount: 5000,
        currency: "USD",
        effectiveAt: utcIn(2),
      },
    ],
  };
}

export function makePrice(effectiveAt: string) {
  return {
    amount: 5000,
    currency: "USD",
    effectiveAt,
  };
}

export function getIssues(input: unknown) {
  const result = createCourseRequestSchema.safeParse(input);

  expect(result.success).toBe(false);

  if (result.success) {
    throw new Error("Expected request validation to fail.");
  }

  return result.error.issues;
}

function hasPath(
  actualPath: PropertyKey[],
  expectedPath: readonly (string | number)[],
): boolean {
  return (
    actualPath.length === expectedPath.length &&
    actualPath.every((part, index) => part === expectedPath[index])
  );
}

export function expectIssueAt(
  issues: readonly IssueLike[],
  path: readonly (string | number)[],
  message?: string,
): void {
  const issue = issues.find((candidate) => hasPath(candidate.path, path));

  expect(
    issue,
    `Expected a validation issue at ${JSON.stringify(path)}`,
  ).toBeDefined();

  if (message !== undefined) {
    expect(issue?.message).toBe(message);
  }
}

export function expectUnknownKeyIssue(
  issues: readonly IssueLike[],
  path: readonly (string | number)[],
): void {
  expect(
    issues.some(
      (issue) =>
        issue.code === "unrecognized_keys" && hasPath(issue.path, path),
    ),
  ).toBe(true);
}
