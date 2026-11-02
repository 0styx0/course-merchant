import type { ProblemDetails, Result } from "@/lib/types";
import { getCourseImageAsAdmin } from "@/features/admin-courses/save-course/admin-courses.api";
import { isUuid } from "@/features/admin-courses/save-course/course-action-result";

type CourseImageRouteContext = {
  params: Promise<{ courseId: string }>;
};

function isImageMissingCode(code: string): boolean {
  return code === "COURSE_NOT_FOUND" || code === "COURSE_IMAGE_NOT_FOUND";
}

// The type is set here, not copied, so the API can't serve another type from this origin.
function imageResponseFromResult(
  result: Result<ArrayBuffer, ProblemDetails>,
): Response {
  if (result.state === "success") {
    return new Response(result.data, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-cache",
      },
    });
  }
  const status = isImageMissingCode(result.error.code) ? 404 : 502;
  return new Response(null, { status });
}

export async function GET(
  _request: Request,
  { params }: CourseImageRouteContext,
): Promise<Response> {
  const { courseId } = await params;
  if (!isUuid(courseId)) {
    return new Response(null, { status: 404 });
  }
  return imageResponseFromResult(await getCourseImageAsAdmin(courseId));
}
