import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { draftedAdminCourse } from "@/mocks/fixtures/admin-courses";
import { FROZEN_NOW } from "@/test/frozen-now";

import { toEditFormPrefill } from "../edit-form-prefill";
import {
  clickSave,
  makeEditFormElement,
  prefill,
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

beforeEach(() => {
  vi.resetAllMocks();
});

const HOUR_MS = 3600_000;
const DAY_MS = 24 * HOUR_MS;

/** A course whose times start a week after the frozen time. */
const futurePrefill = toEditFormPrefill(
  {
    ...draftedAdminCourse,
    schedule: {
      ...draftedAdminCourse.schedule,
      startTime: new Date(FROZEN_NOW + 7 * DAY_MS).toISOString(),
      endTime: new Date(FROZEN_NOW + 7 * DAY_MS + 2 * HOUR_MS).toISOString(),
    },
  },
  FROZEN_NOW,
);

const END_DATE_BEFORE_START =
  "The end date must be on or after the start date.";

describe("EditCourseForm schedule", () => {
  it("shows the times in the chosen zone, and the line follows a zone change", async () => {
    const user = userEvent.setup();
    renderForm();
    expect(
      screen.getByText(/^Runs .*2:00 PM to .*4:00 PM \(America\/New_York\)/),
    ).toBeVisible();

    const zone = screen.getByRole("combobox", { name: "Time zone" });
    await user.clear(zone);
    await user.type(zone, "paris");
    await user.click(screen.getByRole("option", { name: "Europe/Paris" }));

    expect(
      screen.getByText(/^Runs .*2:00 PM to .*4:00 PM \(Europe\/Paris\)/),
    ).toBeVisible();
  });

  it("sends no request when a changed start is in the past", async () => {
    const user = userEvent.setup();
    renderForm({
      ...prefill,
      values: {
        ...prefill.values,
        schedule: { ...prefill.values.schedule, startTimeOfDay: "13:00" },
      },
    });

    await clickSave(user);

    await screen.findAllByText("The start time must be in the future.");
    expect(
      screen.getByLabelText("Start time").closest("[data-invalid]"),
    ).toHaveTextContent("The start time must be in the future.");
    expect(saveAction).not.toHaveBeenCalled();
  });

  it("sends no request when the zone change moves a started course's times into the past", async () => {
    const user = userEvent.setup();
    renderForm();

    const zone = screen.getByRole("combobox", { name: "Time zone" });
    await user.clear(zone);
    await user.type(zone, "paris");
    await user.click(screen.getByRole("option", { name: "Europe/Paris" }));
    await clickSave(user);

    await screen.findAllByText("The start time must be in the future.");
    expect(
      screen.getByLabelText("Start time").closest("[data-invalid]"),
    ).toHaveTextContent("The start time must be in the future.");
    expect(
      screen.getByLabelText("End time").closest("[data-invalid]"),
    ).toHaveTextContent("The end time must be in the future.");
    expect(saveAction).not.toHaveBeenCalled();
  });

  it("fills the four boxes from the stored times and shows no problem", () => {
    renderForm();

    expect(screen.getByLabelText("Start date")).toHaveValue("2026-10-01");
    expect(screen.getByLabelText("Start time")).toHaveValue("14:00");
    expect(screen.getByLabelText("End date")).toHaveValue("2026-10-01");
    expect(screen.getByLabelText("End time")).toHaveValue("16:00");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a changed start in the past under Start time and in the error list", async () => {
    const user = userEvent.setup();
    renderForm();

    setValue("Start date", "2026-10-02");
    await clickSave(user);

    await screen.findAllByText("The start time must be in the future.");
    expect(
      screen.getByLabelText("Start time").closest("[data-invalid]"),
    ).toHaveTextContent("The start time must be in the future.");
    expect(
      screen.getByRole("button", { name: "Start time" }),
    ).toBeInTheDocument();
  });

  it("clears the problem once the times are corrected", async () => {
    const user = userEvent.setup();
    renderForm();
    setValue("Start date", "2026-10-02");
    await clickSave(user);
    await screen.findAllByText("The start time must be in the future.");

    setValue("Start date", "2030-01-01");
    setValue("End date", "2030-01-02");

    await waitFor(() => {
      expect(screen.getByLabelText("Start time")).toHaveAttribute(
        "aria-invalid",
        "false",
      );
      expect(
        screen.queryByText("The start time must be in the future."),
      ).not.toBeInTheDocument();
    });
  });

  it("shows an end date before the start date on End date at once, with no request", async () => {
    const user = userEvent.setup();
    renderForm();

    setValue("Start date", "2030-01-02");
    setValue("End date", "2030-01-01");

    const endDate = screen.getByLabelText("End date");
    expect(await screen.findByText(END_DATE_BEFORE_START)).toBeVisible();
    expect(endDate).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("End time")).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );

    await clickSave(user);
    expect(
      await screen.findByRole("button", { name: "End date" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "End date" }));
    expect(endDate).toHaveFocus();
    expect(saveAction).not.toHaveBeenCalled();
  });

  it("replaces the in-the-future message with the end-date one when the end date is earlier", async () => {
    renderForm();

    setValue("End date", "2026-09-30");

    expect(await screen.findByText(END_DATE_BEFORE_START)).toBeVisible();
    expect(
      screen.queryByText("The end time must be in the future."),
    ).not.toBeInTheDocument();
  });

  it("flags a reached End date when the start date moves past it, and a later end date clears it", async () => {
    renderForm();
    setValue("End date", "2030-01-05");
    setValue("Start date", "2030-01-06");
    expect(await screen.findByText(END_DATE_BEFORE_START)).toBeVisible();

    setValue("End date", "2030-01-07");
    await waitFor(() => {
      expect(screen.getByLabelText("End date")).toHaveAttribute(
        "aria-invalid",
        "false",
      );
      expect(screen.queryByText(END_DATE_BEFORE_START)).not.toBeInTheDocument();
    });
  });

  it("leaves End date clean when the start date moves and the end date was never reached", async () => {
    renderForm();

    setValue("Start date", "2030-01-06");

    expect(
      await screen.findAllByRole("img", { name: "Looks good" }),
    ).not.toHaveLength(0);
    expect(screen.queryByText(END_DATE_BEFORE_START)).not.toBeInTheDocument();
    expect(screen.getByLabelText("End date")).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("shows a same-day end not after the start on End time only", async () => {
    renderForm();

    setValue("Start date", "2030-01-02");
    setValue("End date", "2030-01-02");
    setValue("End time", "13:00");

    expect(
      await screen.findByText("The end time must be after the start time."),
    ).toBeVisible();
    expect(screen.getByLabelText("End date")).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  describe("time zone change note", () => {
    const moveNote =
      "The dates and times stay as typed, so the course moves to that time in Europe/Paris.";
    const alreadyRanSentence =
      "Because it has started or ended, the moved times must be in the future.";

    async function typeZone(
      user: ReturnType<typeof userEvent.setup>,
      text: string,
    ) {
      const zone = screen.getByRole("combobox", { name: "Time zone" });
      await user.clear(zone);
      await user.type(zone, text);
    }

    async function pickParis(user: ReturnType<typeof userEvent.setup>) {
      await typeZone(user, "paris");
      await user.click(screen.getByRole("option", { name: "Europe/Paris" }));
    }

    it("shows no note for the loaded zone", () => {
      renderForm();
      expect(screen.getByRole("combobox", { name: "Time zone" })).toBeVisible();
      expect(screen.queryByText(/stay as typed/)).not.toBeInTheDocument();
    });

    it("explains a chosen zone and, on a started course, the future rule", async () => {
      const user = userEvent.setup();
      renderForm();

      await pickParis(user);

      expect(
        screen.getByText(`${moveNote} ${alreadyRanSentence}`),
      ).toBeVisible();
    });

    it("adds the future rule for a course that is running", async () => {
      const user = userEvent.setup();
      renderForm(
        toEditFormPrefill(
          {
            ...draftedAdminCourse,
            schedule: {
              ...draftedAdminCourse.schedule,
              startTime: new Date(FROZEN_NOW - HOUR_MS).toISOString(),
              endTime: new Date(FROZEN_NOW + 2 * HOUR_MS).toISOString(),
            },
          },
          FROZEN_NOW,
        ),
      );

      await pickParis(user);

      expect(
        screen.getByText(`${moveNote} ${alreadyRanSentence}`),
      ).toBeVisible();
    });

    it("leaves out the future rule for a course that starts later", async () => {
      const user = userEvent.setup();
      renderForm(futurePrefill);

      await pickParis(user);

      expect(screen.getByText(moveNote)).toBeVisible();
      expect(
        screen.queryByText(/has started or ended/),
      ).not.toBeInTheDocument();
    });

    it("hides the note when the loaded zone is chosen again", async () => {
      const user = userEvent.setup();
      renderForm();
      await pickParis(user);
      expect(screen.getByText(/stay as typed/)).toBeVisible();

      await typeZone(user, "york");
      await user.click(
        screen.getByRole("option", { name: "America/New_York" }),
      );

      expect(screen.queryByText(/stay as typed/)).not.toBeInTheDocument();
    });

    it("shows no note for a half-typed zone", async () => {
      const user = userEvent.setup();
      renderForm();

      await typeZone(user, "Europe/Par");

      expect(screen.queryByText(/stay as typed/)).not.toBeInTheDocument();
    });

    it("hides the note when the reloaded course has the new zone", async () => {
      const user = userEvent.setup();
      const view = renderForm();
      await pickParis(user);
      expect(screen.getByText(/stay as typed/)).toBeVisible();

      view.rerender(
        makeEditFormElement({
          ...prefill,
          values: {
            ...prefill.values,
            schedule: { ...prefill.values.schedule, timeZone: "Europe/Paris" },
          },
        }),
      );

      await waitFor(() =>
        expect(screen.queryByText(/stay as typed/)).not.toBeInTheDocument(),
      );
    });
  });

  describe("progress note", () => {
    const prefillWithTimes = (startTime: string, endTime: string) =>
      toEditFormPrefill(
        {
          ...draftedAdminCourse,
          schedule: { ...draftedAdminCourse.schedule, startTime, endTime },
        },
        FROZEN_NOW,
      );

    it("says an ended course has ended", () => {
      renderForm();
      expect(
        screen.getByText(
          "This course has ended. You can keep its times, but a changed time must be in the future.",
        ),
      ).toBeVisible();
    });

    it("says a running course has started", () => {
      renderForm(
        prefillWithTimes(
          new Date(FROZEN_NOW - HOUR_MS).toISOString(),
          new Date(FROZEN_NOW + 2 * HOUR_MS).toISOString(),
        ),
      );
      expect(
        screen.getByText(
          "This course has started. You can keep its times, but a changed time must be in the future.",
        ),
      ).toBeVisible();
    });

    it("shows no note for a course that starts later", () => {
      renderForm(futurePrefill);
      expect(screen.getByLabelText("Start date")).toBeVisible();
      expect(
        screen.queryByText(/a changed time must be in the future/),
      ).not.toBeInTheDocument();
    });

    it("hides the note when the reloaded course has its times ahead", () => {
      const view = renderForm();
      expect(screen.getByText(/This course has ended/)).toBeVisible();

      view.rerender(makeEditFormElement(futurePrefill));

      expect(
        screen.queryByText(/a changed time must be in the future/),
      ).not.toBeInTheDocument();
    });
  });
});
