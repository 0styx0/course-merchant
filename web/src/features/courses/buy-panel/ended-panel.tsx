import { SeeCurrentCoursesLink } from "@/components/see-current-courses-link";
import { StatusPill } from "@/components/status-pill";
import { makeCourseTimeLines } from "../course-time/course-time-lines";
import type { Course } from "@/lib/types";
import { PANEL_CLASS } from "./buy-panel";

type EndedPanelProps = {
  courseName: string;
  schedule: Course["schedule"];
  /** The visitor's locale, such as "en-GB", for the start date. */
  locale: string;
};

/** A flat panel for a course that has ended: its start date (its date range when long) and a way back to current courses, with no price or button. */
export function EndedPanel({ courseName, schedule, locale }: EndedPanelProps) {
  const { endedDateLine, lengthLine } = makeCourseTimeLines(schedule, locale);
  return (
    <aside aria-label={courseName} className={PANEL_CLASS}>
      <StatusPill colourPair="muted">Ended</StatusPill>
      <p className="mt-3">{endedDateLine}</p>
      {lengthLine && (
        <p className="mt-1 text-sm text-muted-foreground">{lengthLine}</p>
      )}
      <p className="mt-4">This course has ended.</p>
      <SeeCurrentCoursesLink className="mt-4" />
    </aside>
  );
}
