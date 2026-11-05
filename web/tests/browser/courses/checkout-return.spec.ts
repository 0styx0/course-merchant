import {
  checkoutStatusUrl,
  getCheckoutStatusHandlers,
} from "@/mocks/handlers/get-checkout-status";
import { http, HttpResponse } from "msw";
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

test("a buyer whose payment is still confirming sees Thank you and the confirming line", async ({
  page,
  msw,
}) => {
  msw.use(getCheckoutStatusHandlers.checkoutPending);

  await page.goto("/checkout/success?checkoutId=cs_test_mock");

  await expect(
    page.getByRole("heading", { level: 1, name: "Thank you." }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "We're confirming your payment.",
  );
});

test("a buyer whose checkout timed out reads that nothing was charged", async ({
  page,
  msw,
}) => {
  msw.use(getCheckoutStatusHandlers.checkoutExpired);

  await page.goto("/checkout/success?checkoutId=cs_test_mock");

  await expect(
    page.getByRole("heading", { level: 1, name: "Checkout timed out." }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "This checkout ended before payment, so we charged you nothing.",
  );
  await expect(
    page.getByRole("link", { name: "See current courses →" }),
  ).toHaveAttribute("href", "/");
});

test("a buyer whose payment was refunded reads that it was refunded", async ({
  page,
  msw,
}) => {
  msw.use(getCheckoutStatusHandlers.checkoutRefunded);

  await page.goto("/checkout/success?checkoutId=cs_test_mock");

  await expect(
    page.getByRole("heading", { level: 1, name: "Payment refunded." }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "We've refunded this payment.",
  );
  await expect(
    page.getByRole("link", { name: "See current courses →" }),
  ).toHaveAttribute("href", "/");
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

// Each msw.use call puts its handlers before the earlier ones, so a test
// registers the fallback first and the answer for the first check last.
const makePendingFirstCheckHandler = () =>
  http.get(checkoutStatusUrl, () => HttpResponse.json({ status: "pending" }), {
    once: true,
  });

test("a pending page switches to Check your email by itself once the payment succeeds", async ({
  page,
  msw,
}) => {
  msw.use(getCheckoutStatusHandlers.success);
  msw.use(makePendingFirstCheckHandler());
  await page.clock.install();

  await page.goto("/checkout/success?checkoutId=cs_test_mock");
  await expect(page.getByRole("status")).toContainText(
    "This page updates by itself.",
  );
  await page.clock.runFor(5000);

  await expect(page.getByRole("status")).toContainText("Check your email");
});

test("a pending page shows the API's words when a re-check gets a 500", async ({
  page,
  msw,
}) => {
  msw.use(getCheckoutStatusHandlers.checkoutServerError);
  msw.use(makePendingFirstCheckHandler());
  await page.clock.install();

  await page.goto("/checkout/success?checkoutId=cs_test_mock");
  await page.clock.runFor(5000);

  const alert = page.getByRole("main").getByRole("alert");
  await expect(alert).toContainText("Internal server error");
  await expect(alert).toContainText(
    "Something went wrong on our side. Please try again later.",
  );
});

test("a pending page shows the shop error page when a re-check cannot reach the API", async ({
  page,
  msw,
}) => {
  msw.use(getCheckoutStatusHandlers.unreachable);
  msw.use(makePendingFirstCheckHandler());
  await page.clock.install();

  await page.goto("/checkout/success?checkoutId=cs_test_mock");
  await page.clock.runFor(5000);

  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("a page that stays pending for a minute stops checking and reads the received-payment sentence", async ({
  page,
  msw,
}) => {
  msw.use(getCheckoutStatusHandlers.checkoutPending);
  await page.clock.install();

  await page.goto("/checkout/success?checkoutId=cs_test_mock");
  await page.clock.runFor(61_000);

  await expect(page.getByRole("status")).toContainText(
    "We've received your payment.",
  );
  await expect(page.getByRole("status")).not.toContainText(
    "We're confirming your payment.",
  );
});
