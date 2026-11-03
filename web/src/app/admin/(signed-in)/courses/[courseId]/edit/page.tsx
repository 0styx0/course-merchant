import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { ProblemAlert } from "@/components/problem-alert";
import { EditCourseForm } from "@/features/admin-courses/edit-course/edit-course-form";
import { toEditFormPrefill } from "@/features/admin-courses/edit-course/edit-form-prefill";
import {
  EditPageHeader,
  isShownInShop,
} from "@/features/admin-courses/edit-course/header/edit-page-header";
import { getCourseAsAdmin } from "@/features/admin-courses/save-course/admin-courses.api";

export const metadata: Metadata = {
  title: "Edit course",
  robots: { index: false },
};

type EditCoursePageProps = {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ saved?: string | string[] }>;
};

function EditCoursePageLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold">Edit course</h1>
      <p className="mt-2 text-muted-foreground">Change the course details.</p>
      <div className="mt-8">{children}</div>
    </main>
  );
}

/** Built on the server so the server and the browser render the same list. */
function listTimeZonesOnServer(): string[] {
  return Intl.supportedValuesOf("timeZone");
}

function isCourseMissingCode(code: string): boolean {
  return code === "COURSE_NOT_FOUND" || code === "INVALID_COURSE_ID";
}

export default async function EditCoursePage({
  params,
  searchParams,
}: EditCoursePageProps) {
  const { courseId } = await params;
  const { saved } = await searchParams;
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

  const prefill = toEditFormPrefill(result.data);

  return (
    <EditCoursePageLayout>
      <EditPageHeader
        courseId={courseId}
        name={result.data.name}
        statusName={result.data.status.name}
        isInShop={isShownInShop(
          result.data.status.name,
          prefill.loadedPrices.inEffect.length,
        )}
      />
      <EditCourseForm
        courseId={courseId}
        prefill={prefill}
        timeZones={listTimeZonesOnServer()}
        // Create opens this page with `?saved=draft` after saving the draft.
        startingSavedNote={saved === "draft" ? "Saved as a draft" : undefined}
      />
    </EditCoursePageLayout>
  );
}
