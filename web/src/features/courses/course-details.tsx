import type { ReactNode } from "react";

import type { Course } from "@/lib/types";
import { CourseDescription } from "./description/course-description";
import { CourseImage } from "./course-image";

type CourseDetailsProps = {
  course: Course;
  /** Renders in the side column beside the description. */
  children: ReactNode;
};

export function CourseDetails({ course, children }: CourseDetailsProps) {
  return (
    // Column 8 stays empty as the gap between the text and the side column.
    // `md:top-24` (96px) sits below the 72px `md:h-18` site header; Tailwind
    // needs literal class names, so the two cannot share a constant.
    <article className="mt-6 md:grid md:grid-cols-12 md:gap-x-8">
      <header className="md:col-span-7 md:col-start-1 md:row-start-1">
        <CourseImage courseId={course.id} imageVersion={course.image.version} />
        <h1 className="mt-6 break-words font-heading text-h2 md:text-h1">
          {course.name}
        </h1>
        <p className="mt-4 text-muted-foreground">{course.summary}</p>
      </header>

      <div className="self-start md:sticky md:top-24 md:col-span-4 md:col-start-9 md:row-span-2 md:row-start-1">
        {children}
      </div>

      <div className="mt-10 min-w-0 md:col-span-7 md:col-start-1 md:row-start-2">
        <CourseDescription description={course.description} />
      </div>
    </article>
  );
}
