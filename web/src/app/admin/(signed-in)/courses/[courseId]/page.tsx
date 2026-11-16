import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ProblemAlert } from "@/components/problem-alert";
import { CourseAdminPanel } from "@/features/admin-courses/course-view/course-admin-panel";
import { AdminCourseImage } from "@/features/admin-courses/course-view/admin-course-image";
import { StudentList } from "@/features/admin-courses/course-view/student-list";
import { getAdminCourseOrNotFound } from "@/features/admin-courses/api/get-admin-course-or-not-found";
import { CoursePageLayout } from "@/features/courses/course-page-layout";
import { pageFrameClasses } from "@/features/site-layout/page-frame-classes";
import { readRequestTime } from "@/lib/time/read-request-time";
import type { AdminCourse } from "@/lib/types";

export const metadata: Metadata = {
  title: "Course details",
  robots: { index: false },
};

type AdminCoursePageProps = {
  params: Promise<{ courseId: string }>;
};

// The public course page's frame, so the course reads as buyers see it.
function AdminCoursePageFrame({ children }: { children: ReactNode }) {
  return <main className={`${pageFrameClasses} py-12`}>{children}</main>;
}

type AdminCourseDetailsProps = {
  course: AdminCourse;
  /** When the page rendered, in milliseconds since 1970. */
  renderMs: number;
};

function AdminCourseDetails({ course, renderMs }: AdminCourseDetailsProps) {
  return (
    <>
      <CoursePageLayout
        image={<AdminCourseImage courseId={course.id} image={course.image} />}
        name={course.name}
        summary={course.summary}
        description={course.description}
      >
        <CourseAdminPanel course={course} renderMs={renderMs} />
      </CoursePageLayout>
      <StudentList enrollments={course.enrollments} />
    </>
  );
}

export default async function AdminCoursePage({
  params,
}: AdminCoursePageProps) {
  const { courseId } = await params;
  const result = await getAdminCourseOrNotFound(courseId);
  const renderMs = readRequestTime();

  return (
    <AdminCoursePageFrame>
      {result.state === "failure" ? (
        <ProblemAlert problem={result.error} />
      ) : (
        <AdminCourseDetails course={result.data} renderMs={renderMs} />
      )}
    </AdminCoursePageFrame>
  );
}
