import { describe, expect, it } from "vitest";

import type { AdminCustomer } from "@/lib/types";
import { selectStudents } from "./customer-groups";

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
