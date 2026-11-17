import { describe, expect, it } from "vitest";

import type { AdminCourse } from "@/lib/types";
import { adminCourseWithEveryStudentCase } from "@/mocks/fixtures/admin-courses";

import { type StudentOrder, studentsInOrder } from "./students-in-order";

type Enrollment = AdminCourse["enrollments"][number];

const fixtureStudents: Enrollment[] = [
  ...adminCourseWithEveryStudentCase.enrollments,
];
const [danaEnrollment] = fixtureStudents;
const everyOrder: StudentOrder[] = ["newest", "oldest", "active", "attention"];

function firstNamesIn(enrollments: Enrollment[]) {
  return enrollments.map(
    (enrollment) => enrollment.customer.name.split(" ")[0],
  );
}

function studentWith(firstName: string, changes: Partial<Enrollment>) {
  return {
    ...danaEnrollment,
    refundStatus: "not_owed",
    latestEmail: { kind: "access_granted", status: "sent" },
    ...changes,
    customer: { ...danaEnrollment.customer, name: `${firstName} Test` },
  } satisfies Enrollment;
}

describe("studentsInOrder", () => {
  it("lists the newest enrolled student first", () => {
    expect(firstNamesIn(studentsInOrder(fixtureStudents, "newest"))).toEqual([
      "Sam",
      "Noa",
      "Omar",
      "Dana",
      "Lee",
      "Rina",
      "Ari",
      "Ben",
    ]);
  });

  it("lists the oldest enrolled student first", () => {
    expect(firstNamesIn(studentsInOrder(fixtureStudents, "oldest"))).toEqual([
      "Ben",
      "Ari",
      "Rina",
      "Lee",
      "Dana",
      "Omar",
      "Noa",
      "Sam",
    ]);
  });

  it("puts a newer un-enrolled student below every Active student", () => {
    const zoe = studentWith("Zoe", {
      enrolledAt: "2026-11-15T15:00:00Z",
      revokedAt: "2026-11-16T15:00:00Z",
    });

    expect(
      firstNamesIn(studentsInOrder([...fixtureStudents, zoe], "active")),
    ).toEqual([
      "Sam",
      "Noa",
      "Omar",
      "Dana",
      "Zoe",
      "Lee",
      "Rina",
      "Ari",
      "Ben",
    ]);
  });

  it("lists Refund owed, then failed email, then the rest, each newest first", () => {
    expect(firstNamesIn(studentsInOrder(fixtureStudents, "attention"))).toEqual(
      ["Dana", "Noa", "Omar", "Lee", "Sam", "Rina", "Ari", "Ben"],
    );
  });

  it("ranks an un-enrolled student with a failed email with the rest", () => {
    const zoe = studentWith("Zoe", {
      enrolledAt: "2026-11-15T15:00:00Z",
      revokedAt: "2026-11-16T15:00:00Z",
      latestEmail: { kind: "access_granted", status: "failed" },
    });

    expect(
      firstNamesIn(studentsInOrder([...fixtureStudents, zoe], "attention")),
    ).toEqual([
      "Dana",
      "Noa",
      "Omar",
      "Lee",
      "Zoe",
      "Sam",
      "Rina",
      "Ari",
      "Ben",
    ]);
  });

  it("ranks an un-enrolled student with Refund owed first", () => {
    const zoe = studentWith("Zoe", {
      enrolledAt: "2026-10-01T15:00:00Z",
      revokedAt: "2026-11-16T15:00:00Z",
      refundStatus: "owed",
    });

    expect(
      firstNamesIn(studentsInOrder([...fixtureStudents, zoe], "attention")),
    ).toEqual([
      "Dana",
      "Zoe",
      "Noa",
      "Omar",
      "Lee",
      "Sam",
      "Rina",
      "Ari",
      "Ben",
    ]);
  });

  it("keeps the API's order for two students who enrolled at the same time", () => {
    const sameTime = "2026-11-15T15:00:00Z";
    const twins = [
      studentWith("First", { enrolledAt: sameTime }),
      studentWith("Second", { enrolledAt: sameTime }),
    ];

    expect(firstNamesIn(studentsInOrder(twins, "newest"))).toEqual([
      "First",
      "Second",
    ]);
    expect(firstNamesIn(studentsInOrder(twins, "oldest"))).toEqual([
      "First",
      "Second",
    ]);
  });

  it("returns a new list and leaves the input list unchanged", () => {
    const namesBefore = firstNamesIn(fixtureStudents);

    const ordered = studentsInOrder(fixtureStudents, "newest");

    expect(ordered).not.toBe(fixtureStudents);
    expect(firstNamesIn(fixtureStudents)).toEqual(namesBefore);
  });

  it("returns an empty list for an empty list, in every order", () => {
    for (const order of everyOrder) {
      expect(studentsInOrder([], order)).toEqual([]);
    }
  });
});
