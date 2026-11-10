import msw from "next/experimental/testmode/playwright/msw.js";

import { SITE_NAME } from "@/lib/site-config/site-name";

const { test, expect } = msw;

test("an unknown URL answers 404 with the header, the h1 and the tab title", async ({
  page,
}) => {
  const response = await page.goto("/nope");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: "Page not found" }),
  ).toBeVisible();
  await expect(page).toHaveTitle(`Page not found · ${SITE_NAME}`);
});
