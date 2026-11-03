import type { Page } from "@playwright/test";
import msw from "next/experimental/testmode/playwright/msw.js";

const { expect } = msw;

/** Console errors (a hydration warning is one) seen while the page is used. */
export function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function chooseImage(page: Page) {
  await page
    .getByLabel("Image", { exact: true })
    .setInputFiles("src/mocks/fixtures/course-image.png");
  await expect(page.getByAltText("Preview of the chosen image")).toBeVisible();
}

export async function fillValidForm(page: Page) {
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
  await chooseImage(page);
}
