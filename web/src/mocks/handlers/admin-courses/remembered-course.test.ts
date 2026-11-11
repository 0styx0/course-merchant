import { afterEach, describe, expect, it, vi } from "vitest";

import type { CreateCourseRequest, UpdateCourseRequest } from "@/lib/types";

import { draftedAdminCourse } from "../../fixtures/admin-courses";
import { makeRememberedCourse } from "./remembered-course";

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
});
