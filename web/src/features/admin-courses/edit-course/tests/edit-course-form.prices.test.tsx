import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FROZEN_NOW } from "@/test/frozen-now";
import { draftedAdminCourse } from "@/mocks/fixtures/admin-courses";

import { toEditFormPrefill } from "../edit-form-prefill";
import {
  clickSave,
  refusal,
  renderForm,
  saveAction,
  setValue,
} from "./edit-course-form.fixtures";

vi.mock(
  "next/navigation",
  async () => (await import("./edit-course-form.mocks")).navigationMock,
);
vi.mock("../../save-course/edit/save-edited-details.action", () => ({
  saveEditedDetailsAction: vi.fn(),
}));
vi.mock("../../save-course/upload-image/upload-course-image.action", () => ({
  uploadCourseImageAction: vi.fn(),
}));
vi.mock("../../description-editor/description-editor", async () => ({
  DescriptionEditor: (await import("./edit-course-form.mocks"))
    .MockDescriptionEditor,
}));

const futurePrice = {
  id: "0b7a9c3e-1f2d-4e5a-8b6c-7d8e9f0a1b2c",
  amount: 12900,
  currency: "USD",
  effectiveAt: "2099-03-01T14:00:00Z",
} as const;

const oldestPrice = {
  id: "1c8b0d4f-2a3e-4f6b-9c7d-8e9f0a1b2c3d",
  amount: 7900,
  currency: "USD",
  effectiveAt: "2026-01-05T14:00:00Z",
} as const;

/** Two prices in effect (the fixture's $99 is the latest) and one future price. */
const prefillWithPricesInEffect = toEditFormPrefill({
  ...draftedAdminCourse,
  prices: [...draftedAdminCourse.prices, oldestPrice, futurePrice],
});

const prefillWithOnlyFuturePrice = toEditFormPrefill({
  ...draftedAdminCourse,
  prices: [futurePrice],
});

const FROZEN_DAY = new Date(FROZEN_NOW)
  .toISOString()
  .slice(0, "YYYY-MM-DD".length);

const TOO_SOON_MESSAGE =
  "Choose a time at least a minute from now, or leave both empty to start when you save.";

function pricesInEffectList() {
  return screen.getByRole("list", { name: /^Prices in effect/ });
}

