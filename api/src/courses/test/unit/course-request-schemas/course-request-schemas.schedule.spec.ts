import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "vitest";
import { createCourseRequestSchema } from "@/courses/validation/course-request-schemas.js";
import {
  utcIn,
  makeValidRequest,
  makePrice,
  getIssues,
  expectIssueAt,
} from "@/courses/test/unit/course-request-schemas/course-request-schemas.fixtures.js";

describe("createCourseRequestSchema", () => {
  describe("schedule range", () => {
    it("rejects an end time earlier than the start time", () => {
      const request = makeValidRequest();

      request.schedule.startTime = utcIn(26);
      request.schedule.endTime = utcIn(25);

      const issues = getIssues(request);

      expectIssueAt(
        issues,
        ["schedule", "endTime"],
        "End time must be after start time.",
      );
    });

    it("rejects an end time equal to the start time", () => {
      const request = makeValidRequest();

      request.schedule.endTime = request.schedule.startTime;

      const issues = getIssues(request);

      expectIssueAt(
        issues,
        ["schedule", "endTime"],
        "End time must be after start time.",
      );
    });

    it("accepts an end time later than the start time", () => {
      const request = makeValidRequest();

      request.schedule.endTime = Temporal.Instant.from(
        request.schedule.startTime,
      )
        .add({ hours: 2 })
        .toString();

      expect(createCourseRequestSchema.safeParse(request).success).toBe(true);
    });
  });

  describe("schedule timestamps", () => {
    it("rejects a start time in the past", () => {
      const request = makeValidRequest();

      request.schedule.startTime = utcIn(-1);
      request.schedule.endTime = utcIn(1);

      const issues = getIssues(request);

      expectIssueAt(
        issues,
        ["schedule", "startTime"],
        "Start time cannot be in the past.",
      );
    });

    it("rejects an end time in the past", () => {
      const request = makeValidRequest();
      const startTime = utcIn(-2);

      request.schedule.startTime = startTime;
      request.schedule.endTime = Temporal.Instant.from(startTime)
        .add({ minutes: 30 })
        .toString();

      const issues = getIssues(request);

      expectIssueAt(
        issues,
        ["schedule", "endTime"],
        "End time cannot be in the past.",
      );
    });
  });

  describe("canonical UTC timestamp format", () => {
    const nonCanonicalTimestamps = [
      {
        label: "a negative numeric offset",
        value: "2030-01-01T19:00:00-05:00",
      },
      {
        label: "a positive zero offset",
        value: "2030-01-02T00:00:00+00:00",
      },
      {
        label: "a timestamp without a time-zone designator",
        value: "2030-01-02T00:00:00",
      },
    ];

    it.each(nonCanonicalTimestamps)(
      "rejects $label for schedule.startTime",
      ({ value }) => {
        const request = makeValidRequest();

        request.schedule.startTime = value;
        request.schedule.endTime = "2030-01-02T02:00:00Z";

        const issues = getIssues(request);

        expectIssueAt(issues, ["schedule", "startTime"]);
      },
    );

    it.each(nonCanonicalTimestamps)(
      "rejects $label for schedule.endTime",
      ({ value }) => {
        const request = makeValidRequest();

        request.schedule.startTime = "2030-01-01T18:00:00Z";
        request.schedule.endTime = value;

        const issues = getIssues(request);

        expectIssueAt(issues, ["schedule", "endTime"]);
      },
    );

    it.each(nonCanonicalTimestamps)(
      "rejects $label for prices[0].effectiveAt",
      ({ value }) => {
        const request = makeValidRequest();

        request.prices[0].effectiveAt = value;

        const issues = getIssues(request);

        expectIssueAt(issues, ["prices", 0, "effectiveAt"]);
      },
    );
  });

  describe("price effective times", () => {
    it("accepts a future effective time", () => {
      const request = makeValidRequest();
      request.prices[0].effectiveAt = utcIn(48);

      expect(createCourseRequestSchema.safeParse(request).success).toBe(true);
    });

    it("rejects an effective time in the past", () => {
      const request = makeValidRequest();
      request.prices[0].effectiveAt = utcIn(-1);

      const issues = getIssues(request);

      expectIssueAt(
        issues,
        ["prices", 0, "effectiveAt"],
        "Price effective time cannot be in the past.",
      );
    });

    it("checks every price entry for past effective times", () => {
      const request = makeValidRequest();

      request.prices = [
        makePrice(utcIn(-3)),
        makePrice(utcIn(-2)),
        makePrice(utcIn(-1)),
      ];

      const issues = getIssues(request);

      expectIssueAt(issues, ["prices", 0, "effectiveAt"]);
      expectIssueAt(issues, ["prices", 1, "effectiveAt"]);
      expectIssueAt(issues, ["prices", 2, "effectiveAt"]);
    });

    it("accepts distinct effective instants", () => {
      const request = makeValidRequest();

      request.prices = [makePrice(utcIn(2)), makePrice(utcIn(3))];

      expect(createCourseRequestSchema.safeParse(request).success).toBe(true);
    });

    it("rejects duplicate effective instants", () => {
      const request = makeValidRequest();

      request.prices = [
        makePrice("2030-01-01T12:00:00Z"),
        makePrice("2030-01-01T12:00:00.000Z"),
      ];

      const issues = getIssues(request);

      expectIssueAt(
        issues,
        ["prices", 1, "effectiveAt"],
        "Price effective times must be unique.",
      );
    });
  });
});
