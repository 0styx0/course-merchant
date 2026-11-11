import { courseByIdSuccess } from "@/mocks/handlers/courses/get-course";
import { courseImageSuccess } from "@/mocks/handlers/courses/get-course-image";
import { startCheckoutHandlers } from "@/mocks/handlers/checkout/start-checkout";
import { freeCourse } from "@/mocks/fixtures/courses";
import msw from "next/experimental/testmode/playwright/msw.js";

const { test, expect } = msw;

const OPEN_BUTTON_NAME = "Enroll for free";

test.use({
  mswHandlers: [
    [courseByIdSuccess, courseImageSuccess, startCheckoutHandlers.checkEmail],
    { scope: "test" },
  ],
});

test("a visitor enrolls in a free course with the keyboard only", async ({
  page,
  msw,
}) => {
  msw.use(startCheckoutHandlers.slow);
  await page.goto(`/courses/${freeCourse.id}`);

  const openButton = page.getByRole("button", { name: OPEN_BUTTON_NAME });
  await expect(openButton).toHaveAttribute("aria-expanded", "false");
  await openButton.focus();
  await page.keyboard.press("Enter");

  const nameField = page.getByLabel("Name");
  await expect(nameField).toBeFocused();
  await page.keyboard.type("Ami Cohen");
  await page.keyboard.press("Tab");
  await page.keyboard.type("ami@example.com");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");

  await expect(page.getByRole("button", { name: "Sending…" })).toHaveAttribute(
    "aria-busy",
    "true",
  );

  const notice = page.getByRole("status");
  await expect(notice).toContainText("Check your email");
  await expect(notice).toContainText("ami@example.com");
  await expect(notice).toBeFocused();
});

test("a problem shows above the fields and keeps what the visitor typed", async ({
  page,
  msw,
}) => {
  msw.use(startCheckoutHandlers.notPurchasable);
  await page.goto(`/courses/${freeCourse.id}`);

  await page.getByRole("button", { name: OPEN_BUTTON_NAME }).click();
  await page.getByLabel("Name").fill("Ami Cohen");
  await page.getByLabel("Email").fill("ami@example.com");
  await page.getByRole("button", { name: "Email me the link" }).click();

  const alert = page
    .getByRole("alert")
    .filter({ hasText: "Course not purchasable" });
  await expect(alert).toContainText("Course not purchasable");
  await expect(alert).toContainText(
    "This course has ended and can no longer be bought.",
  );
  await expect(page.getByLabel("Name")).toHaveValue("Ami Cohen");
  await expect(page.getByLabel("Email")).toHaveValue("ami@example.com");
});

test("a reload shows the closed button again", async ({ page }) => {
  await page.goto(`/courses/${freeCourse.id}`);
  await page.getByRole("button", { name: OPEN_BUTTON_NAME }).click();

  await page.reload();

  await expect(
    page.getByRole("button", { name: OPEN_BUTTON_NAME }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByLabel("Name")).toHaveCount(0);
});
