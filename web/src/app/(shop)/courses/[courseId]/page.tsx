import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ProblemAlert } from "@/components/problem-alert";
import { EnrollButton } from "@/features/checkout/start-checkout/enroll-button";
import { BuyPanel, EndedPanel } from "@/features/courses/buy-panel/buy-panel";
import {
  getCourseStage,
  type CourseStage,
} from "@/features/courses/buy-panel/course-stage";
import { CourseDetails } from "@/features/courses/course-details";
import {
  getCourse,
  type GetCourseResult,
} from "@/features/courses/courses.api";
import type { Course } from "@/lib/types";
import { formatPrice } from "@/lib/utils/formatters";
import { readRequestLocale } from "@/lib/locale/request-locale";
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

  // The stage depends on the current time and the date's locale on the
  // request's headers, so the page renders per request.
  await connection();
  const locale = readRequestLocale((await headers()).get("accept-language"));
  const course = result.data;

  return (
    <CourseDetails course={course}>
      <CourseBuyPanel
        course={course}
        stage={getCourseStage(course.schedule, new Date())}
        locale={locale}
      />
    </CourseDetails>
  );
}

type CourseBuyPanelProps = {
  course: Course;
  stage: CourseStage;
  locale: string;
};

function CourseBuyPanel({ course, stage, locale }: CourseBuyPanelProps) {
  if (stage === "ended") {
    return (
      <EndedPanel
        courseName={course.name}
        schedule={course.schedule}
        locale={locale}
      />
    );
  }

  const formattedPrice = formatPrice(
    course.price.amount,
    course.price.currency,
  );
  const priceLabel = isFreePrice(course.price.amount)
    ? undefined
    : formattedPrice;

  return (
    <BuyPanel
      courseName={course.name}
      schedule={course.schedule}
      price={formattedPrice}
      locale={locale}
      stage={stage}
    >
      <EnrollButton courseId={course.id} priceLabel={priceLabel} />
    </BuyPanel>
  );
}
