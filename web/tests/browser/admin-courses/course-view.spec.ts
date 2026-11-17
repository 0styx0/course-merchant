import type { Page } from "@playwright/test";
import msw from "next/experimental/testmode/playwright/msw.js";

import {
  adminCourseWithEveryStudentCase,
  everyStudentCaseEmail,
} from "@/mocks/fixtures/admin-courses";
import {
  getCourseAsAdminHandlers,
  makeRememberedGetHandler,
} from "@/mocks/handlers/admin-courses/get-course-as-admin";
import { makeRememberedCourse } from "@/mocks/handlers/admin-courses/remembered-course";
import { makeRememberedRevokeHandler } from "@/mocks/handlers/admin-courses/revoke-enrollment";

const { test, expect } = msw;

const adminCoursePath = "/admin/courses/3f0c1c1e-8f4e-4c3e-9a57-0d6a4f0b9a11";

// How far the page reaches past the screen's right edge; 0 or less means no sideways scroll.
function pageSideOverflow(page: Page) {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
}

test("shows the 404 page for a course the API does not know", async ({
  page,
  msw,
}) => {
  msw.use(getCourseAsAdminHandlers.notFound);

  const response = await page.goto(adminCoursePath);

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Students" })).toHaveCount(0);
});

// jsdom lays nothing out, so only a browser can show the page staying inside the screen.
test("does not scroll the page sideways at 400px", async ({ page, msw }) => {
  msw.use(getCourseAsAdminHandlers.withEveryStudentCase);
  await page.setViewportSize({ width: 400, height: 800 });

  await page.goto(adminCoursePath);

  await expect(
    page.getByRole("heading", { name: "Students (8)" }),
  ).toBeVisible();
  expect(await pageSideOverflow(page)).toBeLessThanOrEqual(0);
});

// jsdom ignores Tailwind's hiding, so only a browser shows which layout a width gets.
test("shows the cards below 768px and the table from 768px", async ({
  page,
  msw,
}) => {
  msw.use(getCourseAsAdminHandlers.withEveryStudentCase);
  const studentTable = page.getByRole("table");
  const studentCards = page.getByRole("list").filter({
    has: page.getByText("Dana Cohen", { exact: true }),
  });

  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto(adminCoursePath);
  await expect(studentCards.first()).toBeVisible();
  await expect(studentTable).toBeHidden();

  await page.setViewportSize({ width: 768, height: 800 });
  await expect(studentTable).toBeVisible();
  await expect(studentCards.first()).toBeHidden();
});

// jsdom lays nothing out, so only a browser can show the page staying inside the screen.
test("scrolls the table inside its own box, not the page, at 768px", async ({
  page,
  msw,
}) => {
  msw.use(getCourseAsAdminHandlers.withEveryStudentCase);
  await page.setViewportSize({ width: 768, height: 800 });

  await page.goto(adminCoursePath);

  await expect(page.getByRole("table")).toBeVisible();
  expect(await pageSideOverflow(page)).toBeLessThanOrEqual(0);
  const tableBox = page.locator('[data-slot="table-container"]');
  const tableBoxOverflow = await tableBox.evaluate(
    (box) => box.scrollWidth - box.clientWidth,
  );
  expect(tableBoxOverflow).toBeGreaterThan(0);
});

// jsdom can't run a Server Action or Next's refresh, so only a browser shows the row change after the dialog confirms.
test("shows an un-enrolled student's row as Un-enrolled and Refunded after confirming", async ({
  page,
  msw,
}) => {
  const store = makeRememberedCourse(adminCourseWithEveryStudentCase);
  msw.use(makeRememberedGetHandler(store), makeRememberedRevokeHandler(store));
  await page.setViewportSize({ width: 768, height: 800 });
  await page.goto(adminCoursePath);
  const danaRow = page.getByRole("row", { name: /Dana Cohen/ });

  await danaRow.getByRole("button", { name: "Un-enroll Dana Cohen" }).click();
  await page
    .getByRole("alertdialog", { name: "Un-enroll Dana Cohen?" })
    .getByRole("button", { name: "Un-enroll", exact: true })
    .click();

  await expect(danaRow).toContainText("Un-enrolled");
  await expect(danaRow).toContainText("Refunded");
  await expect(danaRow).toContainText("Refund owed");
  await expect(danaRow.getByRole("button", { name: /Un-enroll/ })).toHaveCount(
    0,
  );
});

// jsdom lays nothing out, so only a browser shows the open menu fitting a phone screen.
test("puts Dana's card first after picking Needs attention first at 400px", async ({
  page,
  msw,
}) => {
  msw.use(getCourseAsAdminHandlers.withEveryStudentCase);
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto(adminCoursePath);

  await page.getByRole("combobox", { name: "Sort by" }).click();
  await expect.poll(() => pageSideOverflow(page)).toBeLessThanOrEqual(0);
  await page.getByRole("option", { name: "Needs attention first" }).click();

  const firstCard = page
    .getByRole("list")
    .filter({ has: page.getByText("Dana Cohen", { exact: true }) })
    .getByRole("listitem")
    .first();
  await expect(firstCard).toContainText("Dana Cohen");
});

// jsdom has only user-event's stand-in clipboard, so only a browser shows the real one filled.
test.describe("with clipboard access", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  test("puts the four Active students' addresses on the clipboard at 1280px", async ({
    page,
    msw,
  }) => {
    msw.use(getCourseAsAdminHandlers.withEveryStudentCase);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(adminCoursePath);

    await page
      .getByRole("button", { name: "Copy active students' addresses" })
      .click();

    const activeEmailsInApiOrder = [
      "Dana Cohen",
      "Omar Haddad",
      "Noa Levi",
      "Sam Ortiz",
    ]
      .map(everyStudentCaseEmail)
      .join(", ");
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(activeEmailsInApiOrder);
  });
});
