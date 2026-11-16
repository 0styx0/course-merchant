import type { ReactNode } from "react";

import type { Course } from "@/lib/types";
import { CourseDescription } from "./description/course-description";

type CoursePageLayoutProps = {
  /** Renders above the name; the caller chooses where the image comes from. */
  image: ReactNode;
  name: Course["name"];
  summary: Course["summary"];
  description: Course["description"];
  /** Renders in the side column beside the description. */
  children: ReactNode;
};

export function CoursePageLayout({
  image,
  name,
  summary,
  description,
  children,
}: CoursePageLayoutProps) {
  return (
    // Column 8 stays empty as the gap between the text and the side column.
    // `md:top-24` (96px) sits below the 72px `md:h-18` site header; Tailwind
    // needs literal class names, so the two cannot share a constant.
    <article className="mt-6 md:grid md:grid-cols-12 md:gap-x-8">
      <header className="md:col-span-7 md:col-start-1 md:row-start-1">
        {image}
        <h1 className="mt-6 break-words font-heading text-h2 md:text-h1">
          {name}
        </h1>
        <p className="mt-4 text-muted-foreground">{summary}</p>
      </header>

      <div className="self-start md:sticky md:top-24 md:col-span-4 md:col-start-9 md:row-span-2 md:row-start-1">
        {children}
      </div>

      <div className="mt-10 min-w-0 md:col-span-7 md:col-start-1 md:row-start-2">
        <CourseDescription description={description} />
      </div>
    </article>
  );
}
