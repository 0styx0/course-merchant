import type { Course } from "@/lib/types";
import { formatDate, formatPrice } from "@/lib/utils/formatters";

type CourseDetailsProps = {
  course: Course;
};

export function CourseDetails({ course }: CourseDetailsProps) {
  const { schedule } = course;
  const dateFormatter = formatDate(schedule.timeZone);

  return (
    <article className="mt-6">
      <header>
        <h1 className="text-3xl font-bold">{course.name}</h1>
        <p className="mt-2 text-gray-600">{course.description}</p>
      </header>

      <dl className="mt-6 space-y-4">
        <div>
          <dt className="font-semibold">Price</dt>
          <dd>{formatPrice(course.price.amount, course.price.currency)}</dd>
        </div>

        <div>
          <dt className="font-semibold">Schedule</dt>
          <dd>
            <time dateTime={schedule.startTime}>
              {dateFormatter.format(new Date(schedule.startTime))}
            </time>
            {" – "}
            <time dateTime={schedule.endTime}>
              {dateFormatter.format(new Date(schedule.endTime))}
            </time>
            <p className="text-sm text-gray-600">{schedule.timeZone}</p>
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
