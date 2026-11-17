import type { Page } from "@playwright/test";
import msw from "next/experimental/testmode/playwright/msw.js";

import { getCourseAsAdminHandlers } from "@/mocks/handlers/admin-courses/get-course-as-admin";

const { test, expect } = msw;

const adminCoursePath = "/admin/courses/3f0c1c1e-8f4e-4c3e-9a57-0d6a4f0b9a11";

// How far the page reaches past the screen's right edge; 0 or less means no sideways scroll.
function pageSideOverflow(page: Page) {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
}

test("shows the 404 page for a course the API does not know", async ({
  page,
  msw,
}) => {
  msw.use(getCourseAsAdminHandlers.notFound);

  const response = await page.goto(adminCoursePath);

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Students" })).toHaveCount(0);
});

// jsdom lays nothing out, so only a browser can show the page staying inside the screen.
test("does not scroll the page sideways at 400px", async ({ page, msw }) => {
  msw.use(getCourseAsAdminHandlers.withEveryStudentCase);
  await page.setViewportSize({ width: 400, height: 800 });

  await page.goto(adminCoursePath);

  await expect(
    page.getByRole("heading", { name: "Students (8)" }),
  ).toBeVisible();
  expect(await pageSideOverflow(page)).toBeLessThanOrEqual(0);
});

// jsdom ignores Tailwind's hiding, so only a browser shows which layout a width gets.
test("shows the cards below 768px and the table from 768px", async ({
  page,
  msw,
}) => {
  msw.use(getCourseAsAdminHandlers.withEveryStudentCase);
  const studentTable = page.getByRole("table");
  const studentCards = page.getByRole("list").filter({
    has: page.getByText("Dana Cohen", { exact: true }),
  });

  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto(adminCoursePath);
  await expect(studentCards.first()).toBeVisible();
  await expect(studentTable).toBeHidden();

  await page.setViewportSize({ width: 768, height: 800 });
  await expect(studentTable).toBeVisible();
  await expect(studentCards.first()).toBeHidden();
});

// jsdom lays nothing out, so only a browser can show the page staying inside the screen.
test("scrolls the table inside its own box, not the page, at 768px", async ({
  page,
  msw,
}) => {
  msw.use(getCourseAsAdminHandlers.withEveryStudentCase);
  await page.setViewportSize({ width: 768, height: 800 });

  await page.goto(adminCoursePath);

  await expect(page.getByRole("table")).toBeVisible();
  expect(await pageSideOverflow(page)).toBeLessThanOrEqual(0);
  const tableBox = page.locator('[data-slot="table-container"]');
  const tableBoxOverflow = await tableBox.evaluate(
    (box) => box.scrollWidth - box.clientWidth,
  );
  expect(tableBoxOverflow).toBeGreaterThan(0);
});
