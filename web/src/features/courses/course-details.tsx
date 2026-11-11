import type { ReactNode } from "react";

import type { Course } from "@/lib/types";
import { formatPrice } from "@/lib/utils/formatters";
import { CourseDescription } from "./description/course-description";
import { CourseImage } from "./course-image";
import { CourseSchedule } from "./course-schedule";

type CourseDetailsProps = {
  course: Course;
  /** Renders inside the details column, after the details list. */
  children: ReactNode;
};

export function CourseDetails({ course, children }: CourseDetailsProps) {
  const { schedule } = course;

  return (
    // Column 8 stays empty as the gap between the text and the side column.
    // `md:top-24` (96px) sits below the 72px `md:h-18` site header; Tailwind
    // needs literal class names, so the two cannot share a constant.
    <article className="mt-6 md:grid md:grid-cols-12 md:gap-x-8">
      <header className="md:col-span-7 md:col-start-1 md:row-start-1">
        <CourseImage courseId={course.id} imageVersion={course.image.version} />
        <h1 className="break-words font-heading text-h2 md:text-h1">
          {course.name}
        </h1>
        <p className="mt-2 text-muted-foreground">{course.summary}</p>
      </header>

      <div className="self-start md:sticky md:top-24 md:col-span-4 md:col-start-9 md:row-span-2 md:row-start-1">
        <dl className="mt-6 space-y-4 md:mt-0">
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

        {children}
      </div>

      <div className="min-w-0 md:col-span-7 md:col-start-1 md:row-start-2">
        <CourseDescription description={course.description} />
      </div>
    </article>
  );
}
