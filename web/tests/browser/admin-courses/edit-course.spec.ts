import type { Locator, Page } from "@playwright/test";
import msw from "next/experimental/testmode/playwright/msw.js";

import { getCourseAsAdminHandlers } from "@/mocks/handlers/admin-courses/get-course-as-admin";
import { coursesSuccess } from "@/mocks/handlers/courses/list-courses";

import { openFormPage } from "./open-form-page";

const { test, expect } = msw;

test.use({
  mswHandlers: [[coursesSuccess], { scope: "test" }],
});

const editPath = "/admin/courses/3f0c1c1e-8f4e-4c3e-9a57-0d6a4f0b9a11/edit";

test("shows the 404 page for a course the API does not know", async ({
  page,
  msw,
}) => {
  msw.use(getCourseAsAdminHandlers.notFound);

  const response = await page.goto(editPath);

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(
    0,
  );
});

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

test("says the course was saved as a draft on arrival from create, once", async ({
  page,
  msw,
}) => {
  msw.use(getCourseAsAdminHandlers.success);

  await openFormPage(page, `${editPath}?saved=draft`);

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

async function expectSaveStaysOnScreen(page: Page, screenHeight: number) {
  const save = page.getByRole("button", { name: "Save changes" });
  await expect(save).toBeInViewport({ ratio: 1 });
  await expect(findSaveBar(page)).toHaveCSS("position", "sticky");

  await page.getByLabel("Start date", { exact: true }).scrollIntoViewIfNeeded();
  await expect(save).toBeInViewport({ ratio: 1 });
  expect(await readBottomEdge(findSaveBar(page))).toBeLessThanOrEqual(
    screenHeight,
  );

  await scrollToEnd(page);
  await expect(save).toBeInViewport({ ratio: 1 });
}

async function expectLastFieldAboveBar(page: Page) {
  const barTop = (await findSaveBar(page).boundingBox())!.y;
  expect(await readBottomEdge(findLastPrice(page))).toBeLessThanOrEqual(barTop);
}

async function expectErrorListFocusBetweenBoxAndBar(page: Page) {
  await page.getByLabel("Start date", { exact: true }).fill("");
  await page.getByRole("button", { name: "Save changes" }).click();
  const errorBox = page.getByRole("alert").filter({ hasText: "Fix" });
  await expect(errorBox).toBeVisible();
  await scrollToEnd(page);

  await errorBox.getByRole("button", { name: "Start date" }).click();
  const startDate = page.getByLabel("Start date", { exact: true });
  await expect(startDate).toBeFocused();

  const focusedBox = (await startDate.boundingBox())!;
  expect(focusedBox.y).toBeGreaterThanOrEqual(await readBottomEdge(errorBox));
  expect(focusedBox.y + focusedBox.height).toBeLessThanOrEqual(
    (await findSaveBar(page).boundingBox())!.y,
  );
}

// Layout depends on the screen size, so each size gets one test; the checks
// within it run in order on one page load.
for (const size of screenSizes) {
  test(`on a ${size.name} screen the save bar stays on screen and covers no field`, async ({
    page,
    msw,
  }) => {
    msw.use(getCourseAsAdminHandlers.success);
    await page.setViewportSize({ width: size.width, height: size.height });
    await openFormPage(page, editPath);

    await expectSaveStaysOnScreen(page, size.height);
    // Still scrolled to the end: the bar settles below the last field.
    await expectLastFieldAboveBar(page);

    await page.evaluate(() => window.scrollTo(0, 0));
    await findLastPrice(page).focus();
    await expectLastFieldAboveBar(page);

    await expectErrorListFocusBetweenBoxAndBar(page);
  });
}

test("keeps Save at the end of the create form, with no bar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 400, height: 800 });
  await openFormPage(page, "/admin/courses/new");

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
