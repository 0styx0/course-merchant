import type { Metadata } from "next";

import { CreateCourseForm } from "@/features/admin-courses/create-course/create-course-form";

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
      <p className="mt-2 text-muted-foreground">
        Add the course details and its price. Saving creates a draft, and
        nothing is public until you publish it.
      </p>
      <div className="mt-8">
        <CreateCourseForm timeZones={timeZones} />
      </div>
    </main>
  );
}
