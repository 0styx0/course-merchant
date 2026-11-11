import { z } from "zod";

import type { CourseImageFile } from "@/features/courses/courses.api";
import { getCourseImage } from "@/features/courses/courses.api";
import type { ProblemDetails, Result } from "@/lib/types";

type CourseImageRouteContext = {
  params: Promise<{ courseId: string; version: string }>;
};

const courseIdSchema = z.uuid();
// A version is the image's update time in milliseconds: digits with no leading zero.
const imageVersionPattern = /^[1-9]\d*$/;

function isImageAddressValid(courseId: string, version: string): boolean {
  return (
    courseIdSchema.safeParse(courseId).success &&
    imageVersionPattern.test(version)
  );
}

function isImageMissingProblem(problem: ProblemDetails): boolean {
  return (
    problem.code === "COURSE_NOT_FOUND" || problem.code === "INVALID_COURSE_ID"
  );
}

function imageResponseFromResult(
  result: Result<CourseImageFile, ProblemDetails>,
): Response {
  if (result.state === "success") {
    const headers = new Headers({ "Content-Type": "image/webp" });
    if (result.data.cacheControl) {
      headers.set("Cache-Control", result.data.cacheControl);
    }
    return new Response(result.data.bytes, { headers });
  }
  if (isImageMissingProblem(result.error)) {
    return new Response(null, { status: 404 });
  }
  throw new Error(
    `Course image failed with the API problem ${result.error.code}`,
  );
}

export async function GET(
  _request: Request,
  { params }: CourseImageRouteContext,
): Promise<Response> {
  const { courseId, version } = await params;
  if (!isImageAddressValid(courseId, version)) {
    return new Response(null, { status: 404 });
  }
  return imageResponseFromResult(await getCourseImage(courseId, version));
}
