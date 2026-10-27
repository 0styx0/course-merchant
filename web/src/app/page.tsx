import Courses from "@/components/courses/courses";
import { CoursesLoading } from "@/components/courses/courses-view";
import { Suspense } from "react";

// Whether a course shows, and at what price, depends on the clock, so render
// the page again at most once a minute. magic number
export const revalidate = 60;

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header>
        <h1 className="text-4xl font-bold">Courses</h1>
        <p className="mt-2 text-gray-600">
          Browse currently available courses.
        </p>
      </header>

      <div className="mt-12">
        <Suspense fallback={<CoursesLoading />}>
          <Courses />
        </Suspense>
      </div>
    </main>
  );
}
