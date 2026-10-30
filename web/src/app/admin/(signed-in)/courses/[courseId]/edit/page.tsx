import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { ProblemAlert } from "@/components/problem-alert";
import { EditCourseForm } from "@/features/admin-courses/edit-course/edit-course-form";
import { toEditCourseStart } from "@/features/admin-courses/edit-course/edit-course-start";
import { getCourseAsAdmin } from "@/features/admin-courses/save-course/admin-courses.api";

export const metadata: Metadata = {
  title: "Edit course",
  robots: { index: false },
};

type EditCoursePageProps = {
  params: Promise<{ courseId: string }>;
};

function EditCoursePageLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold">Edit course</h1>
      <p className="mt-2 text-muted-foreground">
        Change the course details. Start and end times, prices and status
        can&apos;t be changed here yet.
      </p>
      <div className="mt-8">{children}</div>
    </main>
  );
}

function isCourseMissingCode(code: string): boolean {
  return code === "COURSE_NOT_FOUND" || code === "INVALID_COURSE_ID";
}

export default async function EditCoursePage({ params }: EditCoursePageProps) {
  const { courseId } = await params;
  const result = await getCourseAsAdmin(courseId);

  if (result.state === "failure" && isCourseMissingCode(result.error.code)) {
    notFound();
  }

  if (result.state === "failure") {
    return (
      <EditCoursePageLayout>
        <ProblemAlert problem={result.error} />
      </EditCoursePageLayout>
    );
  }

  return (
    <EditCoursePageLayout>
      <EditCourseForm
        courseId={courseId}
        start={toEditCourseStart(result.data)}
        // The list is built here so the server and the browser render the same one.
        timeZones={Intl.supportedValuesOf("timeZone")}
      />
    </EditCoursePageLayout>
  );
}
