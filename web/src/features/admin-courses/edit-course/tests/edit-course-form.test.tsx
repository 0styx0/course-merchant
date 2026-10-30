import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { draftedAdminCourse } from "@/mocks/fixtures/admin-courses";

import type { CourseActionResult } from "../../save-course/course-action-result";
import { updateCourseDetailsAction } from "../../save-course/edit/update-course-details.action";
import { EditCourseForm } from "../edit-course-form";
import { toEditCourseStart } from "../edit-course-start";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("../../save-course/edit/update-course-details.action", () => ({
  updateCourseDetailsAction: vi.fn(),
}));
// Typing into Tiptap is unreliable in jsdom (the browser test covers it), so
// the editor is a plain stand-in.
vi.mock("../../description-editor/description-editor", () => ({
  DescriptionEditor: () => <div>Description editor</div>,
}));

const saveAction = vi.mocked(updateCourseDetailsAction);
const start = toEditCourseStart(draftedAdminCourse);
const timeZones = ["America/New_York", "Europe/Paris"];

function renderForm(startOverride = start) {
  return render(
    <EditCourseForm
      courseId={draftedAdminCourse.id}
      start={startOverride}
      timeZones={timeZones}
    />,
  );
}

function refusal(
  title: string,
  fieldErrors: { path: string; message: string }[],
): CourseActionResult {
  return {
    state: "failure",
    error: {
      problem: {
        title,
        detail: `${title} detail.`,
        code: "VALIDATION_FAILED",
      },
      fieldErrors,
    },
  };
}

