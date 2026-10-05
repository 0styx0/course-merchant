import type { Course } from "@/lib/api/courses";
import { CourseCard } from "../course-card";

type CoursesViewProps = {
  courses: Course[];
};

export function CoursesView({ courses }: CoursesViewProps) {
  return (
    <section aria-labelledby="courses-heading">
      <h2 id="courses-heading" className="text-2xl font-semibold">
        Courses
      </h2>

      {courses.length === 0 ? (
        <p className="mt-4 text-gray-600">
          Check back later for new courses.
        </p>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard
              key={`${course.name}-${course.schedule.startTime}`}
              course={course}
            />
          ))}
        </div>
      )}
    </section>
  );
}
