import msw from "next/experimental/testmode/playwright/msw.js";

import { longCourse } from "@/mocks/fixtures/courses";
import { courseByIdSuccess } from "@/mocks/handlers/courses/get-course";
import { courseImageSuccess } from "@/mocks/handlers/courses/get-course-image";

const { test, expect } = msw;

const stickyTopPx = 96;

test.use({
  mswHandlers: [[courseByIdSuccess, courseImageSuccess], { scope: "test" }],
});

test("keeps the details column 96px from the top while the description scrolls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/courses/${longCourse.id}`);

  const enrollButton = page.getByRole("button", { name: /^Enroll/ });
  await expect(enrollButton).toBeVisible();
  await page.mouse.wheel(0, 600);

  const sideColumn = page.getByRole("complementary");
  await expect
    .poll(async () => (await sideColumn.boundingBox())?.y)
    .toBe(stickyTopPx);
});

test("stacks image, title, summary, details and description on a phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto(`/courses/${longCourse.id}`);

  const topOf = async (locator: ReturnType<typeof page.locator>) =>
    (await locator.boundingBox())!.y;
  const image = await topOf(page.locator("article img"));
  const title = await topOf(page.getByRole("heading", { level: 1 }));
  const summary = await topOf(
    page.getByText(longCourse.summary, { exact: true }),
  );
  const details = await topOf(page.getByRole("complementary"));
  const button = await topOf(page.getByRole("button", { name: /^Enroll/ }));
  const description = await topOf(
    page.getByRole("heading", { level: 2, name: "Why this course exists" }),
  );

  expect([image, title, summary, details, button, description]).toEqual(
    [image, title, summary, details, button, description].toSorted(
      (first, second) => first - second,
    ),
  );
  expect(
    new Set([image, title, summary, details, button, description]).size,
  ).toBe(6);
});

test("wraps a long title without horizontal scroll at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(`/courses/${longCourse.id}`);

  const title = page.getByRole("heading", { level: 1 });
  await expect(title).toBeVisible();
  const lineCount = await title.evaluate(
    (element) =>
      element.getBoundingClientRect().height /
      parseFloat(getComputedStyle(element).lineHeight),
  );
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

  expect(lineCount).toBeGreaterThan(1.5);
  expect(overflow).toBeLessThanOrEqual(0);
});
