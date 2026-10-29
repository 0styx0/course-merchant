import { CourseListSection } from "@/features/courses/list/course-list-section";
import { CourseListLoading } from "@/features/courses/list/course-list";
import { Suspense } from "react";

// Whether a course shows, and at what price, depends on the clock, so render
// the page again at most once a minute. magic number
export const revalidate = 60;

export default function Home() {
  return (
    <>
      <header>
        <h1 className="text-4xl font-bold">Courses</h1>
        <p className="mt-2 text-gray-600">
          Browse currently available courses.
        </p>
      </header>

      <div className="mt-12">
        <Suspense fallback={<CourseListLoading />}>
          <CourseListSection />
        </Suspense>
      </div>
    </>
  );
}
