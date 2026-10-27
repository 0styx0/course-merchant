import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createPricedCourse } from "@/test/course-fixtures.js";
import { instant } from "@/test/test-helpers.js";
import { createE2eApp, httpServer } from "../e2e-helpers.js";

const UNKNOWN_COURSE_ID = "123e4567-e89b-12d3-a456-426614174000";

describe("Course image API (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createE2eApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const getImage = (courseId: string, version: string) =>
    request(httpServer(app))
      .get(`/v1/courses/${courseId}/image/${version}`)
      .buffer(true)
      .parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => done(null, Buffer.concat(chunks)));
      });

  /** The version the course's public response advertises. */
  async function publicVersion(courseId: string): Promise<string> {
    const response = await request(httpServer(app))
      .get(`/v1/courses/${courseId}`)
      .expect(200);

    return (response.body as { image: { version: string } }).image.version;
  }

  it("serves the current image to anyone, cached for a year", async () => {
    const { course } = await createPricedCourse();
    const version = await publicVersion(course.id);

    const response = await getImage(course.id, version).expect(200);

    expect(response.headers["content-type"]).toBe("image/webp");
    expect(response.headers["cache-control"]).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    const bytes = response.body as Buffer;
    expect(bytes.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(bytes.subarray(8, 12).toString("ascii")).toBe("WEBP");
  });

  it("serves the image of an ended course", async () => {
    const { course } = await createPricedCourse({
      startsAt: instant("2020-01-01T10:00:00Z"),
      endsAt: instant("2020-01-01T12:00:00Z"),
    });
    const version = await publicVersion(course.id);

    await getImage(course.id, version).expect(200);
  });

  it("is 404 for a stale version, without the year-long cache header", async () => {
    const { course } = await createPricedCourse();
    const stale = String(Number(await publicVersion(course.id)) - 1);

    const response = await request(httpServer(app))
      .get(`/v1/courses/${course.id}/image/${stale}`)
      .expect("Content-Type", /^application\/problem\+json(?:;|$)/)
      .expect(404);

    expect(response.body).toMatchObject({ code: "COURSE_NOT_FOUND" });
    expect(response.headers["cache-control"]).toBeUndefined();
  });

  it("is 404 when the version is not a number", async () => {
    const { course } = await createPricedCourse();

    await request(httpServer(app))
      .get(`/v1/courses/${course.id}/image/abc`)
      .expect(404);
  });

  it("is 404 for a course that isn't published, even with an image", async () => {
    const { course } = await createPricedCourse({ status: "archived" });

    await request(httpServer(app))
      .get(`/v1/courses/${course.id}/image/1`)
      .expect(404);
  });

  it("is 404 for an unknown course", async () => {
    await request(httpServer(app))
      .get(`/v1/courses/${UNKNOWN_COURSE_ID}/image/1`)
      .expect(404);
  });

  it("is 400 for a malformed course ID", async () => {
    const response = await request(httpServer(app))
      .get("/v1/courses/not-a-uuid/image/1")
      .expect(400);

    expect(response.body).toMatchObject({ code: "INVALID_COURSE_ID" });
  });
});
