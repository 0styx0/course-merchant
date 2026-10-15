import type { ReactNode } from "react";
import type { GetCoursesResult } from "@/lib/api/courses.list";
import { CourseCard } from "../course-card";
import { ApiErrorMessage } from "../api-error-message";

type CoursesViewProps = {
  result: GetCoursesResult;
};

function CoursesSection({ children }: { children: ReactNode }) {
  return (
    <section aria-labelledby="courses-heading">
      <h2 id="courses-heading" className="text-2xl font-semibold">
        Courses
      </h2>

      {children}
    </section>
  );
}

function CoursesEmpty() {
  return (
    <p className="mt-4 text-gray-600">Check back later for new courses.</p>
  );
}

export function CoursesLoading() {
  return (
    <CoursesSection>
      <p className="mt-4 text-gray-600">Loading courses...</p>
    </CoursesSection>
  );
}

export function CoursesView({ result }: CoursesViewProps) {
  if (result.state === "failure") {
    return (
      <CoursesSection>
        <ApiErrorMessage problem={result.error} />
      </CoursesSection>
    );
  }

  if (result.data.courses.length === 0) {
    return (
      <CoursesSection>
        <CoursesEmpty />
      </CoursesSection>
    );
  }

  return (
    <CoursesSection>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {result.data.courses.map((course) => (
          <CourseCard
            key={`${course.name}-${course.schedule.startTime}`}
            course={course}
          />
        ))}
      </div>
    </CoursesSection>
  );
}
