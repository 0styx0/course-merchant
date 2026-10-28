import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createCourse, descriptionDoc } from "@/test/course-fixtures.js";
import { instant } from "@/test/test-helpers.js";
import { bearer, logInAsAdmin } from "@/test/admin-fixtures.js";
import {
  createE2eApp,
  httpServer,
  type TypedResponse,
} from "../e2e-helpers.js";
import type { GetCourseAdminResponse, ProblemDetails } from "types.js";

const UNKNOWN_COURSE_ID = "123e4567-e89b-12d3-a456-426614174000";

function jpeg(width = 1200, height = 900) {
  return sharp({
    create: { width, height, channels: 3, background: "#3366cc" },
  })
    .jpeg()
    .toBuffer();
}

describe("Admin course image API (e2e)", () => {
  let app: INestApplication;
  let token: string;
  let courseId: string;

  beforeAll(async () => {
    app = await createE2eApp();
  });

  beforeEach(async () => {
    token = await logInAsAdmin(app);
    courseId = (
      await createCourse({
        status: "drafted",
        title: "React Fundamentals",
        summary: "Learn React",
        description: descriptionDoc("Learn React"),
        startsAt: instant("2026-10-15T18:00:00Z"),
        endsAt: instant("2026-10-15T20:00:00Z"),
        timeZone: "UTC",
      })
    ).id;
  });

  afterAll(async () => {
    await app.close();
  });

  const put = (id = courseId) =>
    request(httpServer(app))
      .put(`/v1/admin/courses/${id}/image`)
      .set("Authorization", bearer(token));

  const get = (id = courseId) =>
    request(httpServer(app))
      .get(`/v1/admin/courses/${id}/image`)
      .set("Authorization", bearer(token));

  const expectFieldError = (
    response: TypedResponse<ProblemDetails>,
    code: string,
  ) => {
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "VALIDATION_FAILED",
      errors: [{ field: "/image", code }],
    });
  };

  it("stores an upload as a 1600×900 WebP and serves it back", async () => {
    await put()
      .attach("image", await jpeg(), { filename: "a.jpg" })
      .expect(204);

    const response = await get()
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200)
      .expect("Content-Type", "image/webp")
      .expect("Cache-Control", "private, no-cache");

    const metadata = await sharp(response.body as Buffer).metadata();
    expect([metadata.format, metadata.width, metadata.height]).toEqual([
      "webp",
      1600,
      900,
    ]);
  });

  it("shows the image in the admin course and changes its version on replace", async () => {
    await put()
      .attach("image", await jpeg(), "a.jpg")
      .expect(204);
    const first: TypedResponse<GetCourseAdminResponse> = await request(
      httpServer(app),
    )
      .get(`/v1/admin/courses/${courseId}`)
      .set("Authorization", bearer(token));

    await new Promise((resolve) => setTimeout(resolve, 5));
    await put()
      .attach("image", await jpeg(), "b.jpg")
      .expect(204);
    const second: TypedResponse<GetCourseAdminResponse> = await request(
      httpServer(app),
    )
      .get(`/v1/admin/courses/${courseId}`)
      .set("Authorization", bearer(token));

    expect(first.body.image?.version).toMatch(/^[0-9]+$/);
    expect(second.body.image?.version).not.toBe(first.body.image?.version);
  });

  it("requires a file", async () => {
    expectFieldError(await put().send({}), "REQUIRED");
  });

  it("refuses a file over 5 MB", async () => {
    const response = await put().attach(
      "image",
      Buffer.alloc(5 * 1024 * 1024 + 1),
      "big.jpg",
    );

    expectFieldError(response, "ABOVE_MAXIMUM");
  });

  it("refuses a file in another field", async () => {
    const response = await put().attach("photo", await jpeg(), "a.jpg");

    expectFieldError(response, "UNKNOWN_FIELD");
  });

  it("refuses an extra text field", async () => {
    const response = await put()
      .field("note", "hi")
      .attach("image", await jpeg(), "a.jpg");

    expectFieldError(response, "UNKNOWN_FIELD");
  });

  it("refuses a file that is not an image", async () => {
    const response = await put().attach("image", Buffer.from("hello"), "a.jpg");

    expectFieldError(response, "INVALID_FORMAT");
  });

  it("refuses a truncated multipart body", async () => {
    const response = await put()
      .set("Content-Type", "multipart/form-data; boundary=xyz")
      .send(
        '--xyz\r\nContent-Disposition: form-data; name="image"; filename="a.jpg"\r\n\r\nabc',
      );

    expectFieldError(response, "INVALID_FORMAT");
  });

  it("is 404 COURSE_NOT_FOUND for an unknown course, on both routes", async () => {
    const upload: TypedResponse<ProblemDetails> = await put(
      UNKNOWN_COURSE_ID,
    ).attach("image", await jpeg(), "a.jpg");
    const download: TypedResponse<ProblemDetails> =
      await get(UNKNOWN_COURSE_ID);

    expect([upload.status, upload.body.code]).toEqual([
      404,
      "COURSE_NOT_FOUND",
    ]);
    expect([download.status, download.body.code]).toEqual([
      404,
      "COURSE_NOT_FOUND",
    ]);
  });

  it("is 404 COURSE_IMAGE_NOT_FOUND before an upload", async () => {
    const response: TypedResponse<ProblemDetails> = await get();

    expect([response.status, response.body.code]).toEqual([
      404,
      "COURSE_IMAGE_NOT_FOUND",
    ]);
  });

  it("is 400 INVALID_COURSE_ID for a malformed id", async () => {
    const response: TypedResponse<ProblemDetails> = await get("not-a-uuid");

    expect([response.status, response.body.code]).toEqual([
      400,
      "INVALID_COURSE_ID",
    ]);
  });

  it("is 401 without a login, before the file is read", async () => {
    const upload = await request(httpServer(app))
      .put(`/v1/admin/courses/${courseId}/image`)
      .attach("image", await jpeg(), "a.jpg");
    const download = await request(httpServer(app)).get(
      `/v1/admin/courses/${courseId}/image`,
    );

    expect([upload.status, download.status]).toEqual([401, 401]);
  });
});
