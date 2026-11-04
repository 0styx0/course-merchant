import type { Locator, Page } from "@playwright/test";
import msw from "next/experimental/testmode/playwright/msw.js";

import { getCourseAsAdminHandlers } from "@/mocks/handlers/get-course-as-admin";
import { coursesSuccess } from "@/mocks/handlers/list-courses";

import { readRootToken, toRgb } from "../contrast/measure-contrast";

const { test, expect } = msw;

test.use({
  mswHandlers: [[coursesSuccess], { scope: "test" }],
});

const editPath = "/admin/courses/3f0c1c1e-8f4e-4c3e-9a57-0d6a4f0b9a11/edit";
const maxTabPresses = 100;
const emptyShadowLayer = "0px 0px 0px 0px";

function readStyle(element: Locator, property: string) {
  return element.evaluate(
    (node, name) => getComputedStyle(node).getPropertyValue(name),
    property,
  );
}

async function tabUntilFocused(page: Page, element: Locator) {
  for (let press = 0; press < maxTabPresses; press++) {
    await page.keyboard.press("Tab");
    if (await element.evaluate((node) => node === document.activeElement)) {
      return;
    }
  }
  throw new Error(`Tab never reached the element in ${maxTabPresses} presses`);
}

/** The shadow layers with a size; Tailwind also lists empty ones. Each reads "<colour> <offsets and spread>". */
async function readVisibleShadowLayers(element: Locator) {
  const shadow = await readStyle(element, "box-shadow");
  const layers = shadow.match(/\w+\([^)]*\) [^,]*/g) ?? [];
  return layers.filter((layer) => !layer.endsWith(emptyShadowLayer));
}

test.beforeEach(async ({ page, msw }) => {
  msw.use(getCourseAsAdminHandlers.success);
  await page.goto(editPath);
});

test("the default button is 48px high", async ({ page }) => {
  const save = page.getByRole("button", { name: "Save changes" });
  expect(await readStyle(save, "height")).toBe("48px");
});

test("Tab onto Save shows a 2px --primary ring 2px off the button", async ({
  page,
}) => {
  const save = page.getByRole("button", { name: "Save changes" });
  await tabUntilFocused(page, save);

  // The colour transition takes 150ms, so the ring needs a moment. The two
  // layers are the 2px gap in the page colour and the ring (4px with the gap).
  await expect
    .poll(async () =>
      (await readVisibleShadowLayers(save)).map((layer) =>
        layer.replace(/^\w+\([^)]*\) /, ""),
      ),
    )
    .toEqual(["0px 0px 0px 2px", "0px 0px 0px 4px"]);

  const [, ringLayer] = await readVisibleShadowLayers(save);
  const ringColour = toRgb(ringLayer.replace(/ [^)]*$/, ""));
  const primary = await readRootToken(page, "--primary");
  expect(ringColour.r).toBeCloseTo(primary.r, 1);
  expect(ringColour.g).toBeCloseTo(primary.g, 1);
  expect(ringColour.b).toBeCloseTo(primary.b, 1);
});

test("pressing the mouse on Save shows no ring", async ({ page }) => {
  const save = page.getByRole("button", { name: "Save changes" });
  await save.hover();
  await page.mouse.down();
  await expect(save).toBeFocused();
  // Moving off before the release sends no click, so the form submits nothing.
  await page.mouse.move(0, 0);
  await page.mouse.up();
  await expect.poll(() => readVisibleShadowLayers(save)).toEqual([]);
});

test("the delete dialog's title is DM Sans, not Playfair", async ({ page }) => {
  await page.getByRole("radio", { name: "Deleted" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Delete this course?" });
  const title = dialog.getByText("Delete this course?").first();
  expect(await readStyle(title, "font-family")).toMatch(/^"DM Sans"/);
});
