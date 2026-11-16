import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ProblemAlert } from "@/components/problem-alert";
import { isShownInShop } from "@/features/admin-courses/shop-visibility/is-shown-in-shop";
import { EditCourseForm } from "@/features/admin-courses/edit-course/edit-course-form";
import { toEditFormPrefill } from "@/features/admin-courses/edit-course/edit-form-prefill";
import { EditPageHeader } from "@/features/admin-courses/edit-course/header/edit-page-header";
import { getAdminCourseOrNotFound } from "@/features/admin-courses/api/get-admin-course-or-not-found";
import { readRequestTime } from "@/lib/time/read-request-time";

export const metadata: Metadata = {
  title: "Edit course",
  robots: { index: false },
};

type EditCoursePageProps = {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ saved?: string | string[] }>;
};

// A narrow column, so the form reads as one column of fields.
function EditCoursePageLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-heading text-h2 md:text-h1">Edit course</h1>
      <p className="mt-2 text-muted-foreground">Change the course details.</p>
      <div className="mt-8">{children}</div>
    </main>
  );
}

/** Built on the server so the server and the browser render the same list. */
function listTimeZonesOnServer(): string[] {
  return Intl.supportedValuesOf("timeZone");
}

export default async function EditCoursePage({
  params,
  searchParams,
}: EditCoursePageProps) {
  const { courseId } = await params;
  const { saved } = await searchParams;
  const result = await getAdminCourseOrNotFound(courseId);

  if (result.state === "failure") {
    return (
      <EditCoursePageLayout>
        <ProblemAlert problem={result.error} />
      </EditCoursePageLayout>
    );
  }

  const prefill = toEditFormPrefill(result.data, readRequestTime());

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
