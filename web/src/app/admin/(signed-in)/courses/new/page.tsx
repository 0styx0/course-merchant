import type { Metadata } from "next";

import { CourseForm } from "@/features/admin-courses/course-form";

export const metadata: Metadata = {
  title: "New course",
  robots: { index: false },
};

export default function NewCoursePage() {
  // The list is built here so the server and the browser render the same one.
  const timeZones = Intl.supportedValuesOf("timeZone");

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold">New course</h1>
      <div className="mt-8">
        <CourseForm timeZones={timeZones} />
      </div>
    </main>
  );
}
