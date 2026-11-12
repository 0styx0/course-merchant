import msw from "next/experimental/testmode/playwright/msw.js";

import { longTextCourse } from "@/mocks/fixtures/courses";
import { courseByIdSuccess } from "@/mocks/handlers/courses/get-course";
import { courseImageSuccess } from "@/mocks/handlers/courses/get-course-image";

const { test, expect } = msw;

const ENROLL_BUTTONS = /^Enroll/;

test.use({
  mswHandlers: [[courseByIdSuccess, courseImageSuccess], { scope: "test" }],
});

// jsdom can't show scrolling or the breakpoint: it has no layout, so only a real browser shows the bar follow the page.
test("shows the bar once the button scrolls away, hides it back at the top, opens the fields when tapped and stays hidden at 1280px", async ({
  page,
}) => {
  const bar = page.locator("[data-phone-buy-bar]");
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto(`/courses/${longTextCourse.id}`);
  await expect(
    page.getByRole("button", { name: ENROLL_BUTTONS }),
  ).toBeVisible();
  await page.mouse.wheel(0, 3000);
  await expect(bar).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(bar).toBeHidden();

  await page.mouse.wheel(0, 3000);
  await bar.getByRole("button", { name: ENROLL_BUTTONS }).click();
  await expect(page.getByLabel("Name")).toBeFocused();
  await expect(bar).toBeHidden();

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.mouse.wheel(0, 3000);
  await expect(bar).toBeHidden();
});

// jsdom can't show the layout: it never scrolls or measures, so only a real browser shows the footer clear of a fixed bar.
test("keeps the footer's Contact link above the bar at the bottom of a phone page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto(`/courses/${longTextCourse.id}`);
  await expect(
    page.getByRole("button", { name: ENROLL_BUTTONS }),
  ).toBeVisible();

  await page.mouse.wheel(0, 100000);

  const bar = page.locator("[data-phone-buy-bar]");
  await expect(bar).toBeVisible();
  // The bar adds padding under the page, so scroll to the new bottom.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const contact = page.getByRole("link", { name: "Contact" });
  await expect
    .poll(async () => {
      const [contactBox, barBox] = await Promise.all([
        contact.boundingBox(),
        bar.boundingBox(),
      ]);
      expect(contactBox).not.toBeNull();
      expect(barBox).not.toBeNull();
      if (!contactBox || !barBox) return false;
      return contactBox.y + contactBox.height <= barBox.y;
    })
    .toBe(true);
});

// jsdom can't show layout or scrolling: it never scrolls or measures, so only a real browser shows the focused Name box land below the sticky header.
test("lands the Name box fully below the header after the bar is tapped deep in a long page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto(`/courses/${longTextCourse.id}`);
  await expect(
    page.getByRole("button", { name: ENROLL_BUTTONS }),
  ).toBeVisible();
  await page.mouse.wheel(0, 3000);

  const bar = page.locator("[data-phone-buy-bar]");
  await bar.getByRole("button", { name: ENROLL_BUTTONS }).click();

  const name = page.getByLabel("Name");
  await expect(name).toBeFocused();
  const header = page.locator("[data-site-header]");
  await expect
    .poll(async () => {
      const [nameBox, headerBox] = await Promise.all([
        name.boundingBox(),
        header.boundingBox(),
      ]);
      expect(nameBox).not.toBeNull();
      expect(headerBox).not.toBeNull();
      if (!nameBox || !headerBox) return false;
      // A header pinned at the top makes the comparison below mean something.
      return headerBox.y === 0 && nameBox.y >= headerBox.y + headerBox.height;
    })
    .toBe(true);
  await expect(name).toBeInViewport({ ratio: 1 });
});
