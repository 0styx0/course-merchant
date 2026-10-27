import {
  courseByIdSuccess,
  courseByIdError,
  courseByIdNotFound,
  courseByIdInvalidId,
} from "@/mocks/handlers/get-course";
import { reactCourse } from "@/mocks/fixtures/courses";
import msw from "next/experimental/testmode/playwright/msw.js";

const { test, expect } = msw;

test.use({
  mswHandlers: [[courseByIdSuccess], { scope: "test" }],
});

test("displays course details", async ({ page }) => {
  const response = await page.goto(`/courses/${reactCourse.id}`);

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(reactCourse.name);

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: reactCourse.name,
    }),
  ).toBeVisible();

  await expect(page.getByText(reactCourse.description)).toBeVisible();

  await expect(page.getByText("$99.00")).toBeVisible();
  await expect(page.getByText("12 enrolled")).toBeVisible();
  await expect(page.getByText("America/New_York")).toBeVisible();

  const startTime = page.locator(
    `time[datetime="${reactCourse.schedule.startTime}"]`,
  );
  const endTime = page.locator(
    `time[datetime="${reactCourse.schedule.endTime}"]`,
  );

  await expect(startTime).toBeVisible();
  await expect(startTime).not.toBeEmpty();

  await expect(endTime).toBeVisible();
  await expect(endTime).not.toBeEmpty();
});

test("displays an error when the API returns a server error", async ({
  page,
  msw,
}) => {
  msw.use(courseByIdError);

  await page.goto(`/courses/${reactCourse.id}`);

  const alert = page
    .getByRole("alert")
    .filter({ hasText: "Internal server error" });

  await expect(alert).toBeVisible();
  await expect(alert).toContainText("We couldn't load this course");

  await expect(page.getByRole("heading", { level: 1 })).not.toBeVisible();
});

test("shows a 404 page when the course does not exist", async ({
  page,
  msw,
}) => {
  msw.use(courseByIdNotFound);

  const response = await page.goto(`/courses/${reactCourse.id}`);

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { level: 1, name: "Course not found" }),
  ).toBeVisible();
});

test("shows a 404 page for an invalid course ID", async ({ page, msw }) => {
  msw.use(courseByIdInvalidId);

  const response = await page.goto("/courses/not-a-uuid");

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { level: 1, name: "Course not found" }),
  ).toBeVisible();
});
