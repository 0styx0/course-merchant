import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProblemAlert } from "@/components/problem-alert";
import { EnrollButton } from "@/features/checkout/start-checkout/enroll-button";
import { BuyPanel } from "@/features/courses/buy-panel/buy-panel";
import { CourseDetails } from "@/features/courses/course-details";
import {
  getCourse,
  type GetCourseResult,
} from "@/features/courses/courses.api";
import { formatPrice } from "@/lib/utils/formatters";
import { isFreePrice } from "@/lib/utils/is-free-price";

type CoursePageProps = {
  params: Promise<{ courseId: string }>;
};

function isCourseNotFound(result: GetCourseResult): boolean {
  return (
    result.state === "failure" &&
    (result.error.code === "COURSE_NOT_FOUND" ||
      result.error.code === "INVALID_COURSE_ID")
  );
}

export async function generateMetadata({
  params,
}: CoursePageProps): Promise<Metadata> {
  const { courseId } = await params;
  const result = await getCourse(courseId);

  if (result.state === "success") {
    return { title: result.data.name, description: result.data.summary };
  }
  // A not-found page's own metadata never reaches the tab, so the page names
  // the tab for a missing course.
  return isCourseNotFound(result) ? { title: "Course not found" } : {};
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { courseId } = await params;

  // Fetched before any Suspense boundary: once bytes are streamed, the status
  // can no longer become 404.
  const result = await getCourse(courseId);

  if (isCourseNotFound(result)) {
    notFound();
  }

  if (result.state === "failure") {
    return <ProblemAlert problem={result.error} />;
  }

  const course = result.data;
  const formattedPrice = formatPrice(
    course.price.amount,
    course.price.currency,
  );
  const priceLabel = isFreePrice(course.price.amount)
    ? undefined
    : formattedPrice;

  return (
    <CourseDetails course={course}>
      <BuyPanel
        courseName={course.name}
        schedule={course.schedule}
        price={formattedPrice}
      >
        <EnrollButton courseId={course.id} priceLabel={priceLabel} />
      </BuyPanel>
    </CourseDetails>
  );
}
