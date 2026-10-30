import type { Page } from "@playwright/test";
import msw from "next/experimental/testmode/playwright/msw.js";

import { getCourseAsAdminHandlers } from "@/mocks/handlers/get-course-as-admin";
import { coursesSuccess } from "@/mocks/handlers/list-courses";
import { makeTwoRoundsRefusalHandler } from "@/mocks/handlers/update-course";

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
