import type { ReactNode } from "react";

import {
  formatStartDate,
  makeCourseTimeLines,
} from "../course-time/course-time-lines";
import { StartWords } from "../course-time/start-words";
import { VisitorTimeLine } from "../course-time/visitor-time-line";
import type { Course } from "@/lib/types";
import type { CourseStage } from "./course-stage";

/** The shared look of the buy panel and the ended panel. */
export const PANEL_CLASS = "mt-6 rounded-lg bg-surface-alt p-6 md:mt-0";

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
      <CourseTime schedule={schedule} locale={locale} />
      <p className="mt-4 font-semibold">{price}</p>
      {stage === "in-progress" && (
        <p className="mt-4">This course has started. You can still enroll.</p>
      )}
      {children}
    </aside>
  );
}

type CourseTimeProps = {
  schedule: Course["schedule"];
  locale: string;
};

/** When the course runs in its own zone, then how long it lasts; a course of 28 days or more shows only its date range. */
function CourseTime({ schedule, locale }: CourseTimeProps) {
  const {
    timeOrDateRangeLine,
    firstStartToLastEndLine,
    lengthLine,
    shouldShowVisitorTimeLine,
  } = makeCourseTimeLines(schedule, locale);
  return (
    <div>
      <p className="font-medium">
        <time dateTime={schedule.startTime}>{timeOrDateRangeLine}</time>
      </p>
      {firstStartToLastEndLine && (
        <p className="mt-1 text-sm text-muted-foreground">
          {firstStartToLastEndLine}
        </p>
      )}
      {shouldShowVisitorTimeLine && (
        <VisitorTimeLine schedule={schedule} locale={locale} />
      )}
      {lengthLine && (
        <p className="mt-1 text-sm text-muted-foreground">{lengthLine}</p>
      )}
    </div>
  );
}

type StageEyebrowProps = {
  stage: LiveCourseStage;
  schedule: Course["schedule"];
  locale: string;
};

/** "Starts <date>" (or "Starts in 4 days" once the page loads) before the start and "In progress" after it. */
function StageEyebrow({ stage, schedule, locale }: StageEyebrowProps) {
  return (
    <p className="mb-2 text-eyebrow uppercase text-olive">
      {stage === "upcoming" ? (
        <StartWords
          schedule={schedule}
          serverWords={`Starts ${formatStartDate(schedule, locale)}`}
        />
      ) : (
        "In progress"
      )}
    </p>
  );
}
