import type {
  AdminCourse,
  CreateCourseRequest,
  UpdateCourseRequest,
} from "@/lib/types";

import { draftedAdminCourse } from "../../fixtures/admin-courses";

type SavedCourseRequest = CreateCourseRequest | UpdateCourseRequest;

function givePricesNewIds(prices: SavedCourseRequest["prices"]) {
  return prices.map((price) => ({ ...price, id: crypto.randomUUID() }));
}

function buildImageVersion(savedAt: Date) {
  return {
    updatedAt: savedAt.toISOString(),
    version: String(savedAt.getTime()),
  };
}

function buildStoredCourse(
  previous: AdminCourse,
  request: SavedCourseRequest,
): AdminCourse {
  return {
    id: previous.id,
    name: request.name,
    summary: request.summary,
    description: request.description,
    schedule: request.schedule,
    contentUrl: request.contentUrl,
    status: { name: request.status, changedAt: new Date().toISOString() },
    image: previous.image,
    enrollments: [],
    prices: givePricesNewIds(request.prices),
  };
}

/**
 * Makes a store holding one course that the create, update, upload and get
 * handlers share, so a saved course comes back as saved. It starts with the
 * drafted sample course.
 */
export function makeRememberedCourse() {
  let storedCourse: AdminCourse = draftedAdminCourse;

  return {
    current: () => storedCourse,
    saveSentCourse: (request: SavedCourseRequest) => {
      storedCourse = buildStoredCourse(storedCourse, request);
    },
    saveUploadedImage: () => {
      storedCourse = { ...storedCourse, image: buildImageVersion(new Date()) };
    },
  };
}

export type RememberedCourse = ReturnType<typeof makeRememberedCourse>;
