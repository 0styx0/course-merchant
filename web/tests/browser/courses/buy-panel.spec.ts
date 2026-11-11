import { courseByIdSuccess } from "@/mocks/handlers/courses/get-course";
import { endedCourse } from "@/mocks/fixtures/courses";
import msw from "next/experimental/testmode/playwright/msw.js";

const { test, expect } = msw;

test.use({
  mswHandlers: [[courseByIdSuccess], { scope: "test" }],
});

// Unit tests render the panels by hand; only a real request shows that the
// page, through Next and the mock course endpoint, swaps an ended course's
// Enroll button for the Ended panel.
test("shows an ended course with its Ended pill and no Enroll button", async ({
  page,
}) => {
  await page.goto(`/courses/${endedCourse.id}`);

  await expect(page.getByText("Ended", { exact: true })).toBeVisible();
  await expect(
    page.getByText("This course has ended.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "See current courses →" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Enroll/ })).toHaveCount(0);
});