async function chooseZone(
  user: ReturnType<typeof userEvent.setup>,
  zoneName: string,
) {
  const zone = screen.getByRole("combobox", { name: "Time zone" });
  await user.clear(zone);
  await user.type(zone, zoneName.split("/")[1].replace("_", " "));
  await user.click(screen.getByRole("option", { name: zoneName }));
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("EditCourseForm prices", () => {
  it("lists the prices in effect oldest first, the latest as the current price", () => {
    renderForm(prefillWithPricesInEffect);

    const lines = within(pricesInEffectList()).getAllByRole("listitem");
    expect(lines.map((line) => line.textContent)).toEqual([
      "$79.00 from Jan 5, 2026, 9:00 AM",
      "$99.00 from Oct 15, 2026, 2:31 PM (current price)",
    ]);
    expect(screen.getByLabelText("Price")).toHaveValue("129.00");
  });

  it("shows no list when no price is in effect", () => {
    renderForm(prefillWithOnlyFuturePrice);

    expect(screen.getByLabelText("Price")).toBeVisible();
    expect(
      screen.queryByRole("list", { name: /^Prices in effect/ }),
    ).not.toBeInTheDocument();
  });

  it("shows the list and the summary in a newly chosen zone", async () => {
    const user = userEvent.setup();
    renderForm(prefillWithPricesInEffect);

    await chooseZone(user, "Europe/Paris");

    expect(pricesInEffectList()).toHaveTextContent(
      "$99.00 from Oct 15, 2026, 8:31 PM (current price)",
    );
    expect(screen.getByText("Price schedule (Europe/Paris)")).toBeVisible();
    expect(
      screen.getByText(/^Prices in effect \(Europe\/Paris\)/),
    ).toBeVisible();
  });

  it("checks the rows again after a zone change", async () => {
    const user = userEvent.setup();
    renderForm(prefillWithOnlyFuturePrice);
    await user.click(screen.getByRole("button", { name: "Add price" }));
    // 05:00 today has passed in New York (10:00 UTC) and is ahead in Los Angeles (13:00 UTC).
    setValue("Price 2", "10");
    setValue("Price 2 start date", FROZEN_DAY);
    setValue("Price 2 start time", "05:00");
    await clickSave(user);
    expect(await screen.findAllByText(TOO_SOON_MESSAGE)).not.toEqual([]);

    await chooseZone(user, "America/Los_Angeles");

    await waitFor(() => {
      expect(screen.getByLabelText("Price 2 start time")).toHaveAttribute(
        "aria-invalid",
        "false",
      );
      expect(screen.queryByText(TOO_SOON_MESSAGE)).not.toBeInTheDocument();
    });
  });

  it("shows Remove on the only row when a price is in effect", () => {
    renderForm(prefillWithPricesInEffect);

    expect(screen.getByRole("button", { name: "Remove price" })).toBeVisible();
  });

  it("hides Remove on the only row when no price is in effect", () => {
    renderForm(prefillWithOnlyFuturePrice);

    expect(
      screen.queryByRole("button", { name: /^Remove price/ }),
    ).not.toBeInTheDocument();
  });

  it("reads an added row's empty start as when you save", async () => {
    const user = userEvent.setup();
    renderForm(prefillWithPricesInEffect);
    expect(
      screen.getByText("Leave the date and time empty to start when you save."),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Add price" }));
    setValue("Price 2", "150");

    const summaryLines = screen
      .getAllByRole("listitem")
      .map((line) => line.textContent);
    expect(summaryLines).toContain("$150.00 from when you save");
  });

  it("clears the same-time error when the duplicate row is removed", async () => {
    const user = userEvent.setup();
    renderForm(prefillWithOnlyFuturePrice);
    await user.click(screen.getByRole("button", { name: "Add price" }));
    setValue("Price 2", "10");
    setValue("Price 2 start date", "2099-03-01");
    setValue("Price 2 start time", "09:00");
    await clickSave(user);
    expect(
      await screen.findAllByText(
        "Two prices can't take effect at the same time.",
      ),
    ).not.toEqual([]);

    await user.click(screen.getByRole("button", { name: "Remove price 2" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Price start date")).toHaveAttribute(
        "aria-invalid",
        "false",
      );
      expect(
        screen.queryByText("Two prices can't take effect at the same time."),
      ).not.toBeInTheDocument();
    });
  });

  it("lists a refused price field by its label", async () => {
    const user = userEvent.setup();
    saveAction.mockResolvedValueOnce(
      refusal("Refused", [
        { path: "prices.1.effectiveTimeOfDay", message: "Pick a later time." },
      ]),
    );
    renderForm(prefillWithPricesInEffect);
    await user.click(screen.getByRole("button", { name: "Add price" }));
    setValue("Price 2", "150");

    await clickSave(user);

    expect(
      await screen.findByRole("button", { name: "Price 2 start time" }),
    ).toBeVisible();
  });

  describe("a price start in the past", () => {
    const PAST_DAY_MESSAGE =
      "Choose a date that isn't in the past, or leave both empty to start when you save.";

    it("shows the message under Start date, and fixing the date clears it", async () => {
      renderForm(prefillWithOnlyFuturePrice);

      setValue("Price start date", "2020-01-01");

      await screen.findByText(PAST_DAY_MESSAGE);
      expect(
        screen.getByLabelText("Price start date"),
      ).toHaveAccessibleDescription(PAST_DAY_MESSAGE);
      expect(
        screen.getByLabelText("Price start time"),
      ).not.toHaveAccessibleDescription(PAST_DAY_MESSAGE);

      setValue("Price start date", "2099-03-02");

      await waitFor(() => {
        expect(screen.getByLabelText("Price start date")).toHaveAttribute(
          "aria-invalid",
          "false",
        );
        expect(screen.queryByText(PAST_DAY_MESSAGE)).not.toBeInTheDocument();
      });
    });

    it("clears another row's same-time error when one row's start changes", async () => {
      const user = userEvent.setup();
      renderForm(prefillWithOnlyFuturePrice);
      await user.click(screen.getByRole("button", { name: "Add price" }));
      setValue("Price 2", "10");
      setValue("Price 2 start date", "2099-03-01");
      setValue("Price 2 start time", "09:00");
      setValue("Price 1 start time", "09:00");
      await clickSave(user);
      expect(
        await screen.findAllByText(
          "Two prices can't take effect at the same time.",
        ),
      ).not.toEqual([]);

      setValue("Price 1 start date", "2099-03-02");

      await waitFor(() => {
        expect(screen.getByLabelText("Price 2 start time")).toHaveAttribute(
          "aria-invalid",
          "false",
        );
        expect(
          screen.queryByText("Two prices can't take effect at the same time."),
        ).not.toBeInTheDocument();
      });
    });
  });
});
