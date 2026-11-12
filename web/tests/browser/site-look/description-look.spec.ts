import type { Locator, Page } from "@playwright/test";
import msw from "next/experimental/testmode/playwright/msw.js";

import { longTextCourse } from "@/mocks/fixtures/courses";
import { getCourseAsAdminHandlers } from "@/mocks/handlers/admin-courses/get-course-as-admin";
import { courseByIdSuccess } from "@/mocks/handlers/courses/get-course";
import { courseImageSuccess } from "@/mocks/handlers/courses/get-course-image";
import { coursesSuccess } from "@/mocks/handlers/courses/list-courses";

import { openFormPage } from "../admin-courses/open-form-page";

const { test, expect } = msw;

test.use({
  mswHandlers: [
    [courseByIdSuccess, courseImageSuccess, coursesSuccess],
    { scope: "test" },
  ],
});

const editPath = "/admin/courses/3f0c1c1e-8f4e-4c3e-9a57-0d6a4f0b9a11/edit";

/** The colour Chromium computes for a root token, as `getComputedStyle` writes it. */
async function readTokenColor(page: Page, tokenName: string) {
  return page.evaluate((name) => {
    const probe = document.createElement("span");
    probe.style.color = `var(${name})`;
    document.body.append(probe);
    const computed = getComputedStyle(probe).color;
    probe.remove();
    return computed;
  }, tokenName);
}

function readComputedStyle(locator: Locator, property: string) {
  return locator.evaluate(
    (element, name) => getComputedStyle(element).getPropertyValue(name),
    property,
  );
}

// jsdom applies no CSS, so only a browser shows that both pages reach the
// shared description class and that only the public page mutes its text. One
// sample each; the stylesheet's other values are not pinned here.
test("the public description is muted 18px text and the editor's is foreground 16px, both with Playfair h2s", async ({
  page,
  msw,
}) => {
  await page.goto(`/courses/${longTextCourse.id}`);
  const publicDescription = page.locator(".description-content");
  const publicParagraph = publicDescription.locator("p").first();
  const publicH2 = publicDescription.getByRole("heading", { level: 2 }).first();

  expect(await readComputedStyle(publicParagraph, "font-size")).toBe("18px");
  expect(await readComputedStyle(publicParagraph, "color")).toBe(
    await readTokenColor(page, "--muted-foreground"),
  );
  expect(await readComputedStyle(publicH2, "font-family")).toMatch(/Playfair/);

  msw.use(getCourseAsAdminHandlers.success);
  await openFormPage(page, editPath);
  const editor = page.getByRole("textbox", { name: "Description" });
  const editorParagraph = editor.locator("p").first();
  const editorH2 = editor.locator("h2").first();

  expect(await readComputedStyle(editorParagraph, "font-size")).toBe("16px");
  expect(await readComputedStyle(editorParagraph, "color")).toBe(
    await readTokenColor(page, "--foreground"),
  );
  expect(await readComputedStyle(editorH2, "font-family")).toMatch(/Playfair/);
});
