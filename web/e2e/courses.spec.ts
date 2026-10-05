import { test, expect } from "@playwright/test";

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