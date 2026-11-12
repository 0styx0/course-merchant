import { courseByIdSuccess } from "@/mocks/handlers/courses/get-course";
import { courseImageSuccess } from "@/mocks/handlers/courses/get-course-image";
import { reactCourse } from "@/mocks/fixtures/courses";
import type { Page } from "@playwright/test";
import msw from "next/experimental/testmode/playwright/msw.js";

const { test, expect } = msw;

test.use({
  locale: "en-GB",
  mswHandlers: [[courseByIdSuccess, courseImageSuccess], { scope: "test" }],
});

function collectHydrationWarnings(page: Page) {
  const hydrationWarnings: string[] = [];
  page.on("console", (message) => {
    if (/hydrat/i.test(message.text())) {
      hydrationWarnings.push(message.text());
    }
  });
  return hydrationWarnings;
}

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
    const hydrationWarnings = collectHydrationWarnings(page);

    await page.goto(`/courses/${reactCourse.id}`);

    // reactCourse starts 2030-10-01 18:00 UTC: 03:00 on Wed 2 Oct in Tokyo.
    await expect(page.getByText(/Wed 2 Oct.*GMT\+9 your time/)).toBeVisible();
    expect(hydrationWarnings).toEqual([]);
  });
});

test.describe("a visitor 4 days before the start", () => {
  test.use({ timezoneId: "UTC" });

  // The server render keeps the date; only a real hydration shows the swap to
  // the browser's calendar days without a warning.
  test("sees 'Starts in 4 days', with no hydration warning", async ({
    page,
  }) => {
    const hydrationWarnings = collectHydrationWarnings(page);
    // reactCourse starts 2030-10-01 18:00 UTC.
    await page.clock.install({ time: new Date("2030-09-27T12:00:00Z") });

    await page.goto(`/courses/${reactCourse.id}`);

    await expect(
      page.getByText("Starts in 4 days", { exact: true }),
    ).toBeVisible();
    expect(hydrationWarnings).toEqual([]);
  });
});
