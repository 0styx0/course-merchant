import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "vitest";
import {
  findUpdateRuleViolations,
  isSameInstant,
} from "@/courses/validation/course-update-rules.js";
import {
  now,
  at,
  makeStored,
  makeRequest,
  type Stored,
} from "@/courses/test/unit/schemas/course-update-rules/course-update-rules.fixtures.js";

describe("isSameInstant", () => {
  it("compares at microsecond precision", () => {
    expect(
      isSameInstant(
        "2026-10-21T12:00:00.000000400Z",
        Temporal.Instant.from("2026-10-21T12:00:00Z"),
      ),
    ).toBe(true);
  });

  it("treats a different microsecond as changed", () => {
    expect(
      isSameInstant(
        "2026-10-21T12:00:00.000001Z",
        Temporal.Instant.from("2026-10-21T12:00:00Z"),
      ),
    ).toBe(false);
  });
});

describe("findUpdateRuleViolations", () => {
  describe("publishing", () => {
    function publish(
      current: "drafted" | "archived" | "published",
      image: { updatedAt: Temporal.Instant } | null,
    ) {
      const stored = {
        ...makeStored(),
        statuses: [{ name: current, changedAt: at(-72) }],
        image,
      };

      return findUpdateRuleViolations({
        request: makeRequest(stored),
        stored,
        now,
      });
    }

    it.each(["drafted", "archived"] as const)(
      "refuses publishing a %s course with no image",
      (current) => {
        expect(publish(current, null)).toEqual([
          {
            field: "/status",
            code: "INVALID_VALUE",
            detail: "Upload an image before publishing.",
          },
        ]);
      },
    );

    it("allows publishing a course that has an image", () => {
      expect(publish("drafted", { updatedAt: at(-1) })).toEqual([]);
    });

    it("does not re-check a course that is already published", () => {
      expect(publish("published", null)).toEqual([]);
    });

    it("allows archiving a course with no image", () => {
      const stored = {
        ...makeStored(),
        statuses: [{ name: "drafted" as const, changedAt: at(-72) }],
        image: null,
      };

      expect(
        findUpdateRuleViolations({
          request: { ...makeRequest(stored), status: "archived" },
          stored,
          now,
        }),
      ).toEqual([]);
    });
  });

  it("accepts an unchanged round-trip", () => {
    const stored = makeStored();

    expect(
      findUpdateRuleViolations({
        request: makeRequest(stored),
        stored,
        now,
      }),
    ).toEqual([]);
  });

  it("accepts unchanged schedule times in the past", () => {
    const stored = {
      ...makeStored(),
      startsAt: at(-3),
      endsAt: at(-1),
    };

    expect(
      findUpdateRuleViolations({
        request: makeRequest(stored),
        stored,
        now,
      }),
    ).toEqual([]);
  });

  it("rejects schedule times changed to the past", () => {
    const stored = makeStored();
    const request = makeRequest(stored);

    request.schedule.startTime = at(-3).toString();
    request.schedule.endTime = at(-2).toString();

    expect(findUpdateRuleViolations({ request, stored, now })).toEqual([
      {
        field: "/schedule/startTime",
        code: "IN_PAST",
        detail: "Start time cannot be in the past.",
      },
      {
        field: "/schedule/endTime",
        code: "IN_PAST",
        detail: "End time cannot be in the past.",
      },
    ]);
  });

  it("rejects a change to a price in effect", () => {
    const stored = makeStored();
    const request = makeRequest(stored);

    request.prices[0].amount = 6000;

    expect(findUpdateRuleViolations({ request, stored, now })).toEqual([
      {
        field: "/prices/0/effectiveAt",
        code: "IN_PAST",
        detail: "Price effective time cannot be in the past.",
      },
    ]);
  });

  it("accepts a change to a future price", () => {
    const stored = makeStored();
    const request = makeRequest(stored);

    request.prices[1].amount = 9000;

    expect(findUpdateRuleViolations({ request, stored, now })).toEqual([]);
  });

  it("accepts an empty price list when a price is in effect", () => {
    const stored = makeStored();

    expect(
      findUpdateRuleViolations({
        request: { ...makeRequest(stored), prices: [] },
        stored,
        now,
      }),
    ).toEqual([]);
  });

  it("rejects an empty price list when no price is in effect", () => {
    const stored = {
      ...makeStored(),
      prices: [makeStored().prices[1]],
    };

    expect(
      findUpdateRuleViolations({
        request: { ...makeRequest(stored), prices: [] },
        stored,
        now,
      }),
    ).toEqual([
      {
        field: "/prices",
        code: "TOO_SHORT",
        detail:
          "Prices must contain at least one entry when no price is in effect.",
      },
    ]);
  });

  it("reports every violation together", () => {
    const stored = makeStored();
    const request = makeRequest(stored);

    request.schedule.startTime = at(-3).toString();
    request.prices.push({
      amount: 8000,
      currency: "USD",
      effectiveAt: at(-1).toString(),
    });

    expect(
      findUpdateRuleViolations({ request, stored, now }).map(
        (error) => error.field,
      ),
    ).toEqual(["/schedule/startTime", "/prices/2/effectiveAt"]);
  });

  describe("changing the status", () => {
    const refusal = {
      field: "/status",
      code: "HAS_ENROLLMENTS",
      detail: "Students are enrolled in this course. Archive it instead.",
    };

    const activeEnrollment = { revokedAt: null, suspendedAt: null };

    function findViolationsWhenChangingStatus(
      current: "published" | "archived" | "deleted",
      requested: "archived" | "deleted",
      enrollments: Stored["enrollments"],
    ) {
      const stored = {
        ...makeStored(),
        statuses: [{ name: current, changedAt: at(-72) }],
        enrollments,
      };

      return findUpdateRuleViolations({
        request: { ...makeRequest(stored), status: requested },
        stored,
        now,
      });
    }

    it("refuses deleting a course with an active enrollment", () => {
      expect(
        findViolationsWhenChangingStatus("published", "deleted", [
          activeEnrollment,
        ]),
      ).toEqual([refusal]);
    });

    it("refuses deleting a course whose enrollment was refunded", () => {
      const refunded = { revokedAt: at(-1), suspendedAt: null };

      expect(
        findViolationsWhenChangingStatus("published", "deleted", [refunded]),
      ).toEqual([refusal]);
    });

    it("refuses deleting a course whose enrollment is suspended", () => {
      const suspended = { revokedAt: null, suspendedAt: at(-1) };

      expect(
        findViolationsWhenChangingStatus("published", "deleted", [suspended]),
      ).toEqual([refusal]);
    });

    it("allows deleting a course with no enrollments", () => {
      expect(
        findViolationsWhenChangingStatus("published", "deleted", []),
      ).toEqual([]);
    });

    it("allows archiving a course with enrollments", () => {
      expect(
        findViolationsWhenChangingStatus("published", "archived", [
          activeEnrollment,
        ]),
      ).toEqual([]);
    });

    it("does not re-check a course that is already deleted", () => {
      expect(
        findViolationsWhenChangingStatus("deleted", "deleted", [
          activeEnrollment,
        ]),
      ).toEqual([]);
    });

    it("returns the refusal together with an IN_PAST error", () => {
      const stored = { ...makeStored(), enrollments: [activeEnrollment] };
      const past = now.subtract({ hours: 1 }).toString();
      const request = makeRequest(stored);

      const violations = findUpdateRuleViolations({
        request: {
          ...request,
          status: "deleted",
          schedule: { ...request.schedule, startTime: past },
        },
        stored,
        now,
      });

      expect(violations.map((violation) => violation.code)).toEqual([
        "IN_PAST",
        "HAS_ENROLLMENTS",
      ]);
      expect(violations).toContainEqual(refusal);
    });
  });
});
