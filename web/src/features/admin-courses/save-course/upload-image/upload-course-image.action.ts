"use server";

import { uploadCourseImage } from "../admin-courses.api";
import {
  invalidCourseIdFailure,
  invalidImageFailure,
  isUuid,
  problemFailure,
  successWithCourseId,
  type CourseActionResult,
} from "../course-action-result";

function imageFileFrom(formData: FormData): File | undefined {
  const image = formData.get("image");
  return image instanceof File && image.size > 0 ? image : undefined;
}

/** Stores the chosen file as the course's image. */
export async function uploadCourseImageAction(
  courseId: string,
  formData: FormData,
): Promise<CourseActionResult> {
  // Anyone can call a Server Action with anything, so check again here.
  if (!isUuid(courseId)) return invalidCourseIdFailure();
  const image = imageFileFrom(formData);
  if (!image) return invalidImageFailure();

  const result = await uploadCourseImage(courseId, image);
  if (result.state === "failure") return problemFailure(result.error);
  return successWithCourseId(courseId);
}
