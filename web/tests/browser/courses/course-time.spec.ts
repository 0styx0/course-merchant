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

test.describe("a visitor in Tokyo", () => {
  test.use({ timezoneId: "Asia/Tokyo" });

  // Unit tests can't show a real server render hydrating in a browser zone
  // that differs from the course's: a mismatch only warns in the console.
  test("sees the course in their own day, with no hydration warning", async ({
    page,
  }) => {
    const hydrationWarnings: string[] = [];
    page.on("console", (message) => {
      if (/hydrat/i.test(message.text())) {
        hydrationWarnings.push(message.text());
      }
    });

    await page.goto(`/courses/${reactCourse.id}`);

    // reactCourse starts 2030-10-01 18:00 UTC: 03:00 on Wed 2 Oct in Tokyo.
    await expect(page.getByText(/Wed 2 Oct.*GMT\+9 your time/)).toBeVisible();
    expect(hydrationWarnings).toEqual([]);
  });
});
