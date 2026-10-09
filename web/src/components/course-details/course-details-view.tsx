import { GetCourseResult } from "@/lib/api/course.get";
import { formatDate, formatPrice } from "@/lib/utils/formatters";

type CourseDetailsViewProps = {
  result: GetCourseResult;
};

export function CourseDetailsView({ result }: CourseDetailsViewProps) {
  if (result.state === "failure") {
    return (
      <main>
        <CourseError />
      </main>
    );
  }

  const course = result.data;
  const { schedule } = course;
  const dateFormatter = formatDate(course.schedule.timeZone)

  return (
    <main>
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
    </main>
  );
}

function CourseError() {
  return (
    <p role="alert" className="mt-4 text-gray-600">
      We couldn&apos;t load this course right now. Please try again later.
    </p>
  );
}

