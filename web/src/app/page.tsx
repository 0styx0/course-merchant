import Courses from "@/components/courses/courses";
import { CoursesLoading } from "@/components/courses/courses-view";
import { Suspense } from "react";

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
