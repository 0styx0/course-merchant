import msw from "next/experimental/testmode/playwright/msw.js";

import { getCourseAsAdminHandlers } from "@/mocks/handlers/get-course-as-admin";
import { coursesSuccess } from "@/mocks/handlers/list-courses";

const { test, expect } = msw;

test.use({
  mswHandlers: [[coursesSuccess], { scope: "test" }],
});

const createPath = "/admin/courses/new";
const editPath = "/admin/courses/3f0c1c1e-8f4e-4c3e-9a57-0d6a4f0b9a11/edit";

const desktopWidth = 1280;
const phoneWidth = 400;

test("the body font is DM Sans on the home page and the admin pages", async ({
  page,
}) => {
  for (const path of ["/", createPath]) {
    await page.goto(path);
    const family = await page.evaluate(
      () => getComputedStyle(document.body).fontFamily,
    );
    expect(family, path).toMatch(/DM Sans/);
  }
});

const adminTitles = [
  { path: createPath, title: "New course" },
  { path: editPath, title: "Edit course" },
];

for (const { path, title } of adminTitles) {
  test(`the "${title}" title is Playfair Display on the h1 step from md up and the h2 step below`, async ({
    page,
    msw,
  }) => {
    msw.use(getCourseAsAdminHandlers.success);
    const heading = page.getByRole("heading", { name: title, level: 1 });
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
    await page.goto(path);
    const desktop = await readStyle();
    expect(desktop.family).toMatch(/Playfair/);
    expect(desktop.weight).toBe("400");
    expect(desktop.size).toBe("44px");

    await page.setViewportSize({ width: phoneWidth, height: 800 });
    expect((await readStyle()).size).toBe("36px");
  });
}

test("the pages request no font from Google", async ({ page }) => {
  const requestedUrls: string[] = [];
  page.on("request", (request) => requestedUrls.push(request.url()));

  for (const path of ["/", createPath]) {
    await page.goto(path, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
  }

  const hostnames = requestedUrls.map((url) => new URL(url).hostname);
  expect(hostnames).not.toContain("fonts.googleapis.com");
  expect(hostnames).not.toContain("fonts.gstatic.com");
});
