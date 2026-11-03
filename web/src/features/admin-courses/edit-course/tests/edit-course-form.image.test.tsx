import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  adminCourseWithImage,
  draftedAdminCourse,
} from "@/mocks/fixtures/admin-courses";

import { toEditFormPrefill } from "../edit-form-prefill";
import { clickSave, renderForm, saveAction } from "./edit-course-form.fixtures";

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

const prefillWithImage = toEditFormPrefill(adminCourseWithImage);
const noImageText =
  "No image yet. A course needs one before it can be published.";

/** jsdom can neither decode an image nor make a preview address, so stand in for both. */
function stubImageDecoding(size: { width: number; height: number } | null) {
  const decode = size
    ? vi.fn().mockResolvedValue({ ...size, close: vi.fn() })
    : vi.fn().mockRejectedValue(new Error("unreadable"));
  vi.stubGlobal("createImageBitmap", decode);
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
}

async function chooseImageFile(user: ReturnType<typeof userEvent.setup>) {
  const file = new File([new Uint8Array(10)], "photo", { type: "image/webp" });
  await user.upload(screen.getByLabelText("Image"), file);
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("EditCourseForm image", () => {
  it("shows the stored image through the web app's image route, by its version", () => {
    renderForm(prefillWithImage);

    expect(
      screen.getByRole("img", { name: "Current course image" }),
    ).toHaveAttribute(
      "src",
      `/admin/courses/${draftedAdminCourse.id}/image?v=${adminCourseWithImage.image.version}`,
    );
  });

  it("says the course needs an image when none is stored", () => {
    renderForm();

    expect(screen.getByText(noImageText)).toBeInTheDocument();
  });

  it("says so when the stored image fails to load", () => {
    renderForm(prefillWithImage);

    fireEvent.error(screen.getByRole("img", { name: "Current course image" }));

    expect(
      screen.getByText("The stored image couldn't be loaded."),
    ).toBeInTheDocument();
  });

  it("replaces the stored image's preview with the chosen file", async () => {
    const user = userEvent.setup();
    stubImageDecoding({ width: 1600, height: 900 });
    renderForm(prefillWithImage);

    await chooseImageFile(user);

    expect(
      await screen.findByRole("img", { name: "Preview of the chosen image" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: "Current course image" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the stored image when the chosen file can't be read", async () => {
    const user = userEvent.setup();
    stubImageDecoding(null);
    renderForm(prefillWithImage);

    await chooseImageFile(user);

    expect(
      await screen.findByRole("img", { name: "Current course image" }),
    ).toBeInTheDocument();
  });

  it("keeps the no-image text when the chosen file can't be read", async () => {
    const user = userEvent.setup();
    stubImageDecoding(null);
    renderForm();

    await chooseImageFile(user);

    expect(await screen.findByText(noImageText)).toBeInTheDocument();
  });

  it("lists a refused image as Image in the error list", async () => {
    const user = userEvent.setup();
    stubImageDecoding({ width: 100, height: 50 });
    renderForm();

    await chooseImageFile(user);
    await clickSave(user);

    const problemCountHeading = await screen.findByRole("heading", {
      name: /^Fix \d+ problem/,
    });
    expect(problemCountHeading.closest("[role=alert]")).toHaveTextContent(
      "Image: The image must be at least 800 × 450 pixels.",
    );
    expect(saveAction).not.toHaveBeenCalled();
  });
});
