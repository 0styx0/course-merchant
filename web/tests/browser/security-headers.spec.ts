import msw from "next/experimental/testmode/playwright/msw.js";

import { coursesSuccess } from "@/mocks/handlers/list-courses";

const { test, expect } = msw;

test.use({
  mswHandlers: [[coursesSuccess], { scope: "test" }],
});

for (const path of ["/", "/health"]) {
  test(`${path} sends security headers`, async ({ page }) => {
    const response = await page.goto(path);
    const headers = response!.headers();

    expect(headers["x-powered-by"]).toBeUndefined();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["content-security-policy"]).toBe("frame-ancestors 'none'");
  });
}
