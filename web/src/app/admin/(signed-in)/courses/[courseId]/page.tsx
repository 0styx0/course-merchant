import type { Metadata } from "next";

import { ProblemAlert } from "@/components/problem-alert";
import { CourseAdminPanel } from "@/features/admin-courses/course-view/course-admin-panel";
import { AdminCourseImage } from "@/features/admin-courses/course-view/admin-course-image";
import { StudentList } from "@/features/admin-courses/course-view/students/student-list";
import { getAdminCourseOrNotFound } from "@/features/admin-courses/api/get-admin-course-or-not-found";
import { CoursePageLayout } from "@/features/courses/course-page-layout";
import { AdminPageFrame } from "@/features/site-layout/page-frame/admin-page-frame";
import { readRequestTime } from "@/lib/time/read-request-time";
import type { AdminCourse } from "@/lib/types";

export const metadata: Metadata = {
  title: "Course details",
  robots: { index: false },
};

type AdminCoursePageProps = {
  params: Promise<{ courseId: string }>;
};

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
      <StudentList
        courseId={course.id}
        enrollments={course.enrollments}
        timeZone={course.schedule.timeZone}
      />
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
    <AdminPageFrame>
      {result.state === "failure" ? (
        <ProblemAlert problem={result.error} />
      ) : (
        <AdminCourseDetails course={result.data} renderMs={renderMs} />
      )}
    </AdminPageFrame>
  );
}
