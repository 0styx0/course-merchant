import type { Course } from "@/lib/types";
import { formatPrice } from "@/lib/utils/formatters";
import { CourseDescription } from "./course-description";
import { CourseSchedule } from "./course-schedule";

type CourseDetailsProps = {
  course: Course;
};

export function CourseDetails({ course }: CourseDetailsProps) {
  const { schedule } = course;

  return (
    <article className="mt-6">
      <header>
        <h1 className="text-3xl font-bold">{course.name}</h1>
        <p className="mt-2 text-gray-600">{course.summary}</p>
      </header>

      <CourseDescription description={course.description} />

      <dl className="mt-6 space-y-4">
        <div>
          <dt className="font-semibold">Price</dt>
          <dd>{formatPrice(course.price.amount, course.price.currency)}</dd>
        </div>

        <div>
          <dt className="font-semibold">Schedule</dt>
          <dd>
            <CourseSchedule schedule={schedule} />
          </dd>
        </div>

        <div>
          <dt className="font-semibold">Enrollment</dt>
          <dd>{course.enrollmentCount} enrolled</dd>
        </div>
      </dl>
    </article>
  );
}
