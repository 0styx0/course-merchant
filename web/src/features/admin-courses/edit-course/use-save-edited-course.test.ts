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
      prefill.fieldsSentBackUnchanged,
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
  it("saves only the details when no file is chosen, then goes home", async () => {
    const { result } = renderEditSave(null);
    await submitEditForm(result);

    expect(detailsAction).toHaveBeenCalledOnce();
    expect(detailsAction.mock.calls[0]?.[1]).not.toHaveProperty("image");
    expect(uploadAction).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/");
  });

  it("uploads a chosen file after the details, then goes home", async () => {
    const image = chosenImage();
    const { result } = renderEditSave(image);
    await submitEditForm(result);

    expect(detailsAction.mock.calls[0]?.[1]).not.toHaveProperty("image");
    expect(uploadAction).toHaveBeenCalledOnce();
    const [uploadedFor, formData] = uploadAction.mock.calls[0] ?? [];
    expect(uploadedFor).toBe(courseId);
    expect(formData?.get("image")).toBe(image.file);
    expect(detailsAction.mock.invocationCallOrder[0]).toBeLessThan(
      uploadAction.mock.invocationCallOrder[0] ?? 0,
    );
    expect(push).toHaveBeenCalledWith("/");
  });

  it("sends no upload when the details are refused, and shows the API's message", async () => {
    detailsAction.mockResolvedValue(refusedAt("name", "The name is taken."));
    const { result } = renderEditSave(chosenImage());
    await submitEditForm(result);

    expect(uploadAction).not.toHaveBeenCalled();
    expect(result.current.saving.serverProblem?.detail).toBe(
      "The name is taken.",
    );
    expect(result.current.form.getFieldState("name").error?.message).toBe(
      "name refused",
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("says the details were saved when the image is refused, and stays", async () => {
    uploadAction.mockResolvedValue(refusedAt("image", "The file is broken."));
    const { result } = renderEditSave(chosenImage());
    await submitEditForm(result);

    expect(result.current.saving.serverProblem?.detail).toBe(
      "The course details were saved, but the image didn't upload. The file is broken.",
    );
    expect(result.current.form.getFieldState("image").error?.message).toBe(
      "image refused",
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("says something went wrong when the details action throws", async () => {
    detailsAction.mockRejectedValue(new Error("offline"));
    const { result } = renderEditSave(chosenImage());
    await submitEditForm(result);

    expect(result.current.saving.serverProblem).toEqual({
      title: "Couldn't save the course",
      detail:
        "Something went wrong while saving. Check your connection and try again.",
    });
  });

  it("adds that the details were saved when the upload throws", async () => {
    uploadAction.mockRejectedValue(new Error("offline"));
    const { result } = renderEditSave(chosenImage());
    await submitEditForm(result);

    expect(result.current.saving.serverProblem?.detail).toBe(
      "Something went wrong while saving. Check your connection and try again. The course details were saved.",
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

  it("sends both steps again on the next save after the image was refused", async () => {
    uploadAction.mockResolvedValueOnce(
      refusedAt("image", "The file is broken."),
    );
    const { result } = renderEditSave(chosenImage());
    await submitEditForm(result);
    await submitEditForm(result);

    expect(detailsAction).toHaveBeenCalledTimes(2);
    expect(uploadAction).toHaveBeenCalledTimes(2);
    expect(push).toHaveBeenCalledOnce();
  });
});
