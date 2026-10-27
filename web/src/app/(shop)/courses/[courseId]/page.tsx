import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProblemAlert } from "@/components/problem-alert";
import { CourseDetails } from "@/features/courses/course-details";
import { getCourse } from "@/features/courses/courses.api";

type CoursePageProps = {
  params: Promise<{ courseId: string }>;
};

export async function generateMetadata({
  params,
}: CoursePageProps): Promise<Metadata> {
  const { courseId } = await params;
  const result = await getCourse(courseId);

  // The page alone decides on a 404.
  return result.state === "success" ? { title: result.data.name } : {};
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { courseId } = await params;

  // Fetched before any Suspense boundary: once bytes are streamed, the status
  // can no longer become 404.
  const result = await getCourse(courseId);

  if (
    result.state === "failure" &&
    (result.error.code === "COURSE_NOT_FOUND" ||
      result.error.code === "INVALID_COURSE_ID")
  ) {
    notFound();
  }

  if (result.state === "failure") {
    return <ProblemAlert problem={result.error} />;
  }

  return <CourseDetails course={result.data} />;
}
