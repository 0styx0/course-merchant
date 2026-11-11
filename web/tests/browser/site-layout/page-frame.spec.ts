import type { Locator, Page } from "@playwright/test";
import msw from "next/experimental/testmode/playwright/msw.js";

import { longCourse } from "@/mocks/fixtures/courses";
import { courseByIdSuccess } from "@/mocks/handlers/courses/get-course";
import { courseImageSuccess } from "@/mocks/handlers/courses/get-course-image";

const { test, expect } = msw;

test.use({
  mswHandlers: [[courseByIdSuccess, courseImageSuccess], { scope: "test" }],
});

async function measureFrames(page: Page) {
  await page.goto(`/courses/${longCourse.id}`);
  const main = page.getByRole("main");
  await expect(main).toBeVisible();

  const contentLeft = async (frame: Locator) =>
    frame.evaluate((element) => {
      const { left, width } = element.getBoundingClientRect();
      const padding = parseFloat(getComputedStyle(element).paddingLeft);
      return { width, contentLeft: left + padding, padding };
    });

  return {
    main: await contentLeft(main),
    header: await contentLeft(page.getByRole("navigation", { name: "Main" })),
    footer: await contentLeft(page.getByRole("navigation", { name: "Footer" })),
  };
}

test("frames header, main and footer 1200px wide with aligned content at 1280px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const frames = await measureFrames(page);

  expect([frames.main.width, frames.header.width, frames.footer.width]).toEqual(
    [1200, 1200, 1200],
  );
  expect([
    frames.main.contentLeft,
    frames.header.contentLeft,
    frames.footer.contentLeft,
  ]).toEqual([88, 88, 88]);
  expect(frames.main.padding).toBe(48);
});

test("pads header, main and footer 24px at each side at 400px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 400, height: 800 });
  const frames = await measureFrames(page);

  expect([
    frames.main.contentLeft,
    frames.header.contentLeft,
    frames.footer.contentLeft,
  ]).toEqual([24, 24, 24]);
  expect([frames.main.width, frames.header.width, frames.footer.width]).toEqual(
    [400, 400, 400],
  );
});
