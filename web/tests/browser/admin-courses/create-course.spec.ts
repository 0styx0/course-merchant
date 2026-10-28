import type { Page } from "@playwright/test";
import msw from "next/experimental/testmode/playwright/msw.js";

import {
  createCourseSuccess,
  createCourseValidationFailed,
} from "@/mocks/handlers/create-course";
import { coursesSuccess } from "@/mocks/handlers/list-courses";

const { test, expect } = msw;

test.use({
  mswHandlers: [[coursesSuccess], { scope: "test" }],
});

/** Console errors (a hydration warning is one) seen while the page is used. */
function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function fillValidForm(page: Page) {
  await page
    .getByLabel("Course name", { exact: true })
    .fill("Intro to Emptiness");
  await page.getByLabel("Summary", { exact: true }).fill("A short summary.");

  // The toolbar is enabled once the editor exists in the browser
  const bold = page.getByRole("button", { name: "Bold" });
  await expect(bold).toBeEnabled();
  const description = page.getByLabel("Description");
  await description.click();
  await page.keyboard.type("Welcome to the ");
  await bold.click();
  await page.keyboard.type("course");
  await expect(description.locator("strong")).toHaveText("course");

  await page.keyboard.press("ControlOrMeta+a");
  await page.getByRole("button", { name: "Link", exact: true }).click();
  await page.getByLabel("Link address").fill("https://example.com/welcome");
  await page.keyboard.press("Enter");
  await expect(description.locator("a")).toHaveAttribute(
    "href",
    "https://example.com/welcome",
  );

  await page.getByLabel("Content link").fill("https://example.com/c");
  await page.getByLabel("Start date", { exact: true }).fill("2099-01-10");
  await page.getByLabel("Start time", { exact: true }).fill("09:00");
  await page.getByLabel("End date", { exact: true }).fill("2099-01-10");
  await page.getByLabel("End time", { exact: true }).fill("11:30");
  await page.getByLabel("Price", { exact: true }).fill("79.50");
}

test("saves a new course and goes to the home page", async ({ page, msw }) => {
  msw.use(createCourseSuccess);
  const consoleErrors = collectConsoleErrors(page);

  await page.goto("/admin/courses/new");
  await fillValidForm(page);
  await expect(page.getByText("Lasts 2 hours 30 minutes")).toBeVisible();

  await page.getByRole("button", { name: "Save course" }).click();

  await expect(page).toHaveURL("/");
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

  const save = page.getByRole("button", { name: "Save course" });
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
