// @vitest-environment node
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { draftedAdminCourse } from "@/mocks/fixtures/admin-courses";
import {
  uploadCourseImageError,
  uploadCourseImageSuccess,
  uploadCourseImageUrl,
  uploadCourseImageValidationFailed,
} from "@/mocks/handlers/upload-course-image";
import { server } from "@/mocks/node";

import { uploadCourseImageAction } from "./upload-course-image.action";

// Its default export throws outside a React Server Component build
vi.mock("server-only", () => ({}));

const courseId = draftedAdminCourse.id;

function formDataWith(entry?: FormDataEntryValue): FormData {
  const formData = new FormData();
  if (entry !== undefined) formData.set("image", entry);
  return formData;
}

function photo(): File {
  return new File(["bytes"], "photo.png", { type: "image/png" });
}

function failOnAnyCall() {
  const calls = { count: 0 };
  server.use(
    http.put(uploadCourseImageUrl, () => {
      calls.count += 1;
      return new Response(null, { status: 500 });
    }),
  );
  return calls;
}

describe("uploadCourseImageAction", () => {
  it("returns the course's id", async () => {
    server.use(uploadCourseImageSuccess);

    await expect(
      uploadCourseImageAction(courseId, formDataWith(photo())),
    ).resolves.toEqual({ state: "success", data: { courseId } });
  });

  it("sends the file as multipart to the course's id", async () => {
    let sentId: unknown;
    let sent: FormDataEntryValue | null = null;
    server.use(
      http.put(uploadCourseImageUrl, async ({ request, params }) => {
        sentId = params.courseId;
        sent = (await request.formData()).get("image");
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await uploadCourseImageAction(courseId, formDataWith(photo()));

    expect(sentId).toBe(courseId);
    expect(sent).toBeInstanceOf(File);
    expect((sent as unknown as File).name).toBe("photo.png");
  });

  it("refuses an invalid course id without calling the API", async () => {
    const calls = failOnAnyCall();

    const result = await uploadCourseImageAction(
      "not-a-uuid",
      formDataWith(photo()),
    );

    expect(calls.count).toBe(0);
    expect(result).toMatchObject({
      state: "failure",
      error: { problem: { code: "VALIDATION_FAILED" }, fieldErrors: [] },
    });
  });

  it.each([
    ["no image entry", formDataWith()],
    ["a text value", formDataWith("not a file")],
    ["an empty file", formDataWith(new File([], "empty.png"))],
  ])("refuses %s without calling the API", async (_name, formData) => {
    const calls = failOnAnyCall();

    const result = await uploadCourseImageAction(courseId, formData);

    expect(calls.count).toBe(0);
    expect(result).toMatchObject({
      state: "failure",
      error: {
        problem: { code: "VALIDATION_FAILED" },
        fieldErrors: [{ path: "image", message: "Choose an image." }],
      },
    });
  });

  it("maps the API's error on /image to the image field", async () => {
    server.use(uploadCourseImageValidationFailed);

    await expect(
      uploadCourseImageAction(courseId, formDataWith(photo())),
    ).resolves.toMatchObject({
      state: "failure",
      error: {
        problem: { code: "VALIDATION_FAILED" },
        fieldErrors: [
          {
            path: "image",
            message: "The image must be a JPEG, PNG or WebP file.",
          },
        ],
      },
    });
  });

  it("returns another problem with no field errors", async () => {
    server.use(uploadCourseImageError);

    await expect(
      uploadCourseImageAction(courseId, formDataWith(photo())),
    ).resolves.toMatchObject({
      state: "failure",
      error: { problem: { code: "INTERNAL_SERVER_ERROR" }, fieldErrors: [] },
    });
  });
});
