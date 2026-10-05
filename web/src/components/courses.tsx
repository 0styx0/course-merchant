import { getCourses } from "@/lib/api/courses";
import { CourseCard } from "./course-card";

export default async function Courses() {
  const { courses } = await getCourses();

  if (courses.length === 0) {
    return (
      <section aria-labelledby="courses-heading">
        <h2 id="courses-heading" className="text-2xl font-semibold">
          Courses
        </h2>

        <p className="mt-4 text-gray-600">
          No courses are currently available.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="courses-heading">
      <h2 id="courses-heading" className="text-2xl font-semibold">
        Courses
      </h2>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <CourseCard
            key={`${course.name}-${course.schedule.startTime}`}
            course={course}
          />
        ))}
      </div>
    </section>
  );
}