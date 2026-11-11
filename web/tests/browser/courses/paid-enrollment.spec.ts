import { courseByIdSuccess } from "@/mocks/handlers/courses/get-course";
import { courseImageSuccess } from "@/mocks/handlers/courses/get-course-image";
import { startCheckoutHandlers } from "@/mocks/handlers/checkout/start-checkout";
import { getCheckoutStatusHandlers } from "@/mocks/handlers/checkout/get-checkout-status";
import { reactCourse } from "@/mocks/fixtures/courses";
import msw from "next/experimental/testmode/playwright/msw.js";

const { test, expect } = msw;

const OPEN_BUTTON_NAME = "Enroll for $99";

test.use({
  mswHandlers: [
    [
      courseByIdSuccess,
      courseImageSuccess,
      startCheckoutHandlers.checkEmail,
      getCheckoutStatusHandlers.success,
    ],
    { scope: "test" },
  ],
});

test("a visitor on a paid course continues to the payment page", async ({
  page,
  msw,
}) => {
  msw.use(startCheckoutHandlers.redirect);
  await page.goto(`/courses/${reactCourse.id}`);

  await page.getByRole("button", { name: OPEN_BUTTON_NAME }).click();
  await page.getByLabel("Name").fill("Ami Cohen");
  await page.getByLabel("Email").fill("ami@example.com");
  await page.getByRole("button", { name: "Continue to payment" }).click();

  await expect(
    page.getByRole("button", { name: "Opening payment…" }),
  ).toHaveAttribute("aria-busy", "true");
  await page.waitForURL(
    "http://pay.localhost:3000/checkout/success?checkoutId=cs_test_mock",
  );
});

test("when the API answers check_email on a paid course, the notice replaces the form", async ({
  page,
}) => {
  await page.goto(`/courses/${reactCourse.id}`);

  await page.getByRole("button", { name: OPEN_BUTTON_NAME }).click();
  await page.getByLabel("Name").fill("Ami Cohen");
  await page.getByLabel("Email").fill("ami@example.com");
  await page.getByRole("button", { name: "Continue to payment" }).click();

  const notice = page.getByRole("status");
  await expect(notice).toContainText("Check your email");
  await expect(notice).toBeFocused();
});

test("pressing Back from the payment page loads a fresh page with the closed button", async ({
  page,
  msw,
}) => {
  msw.use(startCheckoutHandlers.redirect);
  await page.goto(`/courses/${reactCourse.id}`);
  await page.getByRole("button", { name: OPEN_BUTTON_NAME }).click();
  await page.getByLabel("Name").fill("Ami Cohen");
  await page.getByLabel("Email").fill("ami@example.com");
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await page.waitForURL(/pay\.localhost/);

  await page.goBack();

  await expect(
    page.getByRole("button", { name: OPEN_BUTTON_NAME }),
  ).toHaveAttribute("aria-expanded", "false");
});

test("when Stripe is down, the visitor sees the API's words, keeps their typing and sees Try again", async ({
  page,
  msw,
}) => {
  msw.use(startCheckoutHandlers.paymentProviderDown);
  await page.goto(`/courses/${reactCourse.id}`);

  await page.getByRole("button", { name: OPEN_BUTTON_NAME }).click();
  await page.getByLabel("Name").fill("Ami Cohen");
  await page.getByLabel("Email").fill("ami@example.com");
  await page.getByRole("button", { name: "Continue to payment" }).click();

  const alert = page.getByRole("main").getByRole("alert");
  await expect(alert).toContainText("Payment provider unavailable");
  await expect(alert).toContainText(
    "Payments can't be taken right now. Try again later.",
  );
  await expect(page.getByLabel("Name")).toHaveValue("Ami Cohen");
  await expect(page.getByLabel("Email")).toHaveValue("ami@example.com");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});
