import { zodResolver } from "@hookform/resolvers/zod";
import { act, renderHook } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { draftedAdminCourse } from "@/mocks/fixtures/admin-courses";

import type { ChosenImage } from "../image/course-image";
import type { CourseActionResult } from "../save-course/course-action-result";
import { saveEditedDetailsAction } from "../save-course/edit/save-edited-details.action";
import { uploadCourseImageAction } from "../save-course/upload-image/upload-course-image.action";
import {
  makeEditCourseFormSchema,
  type EditCourseFormValues,
} from "../validation/edit-course-form-schema";
import { toEditFormPrefill } from "./edit-form-prefill";
import { useSaveEditedCourse } from "./use-save-edited-course";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("../save-course/edit/save-edited-details.action", () => ({
  saveEditedDetailsAction: vi.fn(),
}));
vi.mock("../save-course/upload-image/upload-course-image.action", () => ({
  uploadCourseImageAction: vi.fn(),
}));

const detailsAction = vi.mocked(saveEditedDetailsAction);
const uploadAction = vi.mocked(uploadCourseImageAction);
const prefill = toEditFormPrefill(draftedAdminCourse);
const courseId = draftedAdminCourse.id;

const saved: CourseActionResult = {
  state: "success",
  data: { courseId },
};

function refusedAt(path: string, detail: string): CourseActionResult {
  return {
    state: "failure",
    error: {
      problem: {
        title: "Validation failed",
        detail,
        code: "VALIDATION_FAILED",
      },
      fieldErrors: [{ path, message: `${path} refused` }],
    },
  };
}

function chosenImage(width = 1600, height = 900): ChosenImage {
  const file = new File(["x"], "cover.png", { type: "image/png" });
  return { file, width, height };
}

function renderEditSave(image: ChosenImage | null) {
  return renderHook(() => {
    const form = useForm<EditCourseFormValues, unknown, EditCourseFormValues>({
      resolver: zodResolver(
        makeEditCourseFormSchema(prefill.loadedSchedule, prefill.loadedPrices),
      ),
      defaultValues: { ...prefill.values, image },
    });
    const saving = useSaveEditedCourse(
      form,
      courseId,
      prefill.loadedSchedule,
      prefill.loadedPrices,
    );
    return { form, saving };
  });
}

type EditSaveHook = ReturnType<typeof renderEditSave>["result"];

async function submitEditForm(result: EditSaveHook) {
  await act(() =>
    result.current.form.handleSubmit(result.current.saving.save)(),
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  detailsAction.mockResolvedValue(saved);
  uploadAction.mockResolvedValue(saved);
});

