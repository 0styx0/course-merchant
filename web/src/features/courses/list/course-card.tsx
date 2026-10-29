import Link from "next/link";
import { Course } from "@/lib/types";
import { formatPrice } from "@/lib/utils/formatters";
import { CourseSchedule } from "../course-schedule";

export function CourseCard({ course }: { course: Course }) {
  return (
    <article className="relative rounded-lg border p-6">
      <h3 className="text-xl font-semibold">
        <Link
          href={`/courses/${course.id}`}
          className="after:absolute after:inset-0"
        >
          {course.name}
        </Link>
      </h3>

      <p className="mt-2 text-gray-600">{course.summary}</p>

      <p className="mt-4 font-medium">
        {formatPrice(course.price.amount, course.price.currency)}
      </p>

      <div className="mt-4 text-sm text-gray-600">
        <CourseSchedule schedule={course.schedule} />
      </div>

      <p className="mt-4 text-sm text-gray-500">
        {course.enrollmentCount}{" "}
        {course.enrollmentCount === 1 ? "student" : "students"} enrolled
      </p>
    </article>
  );
}
