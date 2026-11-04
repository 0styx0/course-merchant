import Link from "next/link";
import { Course } from "@/lib/types";
import { formatPrice } from "@/lib/utils/formatters";
import { CourseSchedule } from "../course-schedule";
import { shopCoursePath } from "../shop-course-path";

export function CourseCard({ course }: { course: Course }) {
  return (
    <article className="relative rounded-lg border p-6">
      <h3 className="font-heading text-h3">
        <Link
          href={shopCoursePath(course.id)}
          className="after:absolute after:inset-0"
        >
          {course.name}
        </Link>
      </h3>

      <p className="mt-2 text-muted-foreground">{course.summary}</p>

      <p className="mt-4 font-medium">
        {formatPrice(course.price.amount, course.price.currency)}
      </p>

      <div className="mt-4 text-sm text-muted-foreground">
        <CourseSchedule schedule={course.schedule} />
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        {course.enrollmentCount}{" "}
        {course.enrollmentCount === 1 ? "student" : "students"} enrolled
      </p>
    </article>
  );
}
