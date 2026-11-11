import {
  courseByIdSuccess,
  courseByIdError,
  courseByIdNotFound,
  courseByIdInvalidId,
} from "@/mocks/handlers/courses/get-course";
import { SITE_NAME } from "@/lib/site-config/site-name";
import {
  inProgressCourse,
  reactCourse,
  typescriptCourse,
} from "@/mocks/fixtures/courses";
import msw from "next/experimental/testmode/playwright/msw.js";

const { test, expect } = msw;

test.use({
  mswHandlers: [[courseByIdSuccess], { scope: "test" }],
});

test("displays course details", async ({ page }) => {
  const response = await page.goto(`/courses/${reactCourse.id}`);

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(`${reactCourse.name} · Embodying Emptiness`);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    reactCourse.summary,
  );

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: reactCourse.name,
    }),
  ).toBeVisible();

  await expect(page.getByText(reactCourse.summary).first()).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "What you will build" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "React docs" })).toHaveAttribute(
    "href",
    "https://react.dev",
  );

  const buyPanel = page.getByRole("complementary", {
    name: `Enroll in ${reactCourse.name}`,
  });
  await expect(buyPanel.getByText("$99", { exact: true })).toBeVisible();
  await expect(page.getByText(/enrolled/)).toHaveCount(0);
  await expect(buyPanel).toBeVisible();
  await expect(page.getByText(/You pay on Stripe/)).toBeVisible();
  await expect(
    page.getByText("America/New_York", { exact: true }),
  ).toBeVisible();

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

test("displays the course whose id is in the URL", async ({ page }) => {
  await page.goto(`/courses/${typescriptCourse.id}`);

  await expect(
    page.getByRole("heading", { level: 1, name: typescriptCourse.name }),
  ).toBeVisible();
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

  await expect(page.getByRole("heading", { level: 1 })).toBeHidden();
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
  await expect(page).toHaveTitle(`Course not found · ${SITE_NAME}`);
});

test("shows a 404 page for an invalid course ID", async ({ page, msw }) => {
  msw.use(courseByIdInvalidId);

  const response = await page.goto("/courses/not-a-uuid");

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { level: 1, name: "Course not found" }),
  ).toBeVisible();
});

test("shows the course image in a 16:9 box served by Next's resizer", async ({
  page,
}) => {
  await page.goto(`/courses/${reactCourse.id}`);

  const image = page.locator("article img");
  await expect(image).toBeVisible();
  const box = await image.boundingBox();

  expect(box!.width / box!.height).toBeCloseTo(16 / 9, 1);
  await expect(image).toHaveAttribute(
    "src",
    new RegExp(
      `^/_next/image\\?url=${encodeURIComponent(`/courses/${reactCourse.id}/image/${reactCourse.image.version}`)}&`,
    ),
  );
});

// Unit tests pass the stage in by hand; only a real request shows that the
// page reads the server's clock and hands the right stage to the panel.
test("labels a course by where the server's clock puts it", async ({
  page,
}) => {
  await page.goto(`/courses/${reactCourse.id}`);
  await expect(
    page.getByText("Starts Oct 1, 2030", { exact: true }),
  ).toBeVisible();

  await page.goto(`/courses/${inProgressCourse.id}`);
  await expect(page.getByText("In progress", { exact: true })).toBeVisible();
  await expect(page.getByText(/^Starts/)).toHaveCount(0);
});
