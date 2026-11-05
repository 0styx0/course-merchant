import type { Locator } from "@playwright/test";
import { formatHex, wcagContrast } from "culori";
import msw from "next/experimental/testmode/playwright/msw.js";

import { getCourseAsAdminHandlers } from "@/mocks/handlers/get-course-as-admin";
import { coursesSuccess } from "@/mocks/handlers/list-courses";
import {
  compositeOver,
  readRootToken,
  toRgb,
} from "../contrast/measure-contrast";
import { openFormPage } from "./open-form-page";

const { test, expect } = msw;

test.use({
  mswHandlers: [[coursesSuccess], { scope: "test" }],
});

const createPath = "/admin/courses/new";
const editPath = "/admin/courses/3f0c1c1e-8f4e-4c3e-9a57-0d6a4f0b9a11/edit";

/** WCAG 1.4.11: borders and icons that identify a control need 3:1. */
const minimumContrast = 3;

type ComputedColours = { colour: string; sectionBackground: string };

/** Reads one computed colour of the element and the background of the section holding it. */
function readColours(element: Locator, cssProperty: string) {
  return element.evaluate(
    (node, property): ComputedColours => ({
      colour: getComputedStyle(node).getPropertyValue(property),
      sectionBackground: getComputedStyle(
        node.closest("fieldset") ?? document.body,
      ).backgroundColor,
    }),
    cssProperty,
  );
}

/** The contrast of the element's colour against its section over the cream page. */
async function measureContrast(element: Locator, cssProperty: string) {
  const { colour, sectionBackground } = await readColours(element, cssProperty);
  const pageBackground = await readRootToken(element.page(), "--background");
  const background = compositeOver(toRgb(sectionBackground), pageBackground);
  const foreground = compositeOver(toRgb(colour), background);
  return {
    ratio: wcagContrast(foreground, background),
    colour: formatHex(foreground),
  };
}

/** Polls, because borders ease to their focused colour over a short transition. */
async function expectBorderContrast(element: Locator) {
  await expect
    .poll(
      async () => (await measureContrast(element, "border-top-color")).ratio,
    )
    .toBeGreaterThanOrEqual(minimumContrast);
}

/** The contrast of an icon's text colour against its section; read once, because an icon has no transition. */
async function expectIconContrast(icon: Locator) {
  const { ratio } = await measureContrast(icon, "color");
  expect(ratio).toBeGreaterThanOrEqual(minimumContrast);
}

test.describe("create page", () => {
  test.beforeEach(async ({ page }) => {
    await openFormPage(page, createPath);
  });

  test("the Course name box border reaches 3:1", async ({ page }) => {
    await expectBorderContrast(page.getByLabel("Course name", { exact: true }));
  });

  test("a date box border reaches 3:1", async ({ page }) => {
    await expectBorderContrast(page.getByLabel("Start date", { exact: true }));
  });

  test("the description editor border reaches 3:1", async ({ page }) => {
    await expectBorderContrast(page.locator(".description-content"));
  });

  test("a focused box's border reaches 3:1", async ({ page }) => {
    const name = page.getByLabel("Course name", { exact: true });
    await name.focus();
    await expectBorderContrast(name);
  });

  test("the cross beside an invalid field reaches 3:1", async ({ page }) => {
    const name = page.getByLabel("Course name", { exact: true });
    await name.fill("x");
    await name.fill("");
    await name.blur();
    await expectIconContrast(
      page.getByRole("img", { name: "Needs a fix" }).first(),
    );
  });

  test("the check beside a valid field reaches 3:1", async ({ page }) => {
    const name = page.getByLabel("Course name", { exact: true });
    await name.fill("A valid course name");
    await name.blur();
    await expectIconContrast(
      page.getByRole("img", { name: "Looks good" }).first(),
    );
  });
});

test.describe("edit page", () => {
  test.beforeEach(async ({ page, msw }) => {
    msw.use(getCourseAsAdminHandlers.success);
    await openFormPage(page, editPath);
    await expect(
      page.getByLabel("Course name", { exact: true }),
    ).not.toHaveValue("");
  });

  // The greyed-out Deleted circle is left out: it is disabled, which WCAG exempts.
  test("an unchecked status circle border reaches 3:1", async ({ page }) => {
    const unchecked = page
      .getByRole("radio", { checked: false, disabled: false })
      .first();
    await expectBorderContrast(unchecked);
  });

  test("the checked status circle keeps the primary colour", async ({
    page,
  }) => {
    const checked = page.getByRole("radio", { checked: true });
    const { colour } = await readColours(checked, "border-top-color");
    const { colour: primary } = await readColours(
      page.getByRole("button", { name: "Save changes" }),
      "background-color",
    );
    expect(formatHex(toRgb(colour))).toBe(formatHex(toRgb(primary)));
  });
});
