import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  NOW,
  paragraph,
  problems,
  validValues,
  withValues,
} from "./course-form-schema.fixtures";

describe("courseFormSchema", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => vi.useRealTimers());

  it("accepts a valid form", () => {
    expect(problems(validValues())).toEqual({});
  });

  describe("name and summary", () => {
    it("requires a name, even if only spaces", () => {
      expect(withValues((v) => (v.name = "   "))).toEqual({
        name: ["Enter a course name."],
      });
    });

    it("limits the name to 100 characters", () => {
      expect(withValues((v) => (v.name = "a".repeat(101)))).toEqual({
        name: ["The name must be 100 characters or fewer."],
      });
    });

    it("requires a summary", () => {
      expect(withValues((v) => (v.summary = ""))).toEqual({
        summary: ["Enter a summary."],
      });
    });

    it("trims the summary before checking its length", () => {
      expect(withValues((v) => (v.summary = ` ${"a".repeat(300)} `))).toEqual(
        {},
      );
      expect(withValues((v) => (v.summary = "a".repeat(301)))).toEqual({
        summary: ["The summary must be 300 characters or fewer."],
      });
    });
  });

  describe("description", () => {
    it.each([
      ["no paragraphs", { type: "doc", content: [] }],
      ["spaces only", paragraph("    ")],
    ])("requires visible text (%s)", (_label, description) => {
      expect(withValues((v) => (v.description = description))).toEqual({
        description: ["Enter a description."],
      });
    });

    it("allows exactly 5,000 characters and refuses more", () => {
      expect(
        withValues((v) => (v.description = paragraph("a".repeat(5000)))),
      ).toEqual({});
      expect(
        withValues((v) => (v.description = paragraph("a".repeat(5001)))),
      ).toEqual({
        description: ["The description must be 5,000 characters or fewer."],
      });
    });
  });

  describe("content link", () => {
    it("requires one", () => {
      expect(withValues((v) => (v.contentUrl = ""))).toEqual({
        contentUrl: ["Enter the link to the course material."],
      });
    });

    it.each(["drive.google.com/abc", "ftp://example.com/file", "javascript:1"])(
      "refuses %s",
      (url) => {
        expect(withValues((v) => (v.contentUrl = url))).toEqual({
          contentUrl: ["Enter a link starting with https:// or http://."],
        });
      },
    );

    it("limits the length to 2,048 characters", () => {
      const url = `https://example.com/${"a".repeat(2048)}`;
      expect(withValues((v) => (v.contentUrl = url))).toEqual({
        contentUrl: ["The link must be 2,048 characters or fewer."],
      });
    });
  });
});
