import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { ProblemAlert } from "@/components/problem-alert";
import { AdminCourseImage } from "@/features/admin-courses/course-view/admin-course-image";
import { StudentList } from "@/features/admin-courses/course-view/student-list";
import { editCoursePath } from "@/features/admin-courses/addresses/admin-course-path";
import { getAdminCourseOrNotFound } from "@/features/admin-courses/api/get-admin-course-or-not-found";
import { CoursePageLayout } from "@/features/courses/course-page-layout";
import { pageFrameClasses } from "@/features/site-layout/page-frame-classes";
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

function AdminCourseDetails({ course }: { course: AdminCourse }) {
  return (
    <>
      <CoursePageLayout
        image={<AdminCourseImage courseId={course.id} image={course.image} />}
        name={course.name}
        summary={course.summary}
        description={course.description}
      >
        <Link className="underline" href={editCoursePath(course.id)}>
          Edit course
        </Link>
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

  return (
    <AdminCoursePageFrame>
      {result.state === "failure" ? (
        <ProblemAlert problem={result.error} />
      ) : (
        <AdminCourseDetails course={result.data} />
      )}
    </AdminCoursePageFrame>
  );
}
