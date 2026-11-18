import { listCustomersAsAdminHandlers } from "@/mocks/handlers/admin-students/list-customers-as-admin";
import msw from "next/experimental/testmode/playwright/msw.js";

const { test, expect } = msw;

test.use({
  viewport: { width: 400, height: 800 },
  mswHandlers: [[listCustomersAsAdminHandlers.success], { scope: "test" }],
});

// jsdom applies no CSS and runs no navigation, so only a real browser shows
// the sheet's link reaching the next admin page with the header still drawn.
test("at 400px, tapping New course in the Menu opens the create page under the same admin header", async ({
  page,
}) => {
  await page.goto("/admin/students");

  await page.getByRole("button", { name: "Menu" }).click();
  await page
    .getByRole("dialog", { name: "Menu" })
    .getByRole("link", { name: "New course" })
    .click();

  await expect(
    page.getByRole("heading", { name: "New course", level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole("banner")).toHaveText(
    /Embodying Emptiness · Admin/,
  );
});
