import { Course } from "@/lib/types";
import { formatPrice } from "@/lib/utils/formatters";

export function CourseCard({ course }: { course: Course }) {
  return (
    <article className="rounded-lg border p-6">
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
  );
}