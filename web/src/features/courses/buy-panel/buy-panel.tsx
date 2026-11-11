import type { ReactNode } from "react";

import { SeeCurrentCoursesLink } from "@/components/see-current-courses-link";
import { CourseSchedule } from "../course-schedule";
import type { Course } from "@/lib/types";
import { dateOnlyFormatter } from "@/lib/utils/formatters";
import type { CourseStage } from "./course-stage";

const PANEL_CLASS = "mt-6 rounded-lg bg-surface-alt p-6 md:mt-0";

type LiveCourseStage = Exclude<CourseStage, "ended">;

type BuyPanelProps = {
  courseName: string;
  schedule: Course["schedule"];
  /** The formatted price, such as "$99" or "Free". */
  price: string;
  /** The visitor's locale, such as "en-GB", for the start date. */
  locale: string;
  /** Decides the eyebrow above the schedule and the note above the button. */
  stage: LiveCourseStage;
  /** The buy button, shown under the price. */
  children: ReactNode;
};

/** A flat panel that lists the schedule and price above the buy button. */
export function BuyPanel({
  courseName,
  schedule,
  price,
  locale,
  stage,
  children,
}: BuyPanelProps) {
  return (
    <aside aria-label={`Enroll in ${courseName}`} className={PANEL_CLASS}>
      <StageEyebrow stage={stage} schedule={schedule} locale={locale} />
      <CourseSchedule schedule={schedule} />
      <p className="mt-4 font-semibold">{price}</p>
      {stage === "in-progress" && (
        <p className="mt-4">This course has started. You can still enroll.</p>
      )}
      {children}
    </aside>
  );
}

type StageEyebrowProps = {
  stage: LiveCourseStage;
  schedule: Course["schedule"];
  locale: string;
};

/** "Starts <date>" before the start and "In progress" after it. */
function StageEyebrow({ stage, schedule, locale }: StageEyebrowProps) {
  const label =
    stage === "upcoming"
      ? `Starts ${formatStartDate(schedule, locale)}`
      : "In progress";
  return <p className="mb-2 text-eyebrow uppercase text-olive">{label}</p>;
}

type EndedPanelProps = {
  courseName: string;
  schedule: Course["schedule"];
  /** The visitor's locale, such as "en-GB", for the start date. */
  locale: string;
};

/** A flat panel for a course that has ended: its start date and a way back to current courses, with no price or button. */
export function EndedPanel({ courseName, schedule, locale }: EndedPanelProps) {
  return (
    <aside aria-label={courseName} className={PANEL_CLASS}>
      <span className="inline-block rounded-full bg-muted px-3 py-1 text-eyebrow uppercase text-muted-foreground">
        Ended
      </span>
      <p className="mt-3">{formatStartDate(schedule, locale)}</p>
      <p className="mt-4">This course has ended.</p>
      <SeeCurrentCoursesLink className="mt-4" />
    </aside>
  );
}

function formatStartDate(schedule: Course["schedule"], locale: string): string {
  return dateOnlyFormatter(schedule.timeZone, locale).format(
    new Date(schedule.startTime),
  );
}
