import msw from "next/experimental/testmode/playwright/msw.js";

const { test, expect } = msw;
import {
  coursesError,
  coursesSlow,
  coursesSuccess,
} from "@/mocks/handlers/courses.list";

test.use({
  mswHandlers: [[coursesSuccess], { scope: "test" }],
});

test("displays available courses", async ({ page }) => {
  await page.goto("/");

  const courses = page.getByRole("region", { name: "Courses" });
  const cards = courses.getByRole("article");

  await expect(cards).toHaveCount(2);

  await expect(cards.nth(0)).toContainText("React Fundamentals");
  await expect(cards.nth(1)).toContainText("Advanced TypeScript");

  await expect(
    courses.getByRole("heading", {
      name: "React Fundamentals",
    }),
  ).toBeVisible();

  await expect(
    courses.getByRole("heading", {
      name: "Advanced TypeScript",
    }),
  ).toBeVisible();
});

test("displays loading state while courses are loading", async ({
  page,
  msw,
}) => {
  msw.use(coursesSlow);

  const navigation = page.goto("/");

  const courses = page.getByRole("region", { name: "Courses" });

  await expect(courses.getByText("Loading courses...")).toBeVisible();

  await navigation;

  await expect(
    courses.getByRole("heading", {
      name: "React Fundamentals",
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
