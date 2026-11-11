// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdminCourse, UpdateCourseRequest } from "@/lib/types";

import { draftedAdminCourse } from "../../fixtures/admin-courses";
import { makeRememberedCreateHandler } from "./create-course";
import { makeRememberedGetHandler } from "./get-course-as-admin";
import { makeRememberedUpdateHandler } from "./update-course";
import { makeRememberedUploadHandler } from "./upload-course-image";
import { MOCK_API_BASE_URL } from "../../mock-api";
import { server } from "../../server";
import { makeRememberedCourse } from "./remembered-course";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const coursesUrl = `${MOCK_API_BASE_URL}/v1/admin/courses`;
const courseUrl = `${coursesUrl}/${draftedAdminCourse.id}`;

function useRememberedHandlers() {
  const store = makeRememberedCourse();
  server.use(
    makeRememberedCreateHandler(store),
    makeRememberedUpdateHandler(store),
    makeRememberedUploadHandler(store),
    makeRememberedGetHandler(store),
  );
}

function sendJson(method: "POST" | "PUT", url: string, body: unknown) {
  return fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function getCourse(): Promise<AdminCourse> {
  return (await fetch(courseUrl)).json();
}

const request: UpdateCourseRequest = {
  name: "Saved name",
  summary: "Saved summary",
  description: { type: "doc", content: [{ type: "paragraph" }] },
  schedule: { ...draftedAdminCourse.schedule },
  contentUrl: "https://example.com/saved",
  status: "published",
  prices: [
    { amount: 5000, currency: "USD", effectiveAt: "2027-01-01T09:00:00Z" },
  ],
};

const savedAt = new Date("2026-11-03T10:00:00Z");

afterEach(() => {
  vi.useRealTimers();
});

describe("remembered handlers", () => {
  it("returns the created course name when the course loads afterwards", async () => {
    useRememberedHandlers();

    const created = await sendJson("POST", coursesUrl, {
      ...request,
      status: "drafted",
    });

    expect(created.status).toBe(201);
    expect(await getCourse()).toMatchObject({
      name: "Saved name",
      contentUrl: "https://example.com/saved",
      status: { name: "drafted" },
      prices: [request.prices[0]],
    });
  });

  it("returns the update with its status name and changed time", async () => {
    vi.useFakeTimers({ now: savedAt, toFake: ["Date"] });
    useRememberedHandlers();

    await sendJson("PUT", courseUrl, request);

    expect(await getCourse()).toMatchObject({
      name: "Saved name",
      status: { name: "published", changedAt: savedAt.toISOString() },
    });
  });

  it("gives saved prices new ids", async () => {
    useRememberedHandlers();

    await sendJson("PUT", courseUrl, {
      ...request,
      prices: [...request.prices, ...request.prices],
    });

    const savedIds = (await getCourse()).prices.map((price) => price.id);
    expect(savedIds).toHaveLength(2);
    expect(savedIds[0]).toMatch(uuidPattern);
    expect(savedIds[1]).toMatch(uuidPattern);
    expect(savedIds[0]).not.toBe(savedIds[1]);
    expect(savedIds).not.toContain(draftedAdminCourse.prices[0].id);
  });

  it("shows an image version after an upload", async () => {
    vi.useFakeTimers({ now: savedAt, toFake: ["Date"] });
    useRememberedHandlers();

    const upload = await fetch(`${courseUrl}/image`, { method: "PUT" });

    expect(upload.status).toBe(204);
    expect((await getCourse()).image).toEqual({
      updatedAt: savedAt.toISOString(),
      version: String(savedAt.getTime()),
    });
  });

  it("x", async () => {
    useRememberedHandlers();
    await sendJson("PUT", courseUrl, request);

    useRememberedHandlers();

    expect((await getCourse()).name).toBe(draftedAdminCourse.name);
  });

  it("keeps the latest of two saves", async () => {
    useRememberedHandlers();

    await sendJson("PUT", courseUrl, request);
    await sendJson("PUT", courseUrl, { ...request, name: "Second name" });

    expect((await getCourse()).name).toBe("Second name");
  });
});
