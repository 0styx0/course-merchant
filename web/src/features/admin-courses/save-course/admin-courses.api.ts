import "server-only";

import type {
  AdminCourse,
  CreateCourseRequest,
  ProblemDetails,
  Result,
  UpdateCourseRequest,
} from "@/lib/types";
import { api } from "@/lib/api/client";
import { toResult } from "@/lib/api/to-result";

export type SaveCourseResult = Result<AdminCourse, ProblemDetails>;

export async function createCourse(
  request: CreateCourseRequest,
): Promise<SaveCourseResult> {
  return toResult(await api.POST("/admin/courses", { body: request }));
}

export async function getCourseAsAdmin(
  courseId: string,
): Promise<SaveCourseResult> {
  return toResult(
    await api.GET("/admin/courses/{courseId}", {
      params: { path: { courseId } },
    }),
  );
}

export async function updateCourse(
  courseId: string,
  request: UpdateCourseRequest,
): Promise<SaveCourseResult> {
  return toResult(
    await api.PUT("/admin/courses/{courseId}", {
      params: { path: { courseId } },
      body: request,
    }),
  );
}

// The generated type calls the file a string; the serializer sends the real file.
export async function uploadCourseImage(
  courseId: string,
  image: File,
): Promise<Result<undefined, ProblemDetails>> {
  return toResult(
    await api.PUT("/admin/courses/{courseId}/image", {
      params: { path: { courseId } },
      body: { image: "" },
      bodySerializer: () => {
        const formData = new FormData();
        formData.set("image", image);
        return formData;
      },
    }),
  );
}
