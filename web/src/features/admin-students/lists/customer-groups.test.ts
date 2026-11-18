import { describe, expect, it } from "vitest";

import type { AdminCustomer } from "@/lib/types";
import { selectStudents, selectUnfinishedCheckouts } from "./customer-groups";

type EnrollmentAccess = {
  revokedAt: string | null;
  suspendedAt: string | null;
};

const activeAccess = { revokedAt: null, suspendedAt: null };

function makeCustomer(
  name: string,
  accesses: EnrollmentAccess[],
): AdminCustomer {
  return {
    id: `id-${name}`,
    name,
    email: `${name}@example.com`,
    latestCheckoutStartedAt: null,
    enrollments: accesses.map((access) => ({
      course: { id: "course-id", name: "React Fundamentals" },
      enrolledAt: "2026-11-01T15:00:00Z",
      ...access,
    })),
  };
}

function makeUnfinishedCustomer(
  name: string,
  latestCheckoutStartedAt: string | null,
): AdminCustomer {
  return { ...makeCustomer(name, []), latestCheckoutStartedAt };
}

const namesOf = (shown: AdminCustomer[]) =>
  shown.map((customer) => customer.name);

describe("selectStudents", () => {
  it("keeps only customers with an enrollment, in the given order", () => {
    const customers = [
      makeCustomer("sam", [activeAccess, activeAccess]),
      makeCustomer("tal", []),
      makeCustomer("noa", [activeAccess]),
    ];

    expect(namesOf(selectStudents(customers))).toEqual(["sam", "noa"]);
  });

  it("returns nothing for no customers", () => {
    expect(selectStudents([])).toEqual([]);
  });

  it("keeps a student whose only enrollment is suspended or un-enrolled", () => {
    const customers = [
      makeCustomer("lee", [
        { revokedAt: null, suspendedAt: "2026-10-30T18:00:00Z" },
      ]),
      makeCustomer("ben", [
        { revokedAt: "2026-10-28T10:00:00Z", suspendedAt: null },
      ]),
    ];

    expect(namesOf(selectStudents(customers))).toEqual(["lee", "ben"]);
  });
});

describe("selectUnfinishedCheckouts", () => {
  it("keeps only customers with no enrollment, newest checkout first", () => {
    const customers = [
      makeUnfinishedCustomer("old", "2026-10-01T09:00:00Z"),
      makeCustomer("student", [activeAccess]),
      makeUnfinishedCustomer("new", "2026-11-03T16:00:00Z"),
    ];

    expect(namesOf(selectUnfinishedCheckouts(customers))).toEqual([
      "new",
      "old",
    ]);
  });

  it("puts a customer with no checkout time last", () => {
    const customers = [
      makeUnfinishedCustomer("none", null),
      makeUnfinishedCustomer("old", "2026-10-01T09:00:00Z"),
      makeUnfinishedCustomer("new", "2026-11-03T16:00:00Z"),
    ];

    expect(namesOf(selectUnfinishedCheckouts(customers))).toEqual([
      "new",
      "old",
      "none",
    ]);
  });

  it("keeps the given order for equal checkout times, and for several nulls", () => {
    const customers = [
      makeUnfinishedCustomer("first-null", null),
      makeUnfinishedCustomer("first-tie", "2026-11-03T16:00:00Z"),
      makeUnfinishedCustomer("second-null", null),
      makeUnfinishedCustomer("second-tie", "2026-11-03T16:00:00Z"),
    ];

    expect(namesOf(selectUnfinishedCheckouts(customers))).toEqual([
      "first-tie",
      "second-tie",
      "first-null",
      "second-null",
    ]);
  });

  it("leaves the given list in its order", () => {
    const customers = [
      makeUnfinishedCustomer("old", "2026-10-01T09:00:00Z"),
      makeUnfinishedCustomer("new", "2026-11-03T16:00:00Z"),
    ];

    const unfinished = selectUnfinishedCheckouts(customers);

    expect(namesOf(unfinished)).toEqual(["new", "old"]);
    expect(namesOf(customers)).toEqual(["old", "new"]);
  });

  it("returns nothing when every customer is a student", () => {
    const customers = [makeCustomer("sam", [activeAccess])];

    expect(selectUnfinishedCheckouts(customers)).toEqual([]);
  });
});
