import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderForm } from "./create-course-form.fixtures";

vi.mock(
  "next/navigation",
  async () => (await import("./create-course-form.mocks")).navigationMock,
);
vi.mock("../../save-course/create/create-course.action", () => ({
  createCourseAction: vi.fn(),
}));
vi.mock("../../save-course/create/retry-draft-save.action", () => ({
  retryDraftSaveAction: vi.fn(),
}));
vi.mock("../../save-course/upload-image/upload-course-image.action", () => ({
  uploadCourseImageAction: vi.fn(),
}));
vi.mock("../../description-editor/description-editor", async () => ({
  DescriptionEditor: (await import("./create-course-form.mocks"))
    .MockDescriptionEditor,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CourseForm", () => {
  it("adds and removes price rows, numbering them only when there are several", async () => {
    const user = userEvent.setup();
    renderForm();
    expect(
      screen.queryByRole("button", { name: /Remove price/ }),
    ).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Price"), "10");
    await user.click(screen.getByRole("button", { name: "Add price" }));

    expect(screen.getByLabelText("Price 1")).toHaveValue("10");
    expect(screen.getByLabelText("Price 2")).toHaveValue("");
    expect(screen.getByLabelText("Price 2 start date")).toHaveValue("");

    await user.type(screen.getByLabelText("Price 2"), "20");
    await user.click(screen.getByRole("button", { name: "Remove price 1" }));

    expect(screen.getByLabelText("Price")).toHaveValue("20");
    expect(screen.queryByLabelText("Price 2")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Remove price/ }),
    ).not.toBeInTheDocument();
  });

  it("lists a problem on a later price row with its number and focuses it", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: "Add price" }));
    await user.click(screen.getByRole("button", { name: "Save as draft" }));

    await user.click(await screen.findByRole("button", { name: "Price 2" }));

    expect(screen.getByLabelText("Price 2")).toHaveFocus();
  });

  it("clears the same-time error when the duplicate row is removed", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: "Add price" }));
    for (const row of ["Price 1", "Price 2"]) {
      fireEvent.change(screen.getByLabelText(row), { target: { value: "10" } });
      fireEvent.change(screen.getByLabelText(`${row} start date`), {
        target: { value: "2099-01-10" },
      });
      fireEvent.change(screen.getByLabelText(`${row} start time`), {
        target: { value: "09:00" },
      });
    }
    await user.click(screen.getByRole("button", { name: "Save as draft" }));
    expect(
      await screen.findAllByText(
        "Two prices can't take effect at the same time.",
      ),
    ).not.toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Remove price 2" }));

    expect(
      screen.queryByText("Two prices can't take effect at the same time."),
    ).not.toBeInTheDocument();
  });

  describe("a price start in the past", () => {
    const PAST_DAY_MESSAGE =
      "Choose a date that isn't in the past, or leave both empty to start when the course is published.";

    function setValue(label: string, value: string) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }

    it("shows the message under Start date, and fixing the date clears it", async () => {
      renderForm();
      setValue("Price", "10");
      setValue("Price start time", "09:00");

      setValue("Price start date", "2020-01-01");

      await screen.findByText(PAST_DAY_MESSAGE);
      expect(
        screen.getByLabelText("Price start date"),
      ).toHaveAccessibleDescription(PAST_DAY_MESSAGE);
      expect(
        screen.getByLabelText("Price start time"),
      ).not.toHaveAccessibleDescription(PAST_DAY_MESSAGE);

      setValue("Price start date", "2099-01-10");

      await waitFor(() =>
        expect(screen.queryByText(PAST_DAY_MESSAGE)).not.toBeInTheDocument(),
      );
    });

    it("clears another row's same-time error when one row's start changes", async () => {
      const user = userEvent.setup();
      renderForm();
      await user.click(screen.getByRole("button", { name: "Add price" }));
      for (const row of ["Price 1", "Price 2"]) {
        setValue(row, "10");
        setValue(`${row} start date`, "2099-01-10");
        setValue(`${row} start time`, "09:00");
      }
      await user.click(screen.getByRole("button", { name: "Save as draft" }));
      expect(
        await screen.findAllByText(
          "Two prices can't take effect at the same time.",
        ),
      ).not.toHaveLength(0);

      setValue("Price 1 start date", "2099-01-11");

      await waitFor(() =>
        expect(
          screen.queryByText("Two prices can't take effect at the same time."),
        ).not.toBeInTheDocument(),
      );
    });

    it("keeps boxes the admin has not reached quiet", async () => {
      renderForm();
      setValue("Price start time", "09:00");

      setValue("Price start date", "2020-01-01");

      // The amount box is empty, so it would show a message if it were checked.
      await screen.findByText(PAST_DAY_MESSAGE);
      expect(
        screen.queryByText("Enter a price, like 79.50."),
      ).not.toBeInTheDocument();
    });
  });
});