describe("useSaveEditedCourse", () => {
  it("saves only the details when no file is chosen, then shows Saved", async () => {
    const { result } = renderEditSave(null);
    await submitEditForm(result);

    expect(detailsAction).toHaveBeenCalledOnce();
    expect(detailsAction.mock.calls[0]?.[1]).not.toHaveProperty("image");
    expect(uploadAction).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("uploads a chosen file before the details, then shows Saved", async () => {
    const image = chosenImage();
    const { result } = renderEditSave(image);
    await submitEditForm(result);

    expect(detailsAction.mock.calls[0]?.[1]).not.toHaveProperty("image");
    expect(uploadAction).toHaveBeenCalledOnce();
    const [uploadedFor, formData] = uploadAction.mock.calls[0] ?? [];
    expect(uploadedFor).toBe(courseId);
    expect(formData?.get("image")).toBe(image.file);
    expect(uploadAction.mock.invocationCallOrder[0]).toBeLessThan(
      detailsAction.mock.invocationCallOrder[0] ?? 0,
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("sends no details save when the image is refused, and shows the API's message", async () => {
    uploadAction.mockResolvedValue(refusedAt("image", "The file is broken."));
    const { result } = renderEditSave(chosenImage());
    await submitEditForm(result);

    expect(detailsAction).not.toHaveBeenCalled();
    expect(result.current.saving.serverMessage.serverProblem?.detail).toBe(
      "The file is broken.",
    );
    expect(result.current.form.getFieldState("image").error?.message).toBe(
      "image refused",
    );
  });

  it("says the image was saved when the details are refused, and stays", async () => {
    detailsAction.mockResolvedValue(refusedAt("name", "The name is taken."));
    const { result } = renderEditSave(chosenImage());
    await submitEditForm(result);

    expect(result.current.saving.serverMessage.serverProblem?.detail).toBe(
      "The image was saved, but the course details didn't save. The name is taken.",
    );
    expect(result.current.form.getFieldState("name").error?.message).toBe(
      "name refused",
    );
  });

  it("skips the upload on the next save after the details were refused", async () => {
    detailsAction.mockResolvedValueOnce(
      refusedAt("name", "The name is taken."),
    );
    const { result } = renderEditSave(chosenImage());
    await submitEditForm(result);
    await submitEditForm(result);

    expect(uploadAction).toHaveBeenCalledOnce();
    expect(detailsAction).toHaveBeenCalledTimes(2);
  });

  it("says something went wrong when the upload throws", async () => {
    uploadAction.mockRejectedValue(new Error("offline"));
    const { result } = renderEditSave(chosenImage());
    await submitEditForm(result);

    expect(detailsAction).not.toHaveBeenCalled();
    expect(result.current.saving.serverMessage.serverProblem).toEqual({
      title: "Couldn't save the course",
      detail:
        "Something went wrong while saving. Check your connection and try again.",
    });
  });

  it("adds that the image was saved when the details action throws", async () => {
    detailsAction.mockRejectedValue(new Error("offline"));
    const { result } = renderEditSave(chosenImage());
    await submitEditForm(result);

    expect(result.current.saving.serverMessage.serverProblem?.detail).toBe(
      "Something went wrong while saving. Check your connection and try again. The image was saved.",
    );
  });

  it("refuses a file that fails the browser check before any request", async () => {
    const { result } = renderEditSave(chosenImage(100, 50));
    await submitEditForm(result);

    expect(detailsAction).not.toHaveBeenCalled();
    expect(uploadAction).not.toHaveBeenCalled();
    expect(result.current.form.getFieldState("image").error?.message).toBe(
      "The image must be at least 800 × 450 pixels.",
    );
  });

  it("uploads again on the next save after the image was refused", async () => {
    uploadAction.mockResolvedValueOnce(
      refusedAt("image", "The file is broken."),
    );
    const { result } = renderEditSave(chosenImage());
    await submitEditForm(result);
    await submitEditForm(result);

    expect(uploadAction).toHaveBeenCalledTimes(2);
    expect(detailsAction).toHaveBeenCalledOnce();
  });

  it("shows the note Saved after a full success", async () => {
    const { result } = renderEditSave(null);
    await submitEditForm(result);

    expect(result.current.saving.savedNote).toBe("Saved");
  });

  it("shows no Saved note after a refused save", async () => {
    detailsAction.mockResolvedValue(refusedAt("name", "The name is taken."));
    const { result } = renderEditSave(null);
    await submitEditForm(result);

    expect(result.current.saving.savedNote).toBeUndefined();
  });

  it("loads nothing again and shows no Saved note when the details action throws", async () => {
    detailsAction.mockRejectedValue(new Error("offline"));
    const { result } = renderEditSave(null);
    await submitEditForm(result);

    expect(result.current.saving.savedNote).toBeUndefined();
  });

  it("clears the chosen image after a full success, even when only the image changed", async () => {
    const { result } = renderEditSave(chosenImage());
    await submitEditForm(result);

    expect(result.current.form.getValues("image")).toBeNull();
  });

  it("gives the API's plain refusal on a later save with no new image", async () => {
    detailsAction.mockResolvedValueOnce(saved);
    const { result } = renderEditSave(chosenImage());
    await submitEditForm(result);
    detailsAction.mockResolvedValueOnce(
      refusedAt("name", "The name is taken."),
    );
    await submitEditForm(result);

    expect(result.current.saving.serverMessage.serverProblem?.detail).toBe(
      "The name is taken.",
    );
    expect(uploadAction).toHaveBeenCalledOnce();
  });
});