function setValue(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

async function clickSave(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Save changes" }));
}

function leaveEvent() {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event;
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("EditCourseForm", () => {
  it("starts with every field filled and no errors or leave warning", () => {
    renderForm();

    expect(screen.getByLabelText("Course name")).toHaveValue(
      "React Fundamentals",
    );
    expect(screen.getByLabelText("Summary")).toHaveValue("Learn React");
    expect(screen.getByLabelText("Content link")).toHaveValue(
      "https://example.com/course",
    );
    expect(screen.getByRole("combobox", { name: "Time zone" })).toHaveValue(
      "America/New_York",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(leaveEvent().defaultPrevented).toBe(false);
  });

  it("shows the kept times in the chosen zone, and the save keeps them", async () => {
    const user = userEvent.setup();
    saveAction.mockResolvedValue({
      state: "success",
      data: { courseId: "c1" },
    });
    renderForm();
    expect(screen.getByText(/^Runs .*\(America\/New_York\)/)).toBeVisible();

    const zone = screen.getByRole("combobox", { name: "Time zone" });
    await user.clear(zone);
    await user.type(zone, "paris");
    await user.click(screen.getByRole("option", { name: "Europe/Paris" }));
    expect(screen.getByText(/^Runs .*\(Europe\/Paris\)/)).toBeVisible();

    await clickSave(user);
    await waitFor(() => expect(saveAction).toHaveBeenCalledOnce());
    expect(saveAction.mock.calls[0][0]).toBe(draftedAdminCourse.id);
    expect(saveAction.mock.calls[0][1].schedule.timeZone).toBe("Europe/Paris");
    expect(saveAction.mock.calls[0][2].schedule).toEqual(
      start.keptParts.schedule,
    );
  });

  it("saves the edited name with the rest as given, then goes to the home page", async () => {
    const user = userEvent.setup();
    saveAction.mockResolvedValue({
      state: "success",
      data: { courseId: "c1" },
    });
    renderForm();

    setValue("Course name", "Renamed");
    await clickSave(user);

    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(saveAction).toHaveBeenCalledWith(
      draftedAdminCourse.id,
      { ...start.values, name: "Renamed" },
      start.keptParts,
    );
  });

  it("lists an empty name and sends no request", async () => {
    const user = userEvent.setup();
    renderForm();

    setValue("Course name", "");
    await clickSave(user);

    const list = (
      await screen.findByRole("heading", { name: /Fix 1 problem/ })
    ).closest("[role=alert]");
    expect(list).toHaveTextContent("Course name: Enter a course name.");
    expect(saveAction).not.toHaveBeenCalled();
  });

  it("shows a refusal, keeps the values, and replaces it with the next one", async () => {
    const user = userEvent.setup();
    saveAction
      .mockResolvedValueOnce(
        refusal("First refusal", [{ path: "name", message: "Name is taken." }]),
      )
      .mockResolvedValueOnce(
        refusal("Second refusal", [
          { path: "contentUrl", message: "Link is dead." },
        ]),
      )
      .mockResolvedValueOnce({ state: "success", data: { courseId: "c1" } });
    renderForm();

    setValue("Course name", "Renamed");
    await clickSave(user);
    await screen.findByRole("heading", { name: "First refusal" });
    expect(screen.getByText("First refusal detail.")).toBeVisible();
    expect(screen.getByLabelText("Course name")).toHaveAccessibleDescription(
      /Name is taken\./,
    );
    expect(screen.getByLabelText("Course name")).toHaveValue("Renamed");

    await clickSave(user);
    await screen.findByRole("heading", { name: "Second refusal" });
    expect(
      screen.queryByRole("heading", { name: "First refusal" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Content link")).toHaveAccessibleDescription(
      /Link is dead\./,
    );

    await clickSave(user);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
  });

  it("shows an error on a field the form lacks only above the form, and the next save goes through", async () => {
    const user = userEvent.setup();
    saveAction
      .mockResolvedValueOnce(
        refusal("Start refused", [
          { path: "schedule.startTime", message: "Start is in the past." },
        ]),
      )
      .mockResolvedValueOnce({ state: "success", data: { courseId: "c1" } });
    renderForm();

    await clickSave(user);
    await screen.findByRole("heading", { name: "Start refused" });
    expect(screen.queryByText("Start is in the past.")).not.toBeInTheDocument();

    await clickSave(user);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
  });

  it("shows a server problem that has no field errors, and keeps the form", async () => {
    const user = userEvent.setup();
    saveAction.mockResolvedValue(refusal("Internal server error", []));
    renderForm();

    setValue("Course name", "Renamed");
    await clickSave(user);

    await screen.findByRole("heading", { name: "Internal server error" });
    expect(screen.getByText("Internal server error detail.")).toBeVisible();
    expect(screen.getByLabelText("Course name")).toHaveValue("Renamed");
    expect(push).not.toHaveBeenCalled();
  });

  it("says the save couldn't happen when the action throws, without a draft note", async () => {
    const user = userEvent.setup();
    saveAction.mockRejectedValue(new Error("network"));
    renderForm();

    await clickSave(user);

    await screen.findByRole("heading", { name: "Couldn't save the course" });
    expect(screen.queryByText(/saved as a draft/)).not.toBeInTheDocument();
  });

  it("is disabled and reads Saving… while saving", async () => {
    const user = userEvent.setup();
    let finish: (result: CourseActionResult) => void = () => {};
    saveAction.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderForm();

    await clickSave(user);

    expect(
      await screen.findByRole("button", { name: "Saving…" }),
    ).toBeDisabled();
    finish({ state: "success", data: { courseId: "c1" } });
    await waitFor(() => expect(push).toHaveBeenCalled());
  });

  it("asks for a time zone when the stored one is not a real zone", async () => {
    const user = userEvent.setup();
    renderForm({
      ...start,
      values: { ...start.values, schedule: { timeZone: "Not/AZone" } },
    });

    await clickSave(user);

    const list = (
      await screen.findByRole("heading", { name: /Fix 1 problem/ })
    ).closest("[role=alert]");
    expect(list).toHaveTextContent("Time zone: Choose a time zone.");
    expect(saveAction).not.toHaveBeenCalled();
  });

  describe("leave-page warning", () => {
    it("is on after an edit", async () => {
      renderForm();
      setValue("Course name", "Renamed");
      await waitFor(() => expect(leaveEvent().defaultPrevented).toBe(true));
    });

    it("is off after a save", async () => {
      const user = userEvent.setup();
      saveAction.mockResolvedValue({
        state: "success",
        data: { courseId: "c1" },
      });
      renderForm();
      setValue("Course name", "Renamed");
      await clickSave(user);
      await waitFor(() => expect(push).toHaveBeenCalled());
      expect(leaveEvent().defaultPrevented).toBe(false);
    });
  });
});
