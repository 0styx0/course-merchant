import type { Locator, Page } from "@playwright/test";
import msw from "next/experimental/testmode/playwright/msw.js";

import { getCourseAsAdminHandlers } from "@/mocks/handlers/admin-courses/get-course-as-admin";
import { coursesSuccess } from "@/mocks/handlers/courses/list-courses";

import { readRootToken, toRgb } from "../contrast/measure-contrast";
import { openFormPage } from "../admin-courses/open-form-page";

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
  await openFormPage(page, editPath);
});

async function expectRingLayers(element: Locator, page: Page, token: string) {
  // The colour transition takes 150ms, so the ring needs a moment. The two
  // layers are the 2px gap in the page colour and the ring (4px with the gap).
  await expect
    .poll(async () =>
      (await readVisibleShadowLayers(element)).map((layer) =>
        layer.replace(/^\w+\([^)]*\) /, ""),
      ),
    )
    .toEqual(["0px 0px 0px 2px", "0px 0px 0px 4px"]);

  const [, ringLayer] = await readVisibleShadowLayers(element);
  const ringColour = toRgb(ringLayer.replace(/ [^)]*$/, ""));
  const tokenColour = await readRootToken(page, token);
  expect(ringColour.r).toBeCloseTo(tokenColour.r, 1);
  expect(ringColour.g).toBeCloseTo(tokenColour.g, 1);
  expect(ringColour.b).toBeCloseTo(tokenColour.b, 1);
}

// Each test reads several controls on one page load; jsdom applies no CSS.
test("Save, Course name and the time zone box are 48px high, and the boxes have the --card fill", async ({
  page,
}) => {
  const save = page.getByRole("button", { name: "Save changes" });
  expect(await readStyle(save, "height")).toBe("48px");

  const card = await readRootToken(page, "--card");
  const boxes = [
    page.getByLabel("Course name", { exact: true }),
    page.getByRole("combobox", { name: "Time zone" }),
  ];
  for (const box of boxes) {
    // The time zone box sits inside a group that draws the border and fill.
    const frame = box.locator(
      "xpath=ancestor-or-self::*[@data-slot='input-group' or @data-slot='input'][1]",
    );
    expect(await readStyle(frame, "height")).toBe("48px");
    expect(toRgb(await readStyle(frame, "background-color"))).toEqual(card);
  }
});

test("Tab shows the --ring ring on the status radio, then a 2px --primary ring 2px off Save", async ({
  page,
}) => {
  const radio = page.getByRole("radio", { checked: true });
  await tabUntilFocused(page, radio);
  await expectRingLayers(radio, page, "--ring");

  const save = page.getByRole("button", { name: "Save changes" });
  await tabUntilFocused(page, save);
  await expectRingLayers(save, page, "--primary");
});

test("a mouse click into Course name shows the ring, and pressing the mouse on Save shows none", async ({
  page,
}) => {
  const name = page.getByLabel("Course name", { exact: true });
  await name.click();
  await expectRingLayers(name, page, "--ring");

  const save = page.getByRole("button", { name: "Save changes" });
  await save.hover();
  await page.mouse.down();
  await expect(save).toBeFocused();
  // Moving off before the release sends no click, so the form submits nothing.
  await page.mouse.move(0, 0);
  await page.mouse.up();
  await expect.poll(() => readVisibleShadowLayers(save)).toEqual([]);
});
