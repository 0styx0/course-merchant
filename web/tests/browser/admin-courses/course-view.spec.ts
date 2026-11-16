import msw from "next/experimental/testmode/playwright/msw.js";

import { getCourseAsAdminHandlers } from "@/mocks/handlers/admin-courses/get-course-as-admin";

const { test, expect } = msw;

const adminCoursePath = "/admin/courses/3f0c1c1e-8f4e-4c3e-9a57-0d6a4f0b9a11";

test("shows the 404 page for a course the API does not know", async ({
  page,
  msw,
}) => {
  msw.use(getCourseAsAdminHandlers.notFound);

  const response = await page.goto(adminCoursePath);

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Students" })).toHaveCount(0);
});
