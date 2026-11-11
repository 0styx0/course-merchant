import type { ReactNode } from "react";

import { CourseSchedule } from "../course-schedule";
import type { Course } from "@/lib/types";
import { dateOnlyFormatter } from "@/lib/utils/formatters";
import type { CourseStage } from "./course-stage";

type BuyPanelProps = {
  courseName: string;
  schedule: Course["schedule"];
  /** The formatted price, such as "$99" or "Free". */
  price: string;
  /** Decides the eyebrow above the schedule and the note above the button. */
  stage: CourseStage;
  /** The buy button, shown under the price. */
  children: ReactNode;
};

/** A flat panel that lists the schedule and price above the buy button. */
export function BuyPanel({
  courseName,
  schedule,
  price,
  stage,
  children,
}: BuyPanelProps) {
  return (
    <aside
      aria-label={`Enroll in ${courseName}`}
      className="mt-6 rounded-lg bg-surface-alt p-6 md:mt-0"
    >
      <StageEyebrow stage={stage} schedule={schedule} />
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
  stage: CourseStage;
  schedule: Course["schedule"];
};

/** "Starts <date>" before the start and "In progress" after it; an ended course gets none. */
function StageEyebrow({ stage, schedule }: StageEyebrowProps) {
  if (stage === "ended") return null;
  const label =
    stage === "upcoming"
      ? `Starts ${dateOnlyFormatter(schedule.timeZone).format(new Date(schedule.startTime))}`
      : "In progress";
  return <p className="mb-2 text-eyebrow uppercase text-olive">{label}</p>;
}
