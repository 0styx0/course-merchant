import { readFileSync } from "node:fs";
import msw from "next/experimental/testmode/playwright/msw.js";

import {
  createCourseSuccess,
  createCourseValidationFailed,
} from "@/mocks/handlers/create-course";
import { getCourseAsAdminHandlers } from "@/mocks/handlers/get-course-as-admin";
import { coursesSuccess } from "@/mocks/handlers/list-courses";
import { updateCourseSuccess } from "@/mocks/handlers/update-course";
import {
  uploadCourseImageError,
  uploadCourseImageSuccess,
} from "@/mocks/handlers/upload-course-image";

import { collectConsoleErrors, fillValidForm } from "./fill-valid-course-form";

const { test, expect } = msw;

const editPageUrl = /\/admin\/courses\/[^/]+\/edit$/;

test.use({
  mswHandlers: [[coursesSuccess], { scope: "test" }],
});

test("saves a new course and opens its edit page", async ({ page, msw }) => {
  msw.use(
    createCourseSuccess,
    uploadCourseImageSuccess,
    getCourseAsAdminHandlers.success,
  );
  const consoleErrors = collectConsoleErrors(page);

  await page.goto("/admin/courses/new");
  await fillValidForm(page);
  await expect(page.getByText(/Lasts 2 hours 30 minutes\./)).toBeVisible();
  await expect(
    page.getByText("$79.50 from when the course is published"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Save as draft" }).click();

  await expect(page).toHaveURL(editPageUrl);
  expect(consoleErrors).toEqual([]);
});

test("shows the API's refusal and lets the admin try again", async ({
  page,
  msw,
}) => {
  msw.use(createCourseValidationFailed);
  const consoleErrors = collectConsoleErrors(page);

  await page.goto("/admin/courses/new");
  await fillValidForm(page);

  const save = page.getByRole("button", { name: "Save as draft" });
  await save.click();

  // Next's route announcer is also an alert, so find ours by its text
  const summary = page
    .getByRole("alert")
    .filter({ hasText: "Validation failed" });
  await expect(summary).toBeVisible();
  await expect(summary).toContainText("The request contains 2 invalid fields.");
  await expect(page.getByLabel("Price", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page).toHaveURL(/\/admin\/courses\/new$/);
  await expect(save).toBeEnabled();
  expect(consoleErrors).toEqual([]);
});

test("keeps the draft when the image upload fails and uploads on retry", async ({
  page,
  msw,
}) => {
  msw.use(createCourseSuccess, uploadCourseImageError);
  const consoleErrors = collectConsoleErrors(page);

  await page.goto("/admin/courses/new");
  await fillValidForm(page);

  const save = page.getByRole("button", { name: "Save as draft" });
  await save.click();

  const summary = page
    .getByRole("alert")
    .filter({ hasText: "Image upload failed" });
  await expect(summary).toContainText("The course was saved as a draft");
  await expect(page).toHaveURL(/\/admin\/courses\/new$/);

  // The retry updates the saved draft, then uploads
  msw.use(
    updateCourseSuccess,
    uploadCourseImageSuccess,
    getCourseAsAdminHandlers.success,
  );
  await save.click();

  await expect(page).toHaveURL(editPageUrl);
  expect(consoleErrors).toEqual([]);
});

test("keeps bold and a list when pasting from Google Docs", async ({
  page,
}) => {
  const html = readFileSync(
    "src/mocks/fixtures/google-docs-paste.html",
    "utf8",
  );

  await page.goto("/admin/courses/new");
  await expect(page.getByRole("button", { name: "Bold" })).toBeEnabled();
  const description = page.getByLabel("Description");
  await description.click();
  await description.evaluate((editor, html) => {
    const data = new DataTransfer();
    data.setData("text/html", html);
    editor.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    );
  }, html);

  await expect(description.locator("strong")).toHaveText("Bold text");
  await expect(description.locator("ul li")).toHaveCount(3);
  await expect(description.locator("h2")).toHaveText("Heading two");
});

test("draws each section as a card at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto("/admin/courses/new");

  const sections = page.locator("form fieldset");
  await expect(sections).toHaveCount(4);

  const legendsAreInsideTheirCard = await sections.evaluateAll((cards) =>
    cards.every((card) => {
      const legend = card.querySelector(":scope > legend");
      if (!legend) return false;
      const border = parseFloat(getComputedStyle(card).borderTopWidth);
      return (
        border > 0 &&
        legend.getBoundingClientRect().top >=
          card.getBoundingClientRect().top + border
      );
    }),
  );
  expect(legendsAreInsideTheirCard).toBe(true);

  const hasHorizontalScroll = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalScroll).toBe(false);
});
