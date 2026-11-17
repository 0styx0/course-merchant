import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  AdminCourse,
  CreateCourseRequest,
  UpdateCourseRequest,
} from "@/lib/types";

import {
  adminCourseWithEveryStudentCase,
  draftedAdminCourse,
} from "../../fixtures/admin-courses";
import {
  makeRememberedCourse,
  type RememberedCourse,
} from "./remembered-course";

const savedAt = new Date("2026-11-03T10:00:00Z");

const createRequest: CreateCourseRequest = {
  name: "Created name",
  summary: "Created summary",
  description: { type: "doc", content: [{ type: "paragraph" }] },
  schedule: {
    startTime: "2027-01-01T10:00:00Z",
    endTime: "2027-02-01T10:00:00Z",
    timeZone: "America/New_York",
  },
  contentUrl: "https://example.com/created",
  status: "drafted",
  prices: [
    { amount: 5000, currency: "USD", effectiveAt: "2027-01-01T09:00:00Z" },
  ],
};

const updateRequest: UpdateCourseRequest = {
  ...createRequest,
  name: "Updated name",
  status: "published",
};

afterEach(() => {
  vi.useRealTimers();
});

describe("makeRememberedCourse", () => {
  it("starts with the drafted sample course", () => {
    expect(makeRememberedCourse().current()).toEqual(draftedAdminCourse);
  });

  it("starts with the course it is given", () => {
    const store = makeRememberedCourse(adminCourseWithEveryStudentCase);

    expect(store.current()).toEqual(adminCourseWithEveryStudentCase);
  });

  it("stores a created course with the request's fields and a drafted status", () => {
    vi.useFakeTimers({ now: savedAt });
    const store = makeRememberedCourse();

    store.saveSentCourse(createRequest);

    expect(store.current()).toMatchObject({
      id: draftedAdminCourse.id,
      name: "Created name",
      summary: "Created summary",
      contentUrl: "https://example.com/created",
      schedule: createRequest.schedule,
      status: { name: "drafted", changedAt: savedAt.toISOString() },
      enrollments: [],
    });
  });

  it("stores an updated course with the new status and its changed time", () => {
    vi.useFakeTimers({ now: savedAt });
    const store = makeRememberedCourse();

    store.saveSentCourse(updateRequest);

    expect(store.current()).toMatchObject({
      name: "Updated name",
      status: { name: "published", changedAt: savedAt.toISOString() },
    });
  });

  it("gives each stored price a new id", () => {
    const store = makeRememberedCourse();

    store.saveSentCourse(updateRequest);
    const [firstPrice] = store.current().prices;

    expect(firstPrice).toMatchObject(updateRequest.prices[0]);
    expect(firstPrice.id).not.toBe(draftedAdminCourse.prices[0].id);
  });

  it("gives the prices new ids again on a repeated save", () => {
    const store = makeRememberedCourse();

    store.saveSentCourse(updateRequest);
    const firstId = store.current().prices[0].id;
    store.saveSentCourse(updateRequest);

    expect(store.current().prices[0].id).not.toBe(firstId);
  });

  it("gives the course an image version when an image uploads", () => {
    vi.useFakeTimers({ now: savedAt });
    const store = makeRememberedCourse();

    store.saveUploadedImage();

    expect(store.current().image).toEqual({
      updatedAt: savedAt.toISOString(),
      version: String(savedAt.getTime()),
    });
  });

  it("keeps the stored image when the details save again", () => {
    const store = makeRememberedCourse();
    store.saveUploadedImage();
    const uploadedImage = store.current().image;

    store.saveSentCourse(updateRequest);

    expect(store.current().image).toEqual(uploadedImage);
    expect(uploadedImage).not.toBeNull();
  });

  it("keeps the latest of two saves", () => {
    const store = makeRememberedCourse();

    store.saveSentCourse(updateRequest);
    store.saveSentCourse({ ...updateRequest, name: "Second name" });

    expect(store.current().name).toBe("Second name");
  });

  it("starts each store empty", () => {
    const first = makeRememberedCourse();
    first.saveSentCourse(updateRequest);

    expect(makeRememberedCourse().current()).toEqual(draftedAdminCourse);
  });

  describe("revokeEnrollment", () => {
    const dana = adminCourseWithEveryStudentCase.enrollments.find(
      (enrollment) => enrollment.customer.name === "Dana Cohen",
    )!;
    const freeStudent = adminCourseWithEveryStudentCase.enrollments.find(
      (enrollment) => enrollment.payment === null,
    )!;

    function enrollmentOf(store: RememberedCourse, customerId: string) {
      return store
        .current()
        .enrollments.find(
          (enrollment) => enrollment.customer.id === customerId,
        );
    }

    it("sets revokedAt to now and turns a succeeded payment refunded", () => {
      vi.useFakeTimers({ now: savedAt });
      const store = makeRememberedCourse(adminCourseWithEveryStudentCase);

      const wasKnown = store.revokeEnrollment(dana.customer.id);

      expect(wasKnown).toBe(true);
      expect(enrollmentOf(store, dana.customer.id)).toMatchObject({
        revokedAt: savedAt.toISOString(),
        refundStatus: "owed",
        payment: { status: "refunded", amount: 9900 },
      });
    });

    it("keeps no payment for a free student", () => {
      vi.useFakeTimers({ now: savedAt });
      const store = makeRememberedCourse(adminCourseWithEveryStudentCase);

      store.revokeEnrollment(freeStudent.customer.id);

      expect(enrollmentOf(store, freeStudent.customer.id)).toMatchObject({
        revokedAt: savedAt.toISOString(),
        payment: null,
      });
    });

    it("keeps the first revokedAt on a repeat", () => {
      vi.useFakeTimers({ now: savedAt });
      const store = makeRememberedCourse(adminCourseWithEveryStudentCase);
      store.revokeEnrollment(dana.customer.id);

      vi.setSystemTime(new Date("2026-11-04T10:00:00Z"));
      store.revokeEnrollment(dana.customer.id);

      expect(enrollmentOf(store, dana.customer.id)?.revokedAt).toBe(
        savedAt.toISOString(),
      );
    });

    it("leaves the other students alone", () => {
      const store = makeRememberedCourse(adminCourseWithEveryStudentCase);

      store.revokeEnrollment(dana.customer.id);

      const others = (course: AdminCourse) =>
        course.enrollments.filter(
          (enrollment) => enrollment.customer.id !== dana.customer.id,
        );
      expect(others(store.current())).toEqual(
        others(adminCourseWithEveryStudentCase),
      );
    });

    it("returns false and changes nothing for an unknown customer", () => {
      const store = makeRememberedCourse(adminCourseWithEveryStudentCase);

      const wasKnown = store.revokeEnrollment("no-such-customer");

      expect(wasKnown).toBe(false);
      expect(store.current()).toEqual(adminCourseWithEveryStudentCase);
    });
  });
});
