
import { courseByIdSuccess, courseResponse, courseByIdSlow, courseByIdError, courseByIdNotFound, courseByIdInvalidId } from "@/mocks/handlers/course.get";
import { test, expect } from "next/experimental/testmode/playwright/msw";

test.use({
    mswHandlers: [[courseByIdSuccess], { scope: "test" }],
});

const errorMessage =
    "We couldn't load this course right now. Please try again later.";

test("displays course details", async ({ page }) => {
    await page.goto(`/courses/${courseResponse.id}`);

    await expect(
        page.getByRole("heading", {
            level: 1,
            name: "React Fundamentals",
        }),
    ).toBeVisible();

    await expect(
        page.getByText("Learn React"),
    ).toBeVisible();

    await expect(page.getByText("$99.00")).toBeVisible();
    await expect(page.getByText("12 enrolled")).toBeVisible();
    await expect(page.getByText("America/New_York")).toBeVisible();

    const startTime = page.locator(
        `time[datetime="${courseResponse.schedule.startTime}"]`,
    );
    const endTime = page.locator(
        `time[datetime="${courseResponse.schedule.endTime}"]`,
    );

    await expect(startTime).toBeVisible();
    await expect(startTime).not.toBeEmpty();

    await expect(endTime).toBeVisible();
    await expect(endTime).not.toBeEmpty();
});

test("displays loading state while the course is loading", async ({
    page,
    msw,
}) => {
    msw.use(courseByIdSlow);

    const navigation = page.goto(`/courses/${courseResponse.id}`);

    await expect(page.getByRole("status")).toHaveText("Loading course...");

    await navigation;

    await expect(
        page.getByRole("heading", {
            level: 1,
            name: "React Fundamentals",
        }),
    ).toBeVisible();
});

test("displays an error when the API returns a server error", async ({
    page,
    msw,
}) => {
    msw.use(courseByIdError);

    await page.goto(`/courses/${courseResponse.id}`);

    await expect(page.getByRole("alert")).toHaveText(errorMessage);

    await expect(
        page.getByRole("heading", { level: 1 }),
    ).not.toBeVisible();
});

test("displays an error when the course does not exist", async ({
    page,
    msw,
}) => {
    msw.use(courseByIdNotFound);

    await page.goto(`/courses/${courseResponse.id}`);

    await expect(page.getByRole("alert")).toHaveText(errorMessage);
});

test("displays an error for an invalid course ID", async ({
    page,
    msw,
}) => {
    msw.use(courseByIdInvalidId);

    await page.goto("/courses/not-a-uuid");

    await expect(page.getByRole("alert")).toHaveText(errorMessage);
});