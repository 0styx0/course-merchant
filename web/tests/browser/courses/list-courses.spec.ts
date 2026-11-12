import msw from "next/experimental/testmode/playwright/msw.js";

import { courseByIdSuccess } from "@/mocks/handlers/courses/get-course";
import {
  freeCourse,
  longTextCourse,
  reactCourse,
  typescriptCourse,
} from "@/mocks/fixtures/courses";
import {
  coursesError,
  coursesSlow,
  coursesSuccess,
} from "@/mocks/handlers/courses/list-courses";

const { test, expect } = msw;

test.use({
  mswHandlers: [[coursesSuccess], { scope: "test" }],
});

test("displays available courses", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Embodying Emptiness");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "A storefront for selling online courses, with payment through Stripe Checkout.",
  );

  const courses = page.getByRole("region", { name: "Courses" });
  const cards = courses.getByRole("article");

  await expect(cards).toHaveCount(5);

  await expect(cards.nth(0)).toContainText(reactCourse.name);
  await expect(cards.nth(1)).toContainText(typescriptCourse.name);
  await expect(cards.nth(2)).toContainText(freeCourse.name);
  await expect(cards.nth(3)).toContainText(longTextCourse.name);

  await expect(
    courses.getByRole("heading", {
      name: reactCourse.name,
    }),
  ).toBeVisible();

  await expect(
    courses.getByRole("heading", {
      name: typescriptCourse.name,
    }),
  ).toBeVisible();
});

test("opens a course from its card", async ({ page, msw }) => {
  msw.use(courseByIdSuccess);

  await page.goto("/");

  await page
    .getByRole("region", { name: "Courses" })
    .getByRole("link", { name: reactCourse.name })
    .click();

  await expect(page).toHaveURL(`/courses/${reactCourse.id}`);
  await expect(
    page.getByRole("heading", { level: 1, name: reactCourse.name }),
  ).toBeVisible();
});

test("opens the free course from its card", async ({ page, msw }) => {
  msw.use(courseByIdSuccess);

  await page.goto("/");

  await page
    .getByRole("region", { name: "Courses" })
    .getByRole("link", { name: freeCourse.name })
    .click();

  await expect(page).toHaveURL(`/courses/${freeCourse.id}`);
  await expect(
    page.getByRole("heading", { level: 1, name: freeCourse.name }),
  ).toBeVisible();
});

test("displays loading state while courses are loading", async ({
  page,
  msw,
}) => {
  msw.use(coursesSlow);

  const navigation = page.goto("/");

  const courses = page.getByRole("region", { name: "Courses" });

  await expect(
    courses.getByText("Loading courses...", { exact: true }),
  ).toBeVisible();

  await navigation;

  await expect(
    courses.getByRole("heading", {
      name: reactCourse.name,
    }),
  ).toBeVisible();
});

test("shows an error page when the courses can't be loaded", async ({
  page,
  msw,
}) => {
  msw.use(coursesError);

  await page.goto("/");

  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "We couldn't load this page",
  );
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});
