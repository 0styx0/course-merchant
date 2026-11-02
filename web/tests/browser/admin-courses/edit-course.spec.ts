import type { Page } from "@playwright/test";
import { http, HttpResponse } from "msw";
import msw from "next/experimental/testmode/playwright/msw.js";

import { adminCourseWithFuturePrice } from "@/mocks/fixtures/admin-courses";
import { getCourseAsAdminHandlers } from "@/mocks/handlers/get-course-as-admin";
import { getCourseImageAsAdminHandlers } from "@/mocks/handlers/get-course-image-as-admin";
import { coursesSuccess } from "@/mocks/handlers/list-courses";
import {
  makeTwoRoundsRefusalHandler,
  updateCourseHandlers,
  updateCourseUrl,
} from "@/mocks/handlers/update-course";
import { uploadCourseImageUrl } from "@/mocks/handlers/upload-course-image";

const { test, expect } = msw;

test.use({
  mswHandlers: [[coursesSuccess], { scope: "test" }],
});

const editPath = "/admin/courses/3f0c1c1e-8f4e-4c3e-9a57-0d6a4f0b9a11/edit";

/** Console errors (a hydration warning is one) seen while the page is used. */
function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("shows the course's details and saves a new name", async ({
  page,
  msw,
}) => {
  msw.use(getCourseAsAdminHandlers.success, makeTwoRoundsRefusalHandler());
  const consoleErrors = collectConsoleErrors(page);

  await page.goto(editPath);
  await expect(
    page.getByRole("heading", { name: "Edit course" }),
  ).toBeVisible();
  const name = page.getByLabel("Course name", { exact: true });
  await expect(name).not.toHaveValue("");
  await expect(page.getByLabel("Content link")).toHaveValue(
    "https://example.com/course",
  );

  await name.fill("A better name");
  const save = page.getByRole("button", { name: "Save changes" });
  await save.click();

  // The first save is refused on the name, the second on the content link
  const firstRefusal = page
    .getByRole("alert")
    .filter({ hasText: "Validation failed" });
  await expect(firstRefusal).toBeVisible();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(name).toHaveValue("A better name");
  await expect(page).toHaveURL(/\/edit$/);

  await save.click();
  await expect(page.getByLabel("Content link")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(name).toHaveValue("A better name");

  await save.click();
  await expect(page).toHaveURL("/");
  expect(consoleErrors).toEqual([]);
});

test("fills the schedule boxes and shows a past start on the schedule line", async ({
  page,
  msw,
}) => {
  msw.use(getCourseAsAdminHandlers.success);
  await page.goto(editPath);

  await expect(page.getByLabel("Start date", { exact: true })).toHaveValue(
    "2026-10-01",
  );
  await expect(page.getByLabel("End time")).toHaveValue("16:00");

  await page.getByLabel("Start date", { exact: true }).fill("2026-10-02");
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page.locator("#schedule-problems")).toContainText(
    "The start time must be in the future.",
  );
  await expect(page).toHaveURL(/\/edit$/);
});

test("lists the price in effect and saves a changed future price", async ({
  page,
  msw,
}) => {
  msw.use(getCourseAsAdminHandlers.success, updateCourseHandlers.success);
  await page.goto(editPath);

  await expect(
    page.getByRole("list", { name: /^Prices in effect/ }),
  ).toContainText("(current price)");
  const price = page.getByLabel("Price", { exact: true });
  await expect(price).toHaveValue("129.00");

  await price.fill("149");
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page).toHaveURL("/");
});

/** Handlers that answer the course and image saves with success and keep what each one received. */
function makeSaveRecordingHandlers() {
  const courseBodies: Record<string, unknown>[] = [];
  let imageUploadCount = 0;
  const handlers = [
    http.put(updateCourseUrl, async ({ request }) => {
      courseBodies.push((await request.json()) as Record<string, unknown>);
      return HttpResponse.json(adminCourseWithFuturePrice);
    }),
    http.put(uploadCourseImageUrl, () => {
      imageUploadCount += 1;
      return new HttpResponse(null, { status: 204 });
    }),
  ];
  return {
    handlers,
    courseBodies,
    readImageUploadCount: () => imageUploadCount,
  };
}

test("saves the details without the image, then uploads the newly chosen image", async ({
  page,
  msw,
}) => {
  const saves = makeSaveRecordingHandlers();
  msw.use(getCourseAsAdminHandlers.success, ...saves.handlers);
  await page.goto(editPath);
  await expect(page.getByText("No image yet.", { exact: false })).toBeVisible();

  await page
    .getByLabel("Image")
    .setInputFiles("src/mocks/fixtures/course-image.png");
  await expect(page.getByAltText("Preview of the chosen image")).toBeVisible();
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page).toHaveURL("/");
  expect(saves.courseBodies).toHaveLength(1);
  expect(saves.courseBodies[0]).not.toHaveProperty("image");
  expect(saves.readImageUploadCount()).toBe(1);
});

test("shows the stored image and uploads nothing when only the name changes", async ({
  page,
  msw,
}) => {
  const saves = makeSaveRecordingHandlers();
  msw.use(
    getCourseAsAdminHandlers.withImage,
    getCourseImageAsAdminHandlers.success,
    ...saves.handlers,
  );
  await page.goto(editPath);
  await expect(page.getByAltText("Current course image")).toBeVisible();

  await page.getByLabel("Course name", { exact: true }).fill("A better name");
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page).toHaveURL("/");
  expect(saves.courseBodies).toHaveLength(1);
  expect(saves.readImageUploadCount()).toBe(0);
});

for (const scenario of ["notFound", "invalidId"] as const) {
  test(`shows the 404 page for ${scenario}`, async ({ page, msw }) => {
    msw.use(getCourseAsAdminHandlers[scenario]);

    const response = await page.goto(editPath);

    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("button", { name: "Save changes" }),
    ).toHaveCount(0);
  });
}

test("shows the API's title and detail for any other problem", async ({
  page,
  msw,
}) => {
  msw.use(getCourseAsAdminHandlers.error);

  await page.goto(editPath);

  const alert = page
    .getByRole("alert")
    .filter({ hasText: "Internal server error" });
  await expect(alert).toContainText("We couldn't load this course right now.");
  await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(
    0,
  );
});
