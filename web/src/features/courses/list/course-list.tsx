import type { ReactNode } from "react";
import type { Course } from "@/lib/types";
import { CourseCard } from "./course-card";

type CourseListProps = {
  courses: Course[];
};

function CourseListFrame({ children }: { children: ReactNode }) {
  return (
    <section aria-labelledby="courses-heading">
      <h2 id="courses-heading" className="font-heading text-h3 md:text-h2">
        Courses
      </h2>

      {children}
    </section>
  );
}

function CoursesEmpty() {
  return (
    <p className="mt-4 text-muted-foreground">
      Check back later for new courses.
    </p>
  );
}

export function CourseListLoading() {
  return (
    <CourseListFrame>
      <p className="mt-4 text-muted-foreground">Loading courses...</p>
    </CourseListFrame>
  );
}

export function CourseList({ courses }: CourseListProps) {
  if (courses.length === 0) {
    return (
      <CourseListFrame>
        <CoursesEmpty />
      </CourseListFrame>
    );
  }

  return (
    <CourseListFrame>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    </CourseListFrame>
  );
}
