import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CourseActionResult } from "../save-course/course-action-result";
import {
  action,
  chooseImage,
  fillValidForm,
  renderForm,
  summaryWithHeading,
  updateAction,
  uploadAction,
} from "./course-form.fixtures";
import { push } from "./course-form.mocks";

vi.mock(
  "next/navigation",
  async () => (await import("./course-form.mocks")).navigationMock,
);
vi.mock("../save-course/create-course.action", () => ({
  createCourseAction: vi.fn(),
}));
vi.mock("../save-course/update-course.action", () => ({
  updateCourseAction: vi.fn(),
}));
vi.mock("../save-course/upload-image/upload-course-image.action", () => ({
  uploadCourseImageAction: vi.fn(),
}));
vi.mock("../description-editor/description-editor", async () => ({
  DescriptionEditor: (await import("./course-form.mocks"))
    .MockDescriptionEditor,
}));

const created: CourseActionResult = {
  state: "success",
  data: { courseId: "c1" },
};

const uploadRefused: CourseActionResult = {
  state: "failure",
  error: {
    problem: {
      title: "Validation failed",
      detail: "The file is not a valid image.",
      code: "VALIDATION_FAILED",
    },
    fieldErrors: [{ path: "image", message: "The image is too small." }],
  },
};

beforeEach(() => {
  vi.resetAllMocks();
  uploadAction.mockResolvedValue(created);
});

async function submit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Save as draft" }));
}

describe("CourseForm image", () => {
  it("refuses a too-small image and calls no action", async () => {
    const user = userEvent.setup();
    renderForm();
    await fillValidForm(user);
    // Replace the chosen image with one the form refuses.
    await chooseImage(user, { width: 100, height: 50 });
    await submit(user);

    const summary = summaryWithHeading(/^Fix \d+ problem/);
    expect(summary).toHaveTextContent(
      "Image: The image must be at least 800 × 450 pixels.",
    );
    expect(action).not.toHaveBeenCalled();
  });

  it("says to choose an image when none is chosen", async () => {
    const user = userEvent.setup();
    renderForm();
    await submit(user);

    expect(await screen.findByLabelText("Image")).toHaveAccessibleDescription(
      /Choose an image\./,
    );
    expect(action).not.toHaveBeenCalled();
  });

  describe("when the image upload fails", () => {
    async function submitWithRefusedUpload(
      user: ReturnType<typeof userEvent.setup>,
    ) {
      action.mockResolvedValue(created);
      uploadAction.mockResolvedValueOnce(uploadRefused);
      renderForm();
      await fillValidForm(user);
      await submit(user);
      await screen.findByRole("heading", { name: "Image upload failed" });
    }

    it("keeps the draft and says so, with the error on the image field", async () => {
      const user = userEvent.setup();
      await submitWithRefusedUpload(user);

      expect(summaryWithHeading("Image upload failed")).toHaveTextContent(
        "The course was saved as a draft, but the image didn't upload. The file is not a valid image.",
      );
      expect(screen.getByLabelText("Image")).toHaveAccessibleDescription(
        /The image is too small\./,
      );
      expect(push).not.toHaveBeenCalled();
    });

    it("retries with an update and an upload, never a second create", async () => {
      const user = userEvent.setup();
      await submitWithRefusedUpload(user);
      updateAction.mockResolvedValue(created);
      await user.clear(screen.getByLabelText("Course name"));
      await user.type(screen.getByLabelText("Course name"), "Renamed");
      await submit(user);

      await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
      expect(action).toHaveBeenCalledOnce();
      expect(updateAction).toHaveBeenCalledOnce();
      expect(updateAction.mock.calls[0][0]).toBe("c1");
      expect(updateAction.mock.calls[0][1]).toMatchObject({ name: "Renamed" });
      expect(updateAction.mock.calls[0][1]).not.toHaveProperty("image");
      expect(uploadAction).toHaveBeenCalledTimes(2);
    });

    it("keeps the leave warning on until the upload succeeds", async () => {
      const user = userEvent.setup();
      await submitWithRefusedUpload(user);

      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe("when an action is rejected", () => {
    const generalMessage =
      "Something went wrong while saving. Check your connection and try again.";

    it("shows a general message when create throws, and retries with create", async () => {
      const user = userEvent.setup();
      action.mockRejectedValueOnce(new Error("network"));
      renderForm();
      await fillValidForm(user);
      await submit(user);

      await screen.findByRole("heading", { name: "Couldn't save the course" });
      expect(summaryWithHeading("Couldn't save the course")).toHaveTextContent(
        generalMessage,
      );

      action.mockResolvedValue(created);
      await submit(user);
      await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
      expect(action).toHaveBeenCalledTimes(2);
      expect(updateAction).not.toHaveBeenCalled();
    });

    it("keeps the draft id when the upload throws", async () => {
      const user = userEvent.setup();
      action.mockResolvedValue(created);
      uploadAction.mockRejectedValueOnce(new Error("too large"));
      renderForm();
      await fillValidForm(user);
      await submit(user);

      await screen.findByRole("heading", { name: "Couldn't save the course" });
      expect(summaryWithHeading("Couldn't save the course")).toHaveTextContent(
        "The course was saved as a draft.",
      );

      updateAction.mockResolvedValue(created);
      await submit(user);
      await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
      expect(action).toHaveBeenCalledOnce();
    });
  });
});
