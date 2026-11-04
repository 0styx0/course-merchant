import type { Locator, Page } from "@playwright/test";
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

/** A save keeps the admin on the edit page, which says "Saved". */
async function expectStayedWithSavedNote(page: Page) {
  await expect(page).toHaveURL(editPath);
  await expect(page.getByRole("status")).toContainText("Saved");
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
  await expectStayedWithSavedNote(page);
  expect(consoleErrors).toEqual([]);
});

test("fills the schedule boxes and shows a past start under the start time box", async ({
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

  await expect(
    page
      .getByLabel("Start time", { exact: true })
      .locator("xpath=ancestor::*[@data-invalid][1]"),
  ).toContainText("The start time must be in the future.");
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

  await expectStayedWithSavedNote(page);
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

  await expectStayedWithSavedNote(page);
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

  await expectStayedWithSavedNote(page);
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

test("asks before deleting, then saves the course as deleted", async ({
  page,
  msw,
}) => {
  const saves = makeSaveRecordingHandlers();
  msw.use(getCourseAsAdminHandlers.success, ...saves.handlers);
  await page.goto(editPath);

  await page.getByRole("radio", { name: "Deleted" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Delete this course?" });
  await expect(dialog).toBeVisible();
  expect(saves.courseBodies).toHaveLength(0);
  await dialog.getByRole("button", { name: "Delete course" }).click();

  await expectStayedWithSavedNote(page);
  expect(saves.courseBodies).toHaveLength(1);
  expect(saves.courseBodies[0]).toMatchObject({ status: "deleted" });
});

test("shows the API's refusal under Status when a student enrolled after the page loaded", async ({
  page,
  msw,
}) => {
  msw.use(getCourseAsAdminHandlers.success, updateCourseHandlers.deleteRefused);
  await page.goto(editPath);

  await page.getByRole("radio", { name: "Deleted" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await page
    .getByRole("alertdialog", { name: "Delete this course?" })
    .getByRole("button", { name: "Delete course" })
    .click();

  await expect(
    page
      .getByRole("group", { name: "Status" })
      .getByText("Students are enrolled in this course. Archive it instead."),
  ).toBeVisible();
});

test("greys out Deleted on a course with students", async ({ page, msw }) => {
  msw.use(getCourseAsAdminHandlers.withEnrollment);

  await page.goto(editPath);

  await expect(page.getByRole("radio", { name: "Deleted" })).toBeDisabled();
  await expect(
    page.getByText("Students are enrolled. Archive it instead."),
  ).toBeVisible();
});

test("says the course was saved as a draft on arrival from create, once", async ({
  page,
  msw,
}) => {
  msw.use(getCourseAsAdminHandlers.success);

  await page.goto(`${editPath}?saved=draft`);

  await expect(page.getByRole("status")).toHaveText("Saved as a draft");
  await expect(page).toHaveURL(editPath);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Edit course" }),
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved" }),
  ).toHaveCount(0);
});

const screenSizes = [
  { name: "phone", width: 400, height: 800 },
  { name: "desktop", width: 1280, height: 800 },
];

const scrollToEnd = (page: Page) =>
  page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

const findSaveBar = (page: Page) => page.getByTestId("save-bar");

const findLastPrice = (page: Page) =>
  page.getByLabel("Price", { exact: true }).last();

async function readBottomEdge(locator: Locator) {
  const box = (await locator.boundingBox())!;
  return box.y + box.height;
}

for (const size of screenSizes) {
  test.describe(`save bar on a ${size.name} screen`, () => {
    test.beforeEach(async ({ page, msw }) => {
      msw.use(getCourseAsAdminHandlers.success);
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.goto(editPath);
      await page.waitForLoadState("networkidle");
    });

    test("keeps Save on screen at the top, in the middle and at the end", async ({
      page,
    }) => {
      const save = page.getByRole("button", { name: "Save changes" });
      await expect(save).toBeInViewport({ ratio: 1 });
      await expect(findSaveBar(page)).toHaveCSS("position", "sticky");

      await page
        .getByLabel("Start date", { exact: true })
        .scrollIntoViewIfNeeded();
      await expect(save).toBeInViewport({ ratio: 1 });
      const barBottomInMiddle = (await findSaveBar(page).boundingBox())!.y;
      expect(
        barBottomInMiddle + (await findSaveBar(page).boundingBox())!.height,
      ).toBeLessThanOrEqual(size.height);

      await scrollToEnd(page);
      await expect(save).toBeInViewport({ ratio: 1 });
    });

    test("settles below the last field at the end and covers none", async ({
      page,
    }) => {
      await scrollToEnd(page);
      const barTop = (await findSaveBar(page).boundingBox())!.y;
      expect(await readBottomEdge(findLastPrice(page))).toBeLessThanOrEqual(
        barTop,
      );
    });

    test("shows a field reached by focus fully above the bar", async ({
      page,
    }) => {
      await findLastPrice(page).focus();
      const barTop = (await findSaveBar(page).boundingBox())!.y;
      expect(await readBottomEdge(findLastPrice(page))).toBeLessThanOrEqual(
        barTop,
      );
    });

    test("shows a field chosen from the error list fully below the top box", async ({
      page,
    }) => {
      await page.getByLabel("Start date", { exact: true }).fill("");
      await page.getByRole("button", { name: "Save changes" }).click();
      const errorBox = page.getByRole("alert").filter({ hasText: "Fix" });
      await expect(errorBox).toBeVisible();
      await scrollToEnd(page);

      await errorBox.getByRole("button").first().click();

      const focusedBox = (await page.locator(":focus").boundingBox())!;
      expect(focusedBox.y).toBeGreaterThanOrEqual(
        await readBottomEdge(errorBox),
      );
      expect(focusedBox.y + focusedBox.height).toBeLessThanOrEqual(
        (await findSaveBar(page).boundingBox())!.y,
      );
    });
  });
}

test("keeps Save at the end of the create form, with no bar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto("/admin/courses/new");

  const save = page.getByRole("button", { name: /^Save/ });
  await expect(save).not.toBeInViewport();
  const position = await save.evaluate((button) => {
    for (let node = button.parentElement; node; node = node.parentElement) {
      if (getComputedStyle(node).position === "sticky") return "sticky";
    }
    return "none";
  });
  expect(position).toBe("none");
});
