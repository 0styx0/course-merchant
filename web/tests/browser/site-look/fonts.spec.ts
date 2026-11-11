import msw from "next/experimental/testmode/playwright/msw.js";

import { coursesSuccess } from "@/mocks/handlers/courses/list-courses";

const { test, expect } = msw;

test.use({
  mswHandlers: [[coursesSuccess], { scope: "test" }],
});

const desktopWidth = 1280;
const phoneWidth = 400;

// The root layout loads both fonts and every h1 shares one class list, so one
// page proves each; jsdom applies no CSS and loads no font files.
test("the body font is DM Sans", async ({ page }) => {
  await page.goto("/");
  const family = await page.evaluate(
    () => getComputedStyle(document.body).fontFamily,
  );
  expect(family).toMatch(/DM Sans/);
});

test("an h1 is Playfair Display at 44px from md up and 36px on a phone", async ({
  page,
}) => {
  const heading = page.getByRole("heading", { name: "Courses", level: 1 });
  const readStyle = () =>
    heading.evaluate((node) => {
      const style = getComputedStyle(node);
      return {
        family: style.fontFamily,
        weight: style.fontWeight,
        size: style.fontSize,
      };
    });

  await page.setViewportSize({ width: desktopWidth, height: 800 });
  await page.goto("/");
  const desktop = await readStyle();
  expect(desktop.family).toMatch(/Playfair/);
  expect(desktop.weight).toBe("400");
  expect(desktop.size).toBe("44px");

  await page.setViewportSize({ width: phoneWidth, height: 800 });
  expect((await readStyle()).size).toBe("36px");
});

test("the page requests no font from Google", async ({ page }) => {
  const requestedUrls: string[] = [];
  page.on("request", (request) => requestedUrls.push(request.url()));

  // networkidle lets late font requests arrive before the assertion reads them
  // eslint-disable-next-line playwright/no-networkidle
  await page.goto("/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  const hostnames = requestedUrls.map((url) => new URL(url).hostname);
  expect(hostnames).not.toContain("fonts.googleapis.com");
  expect(hostnames).not.toContain("fonts.gstatic.com");
});
