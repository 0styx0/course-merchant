import { courseByIdSuccess } from "@/mocks/handlers/courses/get-course";
import { courseImageSuccess } from "@/mocks/handlers/courses/get-course-image";
import { reactCourse } from "@/mocks/fixtures/courses";
import msw from "next/experimental/testmode/playwright/msw.js";

const { test, expect } = msw;

test.use({
  locale: "en-GB",
  mswHandlers: [[courseByIdSuccess, courseImageSuccess], { scope: "test" }],
});

// Unit tests pass the locale to the panel by hand; only a real request shows
// an Accept-Language header reaching the server render and shaping the date.
test("writes an upcoming course's start date in the browser's language", async ({
  page,
}) => {
  await page.goto(`/courses/${reactCourse.id}`);

  await expect(
    page.getByText("Starts 1 Oct 2030", { exact: true }),
  ).toBeVisible();
});
