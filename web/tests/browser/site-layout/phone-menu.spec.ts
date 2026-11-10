import msw from "next/experimental/testmode/playwright/msw.js";

const { test, expect } = msw;

test.use({ viewport: { width: 400, height: 800 } });

// jsdom applies no CSS, so only a real browser shows that the md breakpoint
// swaps the header's Courses link for the Menu button at phone width.
test("at 400px (below md) Menu shows, and Escape returns focus to it", async ({
  page,
}) => {
  // Any public page carries the header; /nope needs no mock API.
  await page.goto("/nope");
  const menuButton = page.getByRole("button", { name: "Menu" });
  const banner = page.getByRole("banner");

  await expect(menuButton).toBeVisible();
  await expect(banner.getByRole("link", { name: "Courses" })).toBeHidden();
  await menuButton.click();
  await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
  await page.keyboard.press("Escape");

  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(menuButton).toBeFocused();
});
