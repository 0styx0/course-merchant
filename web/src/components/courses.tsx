import { getCourses } from "@/lib/api/courses";
import { formatPrice } from "@/lib/utils/formatters";


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
          <article
            key={`${course.name}-${course.schedule.startTime}`}
            className="rounded-lg border p-6"
          >
            <h3 className="text-xl font-semibold">{course.name}</h3>

            <p className="mt-2 text-gray-600">{course.description}</p>

            <p className="mt-4 font-medium">
              {formatPrice(course.price.amount, course.price.currency)}
            </p>

            <div className="mt-4 text-sm text-gray-600">
              <p>
                <time dateTime={course.schedule.startTime}>
                  {course.schedule.startTime}
                </time>
                {" – "}
                <time dateTime={course.schedule.endTime}>
                  {course.schedule.endTime}
                </time>
              </p>

              <p className="mt-1">{course.schedule.timeZone}</p>
            </div>

            <p className="mt-4 text-sm text-gray-500">
              {course.enrollmentCount}{" "}
              {course.enrollmentCount === 1 ? "student" : "students"} enrolled
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}