import msw from "next/experimental/testmode/playwright/msw.js";

import { makeRememberedCreateHandler } from "@/mocks/handlers/create-course";
import { makeRememberedGetHandler } from "@/mocks/handlers/get-course-as-admin";
import { getCourseImageAsAdminHandlers } from "@/mocks/handlers/get-course-image-as-admin";
import { coursesSuccess } from "@/mocks/handlers/list-courses";
import { makeRememberedUpdateHandler } from "@/mocks/handlers/update-course";
import { makeRememberedUploadHandler } from "@/mocks/handlers/upload-course-image";
import { makeRememberedCourse } from "@/mocks/remembered-course";

import { collectConsoleErrors, fillValidForm } from "./fill-valid-course-form";
import { openFormPage } from "./open-form-page";

const { test, expect } = msw;

test.use({
  mswHandlers: [[coursesSuccess], { scope: "test" }],
});

test("creates a draft, publishes it, and saves again after its start has passed", async ({
  page,
  msw,
}) => {
  const remembered = makeRememberedCourse();
  msw.use(
    makeRememberedCreateHandler(remembered),
    makeRememberedUploadHandler(remembered),
    makeRememberedUpdateHandler(remembered),
    makeRememberedGetHandler(remembered),
    getCourseImageAsAdminHandlers.success,
  );
  const consoleErrors = collectConsoleErrors(page);

  await openFormPage(page, "/admin/courses/new");
  await fillValidForm(page);
  await page.getByRole("button", { name: "Save as draft" }).click();

  await expect(page).toHaveURL(/\/admin\/courses\/[^/]+\/edit$/);
  await expect(page.getByRole("status")).toHaveText("Saved as a draft");

  await page.getByRole("radio", { name: "Published" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByRole("status")).toHaveText("Saved");
  await expect(page).toHaveURL(/\/admin\/courses\/[^/]+\/edit$/);
  await expect(page.getByRole("radio", { name: "Published" })).toBeChecked();

  // Only the browser's clock moves: the start the page loaded stays the stored one.
  await page.clock.setSystemTime(new Date("2099-01-11T12:00:00Z"));
  await page.getByLabel("Course name", { exact: true }).fill("Renamed");
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByRole("status")).toHaveText("Saved");
  await expect(
    page.getByText("The start time must be in the future."),
  ).toHaveCount(0);
  await expect(page.getByLabel("Course name", { exact: true })).toHaveValue(
    "Renamed",
  );
  expect(consoleErrors).toEqual([]);
});
