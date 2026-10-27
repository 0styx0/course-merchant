import type { ReactNode } from "react";
import type { Course } from "@/lib/types";
import { CourseCard } from "../course-card";

type CoursesViewProps = {
  courses: Course[];
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

export function CoursesView({ courses }: CoursesViewProps) {
  if (courses.length === 0) {
    return (
      <CoursesSection>
        <CoursesEmpty />
      </CoursesSection>
    );
  }

  return (
    <CoursesSection>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <CourseCard
            key={`${course.name}-${course.schedule.startTime}`}
            course={course}
          />
        ))}
      </div>
    </CoursesSection>
  );
}
