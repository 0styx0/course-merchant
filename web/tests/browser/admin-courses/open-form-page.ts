import type { Page } from "@playwright/test";
import msw from "next/experimental/testmode/playwright/msw.js";

const { expect } = msw;

/**
 * Opens a page that holds the course form and returns once the page works.
 * The Bold button stays disabled until the description editor exists
 * (`description-toolbar.tsx`), and the editor exists only after React has
 * attached to the page. Text typed earlier gets lost.
 */
export async function openFormPage(page: Page, path: string) {
  await page.goto(path);
  await expect(
    page.getByRole("button", { name: "Bold" }),
    "the description editor never started, so the page has not attached its scripts",
  ).toBeEnabled();
}
