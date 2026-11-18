import { listCustomersAsAdminHandlers } from "@/mocks/handlers/admin-students/list-customers-as-admin";
import msw from "next/experimental/testmode/playwright/msw.js";

const { test, expect } = msw;

test.use({
  timezoneId: "Pacific/Auckland",
  mswHandlers: [[listCustomersAsAdminHandlers.success], { scope: "test" }],
});

// Unit tests can't show a real server render hydrating in a browser zone that
// differs from UTC: the date appears only after hydration, and a mismatch only
// warns in the console.
test("dates an unfinished checkout in the admin's own day, with no hydration warning", async ({
  page,
}) => {
  const hydrationWarnings: string[] = [];
  page.on("console", (message) => {
    if (/hydrat/i.test(message.text())) {
      hydrationWarnings.push(message.text());
    }
  });

  await page.goto("/admin/students");

  // Tal's checkout started 2026-11-03 16:00 UTC: Nov 4 in Auckland.
  await expect(
    page.getByRole("listitem").filter({ hasText: "Tal Ben" }),
  ).toHaveText("Tal Ben · tal@example.com · Nov 4, 2026");
  expect(hydrationWarnings).toEqual([]);
});
