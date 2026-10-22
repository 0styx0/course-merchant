import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "vitest";

import { EnrollmentAccess, enrollmentAccess } from "@/enrollments/enrollment-access.js";

const at = Temporal.Instant.from("2026-10-21T12:00:00Z");

describe("enrollmentAccess", () => {
  it.each([
    ["no enrollment", null, EnrollmentAccess.NONE],
    ["neither timestamp set", { revokedAt: null, suspendedAt: null }, EnrollmentAccess.ACTIVE],
    ["a refund", { revokedAt: at, suspendedAt: null }, EnrollmentAccess.REVOKED],
    ["a dispute", { revokedAt: null, suspendedAt: at }, EnrollmentAccess.SUSPENDED],
    ["a refund and a dispute", { revokedAt: at, suspendedAt: at }, EnrollmentAccess.SUSPENDED],
  ] as const)("after %s, access is %s", (_label, enrollment, expected) => {
    expect(enrollmentAccess(enrollment)).toBe(expected);
  });
});
