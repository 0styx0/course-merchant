import { getCheckoutStatusHandlers } from "@/mocks/handlers/get-checkout-status";
import msw from "next/experimental/testmode/playwright/msw.js";

const { test, expect } = msw;

test.use({
  mswHandlers: [[getCheckoutStatusHandlers.success], { scope: "test" }],
});

test("a buyer back from Stripe after payment sees Thank you and Check your email", async ({
  page,
}) => {
  await page.goto("/checkout/success?checkoutId=cs_test_mock");

  await expect(
    page.getByRole("heading", { level: 1, name: "Thank you." }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Check your email");
});

test("a checkout the API does not know shows the not-found page", async ({
  page,
  msw,
}) => {
  msw.use(getCheckoutStatusHandlers.checkoutNotFound);

  await page.goto("/checkout/success?checkoutId=cs_test_unknown");

  await expect(
    page.getByRole("heading", { level: 1, name: "Checkout not found" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "See current courses →" }),
  ).toHaveAttribute("href", "/");
});

test("a link without a checkout id shows the not-found page", async ({
  page,
}) => {
  await page.goto("/checkout/success");

  await expect(
    page.getByRole("heading", { level: 1, name: "Checkout not found" }),
  ).toBeVisible();
});

test("when the API fails, the buyer sees its words", async ({ page, msw }) => {
  msw.use(getCheckoutStatusHandlers.checkoutServerError);

  await page.goto("/checkout/success?checkoutId=cs_test_mock");

  const alert = page.getByRole("main").getByRole("alert");
  await expect(alert).toContainText("Internal server error");
  await expect(alert).toContainText(
    "Something went wrong on our side. Please try again later.",
  );
});
